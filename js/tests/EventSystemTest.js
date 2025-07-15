// tests/EventSystemTest.js - Test suite for the formal event system
import { EventManager } from '../core/EventManager.js';
import { GameEventTypes, EventDataFactory, EventPriorities } from '../interfaces/GameEvents.js';

export class EventSystemTest {
    constructor() {
        this.tests = [];
        this.results = [];
        this.eventManager = new EventManager();
    }

    async runTests() {
        console.log('🧪 Running Event System Tests...');
        
        this.tests = [
            this.testBasicEventPublishing,
            this.testEventSubscription,
            this.testEventPriorities,
            this.testOnceListeners,
            this.testEventDataFactory,
            this.testEventValidation,
            this.testMiddleware,
            this.testErrorHandling,
            this.testEventUnsubscription,
            this.testAsyncEvents
        ];

        for (const test of this.tests) {
            try {
                const result = await test.call(this);
                this.results.push(result);
                console.log(`${result.passed ? '✅' : '❌'} ${result.name}: ${result.message}`);
            } catch (error) {
                this.results.push({
                    name: test.name,
                    passed: false,
                    message: error.message,
                    error: error
                });
                console.error(`❌ ${test.name}: ${error.message}`);
            }
        }

        return this.generateReport();
    }

    // Test 1: Basic Event Publishing
    testBasicEventPublishing() {
        let eventReceived = false;
        let receivedData = null;

        this.eventManager.subscribe(GameEventTypes.PLAYER_MOVE, (event) => {
            eventReceived = true;
            receivedData = event.data;
        });

        const testData = { x: 10, y: 20, z: 30 };
        this.eventManager.publish(GameEventTypes.PLAYER_MOVE, testData, 'test');

        return {
            name: 'Basic Event Publishing',
            passed: eventReceived && receivedData === testData,
            message: eventReceived ? 'Event successfully published and received' : 'Event not received'
        };
    }

    // Test 2: Event Subscription
    testEventSubscription() {
        let callCount = 0;
        
        const unsubscribe = this.eventManager.subscribe(GameEventTypes.GAME_STATE_CHANGE, () => {
            callCount++;
        });

        // Publish multiple events
        this.eventManager.publish(GameEventTypes.GAME_STATE_CHANGE, {}, 'test1');
        this.eventManager.publish(GameEventTypes.GAME_STATE_CHANGE, {}, 'test2');
        this.eventManager.publish(GameEventTypes.GAME_STATE_CHANGE, {}, 'test3');

        // Unsubscribe
        unsubscribe();
        
        // This should not increment callCount
        this.eventManager.publish(GameEventTypes.GAME_STATE_CHANGE, {}, 'test4');

        return {
            name: 'Event Subscription',
            passed: callCount === 3,
            message: callCount === 3 ? 'Subscription and unsubscription working correctly' : `Expected 3 calls, got ${callCount}`
        };
    }

    // Test 3: Event Priorities
    testEventPriorities() {
        let callOrder = [];

        // Subscribe with different priorities
        this.eventManager.subscribe(GameEventTypes.SYSTEM_INITIALIZE, () => {
            callOrder.push('normal');
        }, EventPriorities.NORMAL);

        this.eventManager.subscribe(GameEventTypes.SYSTEM_INITIALIZE, () => {
            callOrder.push('high');
        }, EventPriorities.HIGH);

        this.eventManager.subscribe(GameEventTypes.SYSTEM_INITIALIZE, () => {
            callOrder.push('critical');
        }, EventPriorities.CRITICAL);

        this.eventManager.publish(GameEventTypes.SYSTEM_INITIALIZE, {}, 'test');

        const expectedOrder = ['critical', 'high', 'normal'];
        const orderCorrect = JSON.stringify(callOrder) === JSON.stringify(expectedOrder);

        return {
            name: 'Event Priorities',
            passed: orderCorrect,
            message: orderCorrect ? 'Event priorities working correctly' : `Expected ${expectedOrder}, got ${callOrder}`
        };
    }

    // Test 4: Once Listeners
    testOnceListeners() {
        let callCount = 0;

        this.eventManager.subscribeOnce(GameEventTypes.GAME_OVER, () => {
            callCount++;
        });

        // Publish multiple times
        this.eventManager.publish(GameEventTypes.GAME_OVER, {}, 'test1');
        this.eventManager.publish(GameEventTypes.GAME_OVER, {}, 'test2');
        this.eventManager.publish(GameEventTypes.GAME_OVER, {}, 'test3');

        return {
            name: 'Once Listeners',
            passed: callCount === 1,
            message: callCount === 1 ? 'Once listener called exactly once' : `Expected 1 call, got ${callCount}`
        };
    }

    // Test 5: Event Data Factory
    testEventDataFactory() {
        try {
            const playerMoveData = EventDataFactory.playerMove(
                { x: 0, y: 0, z: 0 },
                { x: 1, y: 1, z: 1 },
                { x: 0.1, y: 0.1, z: 0.1 }
            );

            const gameStateData = EventDataFactory.gameStateChange(
                'outrage',
                50,
                60,
                { reason: 'test' }
            );

            const validPlayerMove = playerMoveData.oldPosition && playerMoveData.newPosition && playerMoveData.velocity;
            const validGameState = gameStateData.property === 'outrage' && gameStateData.oldValue === 50;

            return {
                name: 'Event Data Factory',
                passed: validPlayerMove && validGameState,
                message: 'Event data factory creating valid data objects'
            };
        } catch (error) {
            return {
                name: 'Event Data Factory',
                passed: false,
                message: `Error creating event data: ${error.message}`
            };
        }
    }

    // Test 6: Event Validation
    testEventValidation() {
        // Test with valid event type
        const validResult = this.eventManager.publish(GameEventTypes.PLAYER_MOVE, {}, 'test');
        
        // Test with invalid event type (should still work but with warning)
        const invalidResult = this.eventManager.publish('invalid.event.type', {}, 'test');

        return {
            name: 'Event Validation',
            passed: validResult === true && invalidResult === true,
            message: 'Event validation working correctly'
        };
    }

    // Test 7: Middleware
    testMiddleware() {
        let middlewareCalled = false;
        let eventProcessed = false;

        // Add middleware
        this.eventManager.addMiddleware((event) => {
            middlewareCalled = true;
            return true; // Allow event to continue
        });

        this.eventManager.subscribe(GameEventTypes.PLAYER_INTERACTION, () => {
            eventProcessed = true;
        });

        this.eventManager.publish(GameEventTypes.PLAYER_INTERACTION, {}, 'test');

        return {
            name: 'Middleware',
            passed: middlewareCalled && eventProcessed,
            message: middlewareCalled && eventProcessed ? 'Middleware processing events correctly' : 'Middleware not working'
        };
    }

    // Test 8: Error Handling
    testErrorHandling() {
        let errorHandled = false;
        let otherListenerCalled = false;

        // Add a listener that throws an error
        this.eventManager.subscribe(GameEventTypes.NPC_SPAWN, () => {
            throw new Error('Test error');
        });

        // Add another listener that should still be called
        this.eventManager.subscribe(GameEventTypes.NPC_SPAWN, () => {
            otherListenerCalled = true;
        });

        // Capture console errors
        const originalError = console.error;
        console.error = (message) => {
            if (message.includes('Error in event listener')) {
                errorHandled = true;
            }
        };

        this.eventManager.publish(GameEventTypes.NPC_SPAWN, {}, 'test');

        // Restore console.error
        console.error = originalError;

        return {
            name: 'Error Handling',
            passed: errorHandled && otherListenerCalled,
            message: errorHandled && otherListenerCalled ? 'Errors handled without breaking other listeners' : 'Error handling not working'
        };
    }

    // Test 9: Event Unsubscription
    testEventUnsubscription() {
        let callCount = 0;

        const unsubscribe = this.eventManager.subscribe(GameEventTypes.POLICE_ACTIVATE, () => {
            callCount++;
        });

        // Publish event
        this.eventManager.publish(GameEventTypes.POLICE_ACTIVATE, {}, 'test1');

        // Unsubscribe
        unsubscribe();

        // Publish again
        this.eventManager.publish(GameEventTypes.POLICE_ACTIVATE, {}, 'test2');

        return {
            name: 'Event Unsubscription',
            passed: callCount === 1,
            message: callCount === 1 ? 'Unsubscription working correctly' : `Expected 1 call, got ${callCount}`
        };
    }

    // Test 10: Async Events
    async testAsyncEvents() {
        let asyncEventReceived = false;
        let asyncData = null;

        this.eventManager.subscribe(GameEventTypes.SYSTEM_SHUTDOWN, async (event) => {
            // Simulate async processing
            await new Promise(resolve => setTimeout(resolve, 10));
            asyncEventReceived = true;
            asyncData = event.data;
        });

        const testData = { reason: 'test_shutdown' };
        await this.eventManager.publishAsync(GameEventTypes.SYSTEM_SHUTDOWN, testData, 'test');

        return {
            name: 'Async Events',
            passed: asyncEventReceived && asyncData === testData,
            message: asyncEventReceived ? 'Async events working correctly' : 'Async event not received'
        };
    }

    // Generate test report
    generateReport() {
        const passed = this.results.filter(r => r.passed).length;
        const total = this.results.length;
        const successRate = (passed / total * 100).toFixed(1);

        const report = {
            total: total,
            passed: passed,
            failed: total - passed,
            successRate: successRate,
            results: this.results
        };

        console.log(`\n📊 Event System Test Report:`);
        console.log(`Total Tests: ${total}`);
        console.log(`Passed: ${passed}`);
        console.log(`Failed: ${total - passed}`);
        console.log(`Success Rate: ${successRate}%`);

        if (passed === total) {
            console.log('🎉 All event system tests passed!');
        } else {
            console.log('⚠️ Some event system tests failed. Check the results for details.');
        }

        return report;
    }

    // Cleanup after tests
    cleanup() {
        this.eventManager.clearAllListeners();
        console.log('🧹 Event system test cleanup completed');
    }
}

// Export test runner function
export async function runEventSystemTests() {
    const tester = new EventSystemTest();
    try {
        const report = await tester.runTests();
        return report;
    } finally {
        tester.cleanup();
    }
}

// Make available globally for console testing
if (typeof window !== 'undefined') {
    window.runEventSystemTests = runEventSystemTests;
    window.EventSystemTest = EventSystemTest;
} 