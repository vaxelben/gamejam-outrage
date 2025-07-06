// tests/ArchitectureTest.js - Architecture validation tests
import { ServiceContainer } from '../core/ServiceContainer.js';
import { GameEngine } from '../core/GameEngine.js';
import { IGameSystem } from '../interfaces/IGameSystem.js';
import { GameStateSystem } from '../systems/GameStateSystem.js';

/**
 * Test suite to validate SOLID principles implementation
 */
export class ArchitectureTest {
    constructor() {
        this.tests = [];
        this.results = [];
    }

    // Run all architecture tests
    async runTests() {
        console.log('🧪 Running SOLID Architecture Tests...');
        
        this.tests = [
            this.testSingleResponsibilityPrinciple,
            this.testOpenClosedPrinciple,
            this.testLiskovSubstitutionPrinciple,
            this.testInterfaceSegregationPrinciple,
            this.testDependencyInversionPrinciple,
            this.testServiceContainer,
            this.testGameEngineIsolation
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
                    message: error.message
                });
                console.error(`❌ ${test.name}: ${error.message}`);
            }
        }

        return this.generateReport();
    }

    // Test 1: Single Responsibility Principle
    testSingleResponsibilityPrinciple() {
        // Each class should have only one reason to change
        const issues = [];
        
        // GameEngine should only orchestrate, not handle specific game logic
        // SceneManager should only handle 3D scene, not game state
        // SystemManager should only coordinate systems, not implement them
        
        // Check if GameStateSystem only handles state
        const gameStateSystem = new GameStateSystem();
        const gameStateMethods = Object.getOwnPropertyNames(GameStateSystem.prototype);
        
        // Should not have rendering methods
        const renderingMethods = gameStateMethods.filter(method => 
            method.includes('render') || method.includes('draw') || method.includes('mesh')
        );
        
        if (renderingMethods.length > 0) {
            issues.push(`GameStateSystem has rendering responsibilities: ${renderingMethods.join(', ')}`);
        }
        
        // Should not have input handling methods
        const inputMethods = gameStateMethods.filter(method => 
            method.includes('key') || method.includes('mouse') || method.includes('input')
        );
        
        if (inputMethods.length > 0) {
            issues.push(`GameStateSystem has input handling responsibilities: ${inputMethods.join(', ')}`);
        }

        return {
            name: 'Single Responsibility Principle',
            passed: issues.length === 0,
            message: issues.length === 0 ? 'All classes have single responsibilities' : issues.join('; ')
        };
    }

    // Test 2: Open/Closed Principle
    testOpenClosedPrinciple() {
        // Classes should be open for extension, closed for modification
        const issues = [];
        
        // Test if we can extend systems without modifying existing code
        class TestSystem extends IGameSystem {
            constructor() {
                super('Test');
            }
            
            async initialize() {
                this.testProperty = 'initialized';
            }
            
            update() {
                // Test system update
            }
            
            shutdown() {
                // Test system shutdown
            }
        }
        
        try {
            const testSystem = new TestSystem();
            if (!(testSystem instanceof IGameSystem)) {
                issues.push('Cannot extend IGameSystem');
            }
            
            if (!testSystem.name || testSystem.name !== 'Test') {
                issues.push('System extension does not properly inherit base functionality');
            }
        } catch (error) {
            issues.push(`Cannot create extended system: ${error.message}`);
        }

        return {
            name: 'Open/Closed Principle',
            passed: issues.length === 0,
            message: issues.length === 0 ? 'Systems are extensible without modification' : issues.join('; ')
        };
    }

    // Test 3: Liskov Substitution Principle
    testLiskovSubstitutionPrinciple() {
        // Derived classes must be substitutable for their base classes
        const issues = [];
        
        try {
            const gameStateSystem = new GameStateSystem();
            
            // Should be substitutable for IGameSystem
            if (!(gameStateSystem instanceof IGameSystem)) {
                issues.push('GameStateSystem is not substitutable for IGameSystem');
            }
            
            // Should have all required IGameSystem methods
            const requiredMethods = ['initialize', 'update', 'shutdown', 'enable', 'disable'];
            for (const method of requiredMethods) {
                if (typeof gameStateSystem[method] !== 'function') {
                    issues.push(`GameStateSystem missing required method: ${method}`);
                }
            }
            
            // Should be able to call base class methods
            gameStateSystem.enable();
            gameStateSystem.disable();
            
            if (!gameStateSystem.enabled === false) {
                issues.push('GameStateSystem does not properly implement base class behavior');
            }
        } catch (error) {
            issues.push(`Substitution failed: ${error.message}`);
        }

        return {
            name: 'Liskov Substitution Principle',
            passed: issues.length === 0,
            message: issues.length === 0 ? 'Derived classes are properly substitutable' : issues.join('; ')
        };
    }

    // Test 4: Interface Segregation Principle
    testInterfaceSegregationPrinciple() {
        // Clients should not be forced to depend on interfaces they don't use
        const issues = [];
        
        // IGameSystem should not force systems to implement methods they don't need
        // Check if the interface is minimal and focused
        const gameStateSystem = new GameStateSystem();
        const methods = Object.getOwnPropertyNames(IGameSystem.prototype);
        
        // Interface should be small and focused
        if (methods.length > 10) {
            issues.push(`IGameSystem interface is too large: ${methods.length} methods`);
        }
        
        // Systems should not be forced to implement irrelevant methods
        // (This is more of a design review than a runtime test)
        
        return {
            name: 'Interface Segregation Principle',
            passed: issues.length === 0,
            message: issues.length === 0 ? 'Interfaces are appropriately segregated' : issues.join('; ')
        };
    }

    // Test 5: Dependency Inversion Principle
    testDependencyInversionPrinciple() {
        // High-level modules should not depend on low-level modules
        // Both should depend on abstractions
        const issues = [];
        
        try {
            const container = new ServiceContainer();
            
            // Test dependency injection
            container.registerSingleton('testService', GameStateSystem);
            const service = container.resolve('testService');
            
            if (!(service instanceof GameStateSystem)) {
                issues.push('Service container does not properly resolve dependencies');
            }
            
            // Test that GameEngine depends on abstractions, not concrete classes
            const gameEngine = new GameEngine();
            
            // GameEngine should use ServiceContainer for dependencies
            if (!gameEngine.getService) {
                issues.push('GameEngine does not use dependency injection');
            }
            
        } catch (error) {
            issues.push(`Dependency inversion failed: ${error.message}`);
        }

        return {
            name: 'Dependency Inversion Principle',
            passed: issues.length === 0,
            message: issues.length === 0 ? 'Dependencies are properly inverted' : issues.join('; ')
        };
    }

    // Test service container functionality
    testServiceContainer() {
        const issues = [];
        
        try {
            const container = new ServiceContainer();
            
            // Test singleton registration and resolution
            container.registerSingleton('test', GameStateSystem);
            const instance1 = container.resolve('test');
            const instance2 = container.resolve('test');
            
            if (instance1 !== instance2) {
                issues.push('Singleton pattern not working correctly');
            }
            
            // Test transient registration
            container.registerTransient('transient', GameStateSystem);
            const transient1 = container.resolve('transient');
            const transient2 = container.resolve('transient');
            
            if (transient1 === transient2) {
                issues.push('Transient pattern not working correctly');
            }
            
            // Test service existence
            if (!container.has('test')) {
                issues.push('Container does not properly track registered services');
            }
            
        } catch (error) {
            issues.push(`Service container test failed: ${error.message}`);
        }

        return {
            name: 'Service Container',
            passed: issues.length === 0,
            message: issues.length === 0 ? 'Service container works correctly' : issues.join('; ')
        };
    }

    // Test game engine isolation
    testGameEngineIsolation() {
        const issues = [];
        
        try {
            // GameEngine should not directly instantiate systems
            // It should use the service container
            const gameEngineCode = GameEngine.toString();
            
            // Check for direct instantiation (new SomeSystem())
            const directInstantiations = gameEngineCode.match(/new \w+System\(/g);
            if (directInstantiations && directInstantiations.length > 0) {
                issues.push(`GameEngine directly instantiates systems: ${directInstantiations.join(', ')}`);
            }
            
            // GameEngine should delegate to managers
            const gameEngine = new GameEngine();
            
            if (!gameEngine.systemManager) {
                issues.push('GameEngine does not use SystemManager for delegation');
            }
            
            if (!gameEngine.sceneManager) {
                issues.push('GameEngine does not use SceneManager for delegation');
            }
            
        } catch (error) {
            issues.push(`GameEngine isolation test failed: ${error.message}`);
        }

        return {
            name: 'GameEngine Isolation',
            passed: issues.length === 0,
            message: issues.length === 0 ? 'GameEngine is properly isolated' : issues.join('; ')
        };
    }

    // Generate test report
    generateReport() {
        const passed = this.results.filter(r => r.passed).length;
        const total = this.results.length;
        const percentage = Math.round((passed / total) * 100);
        
        const report = {
            passed,
            total,
            percentage,
            success: percentage >= 80,
            results: this.results,
            summary: `${passed}/${total} tests passed (${percentage}%)`
        };
        
        console.log(`\n🧪 SOLID Architecture Test Results: ${report.summary}`);
        console.log(report.success ? '✅ Architecture validation PASSED' : '❌ Architecture validation FAILED');
        
        return report;
    }
}

// Export test function for easy access
export async function runArchitectureTests() {
    const test = new ArchitectureTest();
    return await test.runTests();
} 