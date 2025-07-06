// core/ServiceContainer.js - Dependency injection container following DIP
export class ServiceContainer {
    constructor() {
        this.services = new Map();
        this.singletons = new Map();
        this.factories = new Map();
    }

    // Register a singleton service
    registerSingleton(name, serviceClass, dependencies = []) {
        this.services.set(name, {
            type: 'singleton',
            serviceClass,
            dependencies,
            instance: null
        });
    }

    // Register a transient service (new instance each time)
    registerTransient(name, serviceClass, dependencies = []) {
        this.services.set(name, {
            type: 'transient',
            serviceClass,
            dependencies
        });
    }

    // Register a factory function
    registerFactory(name, factoryFunction, dependencies = []) {
        this.factories.set(name, {
            factory: factoryFunction,
            dependencies
        });
    }

    // Register an existing instance
    registerInstance(name, instance) {
        this.singletons.set(name, instance);
    }

    // Resolve a service by name
    resolve(name) {
        // Check if it's a pre-registered instance
        if (this.singletons.has(name)) {
            return this.singletons.get(name);
        }

        // Check if it's a factory
        if (this.factories.has(name)) {
            return this.resolveFactory(name);
        }

        // Check if it's a registered service
        if (this.services.has(name)) {
            return this.resolveService(name);
        }

        throw new Error(`Service '${name}' not found in container`);
    }

    // Resolve a factory
    resolveFactory(name) {
        const factoryInfo = this.factories.get(name);
        const dependencies = this.resolveDependencies(factoryInfo.dependencies);
        return factoryInfo.factory(...dependencies);
    }

    // Resolve a registered service
    resolveService(name) {
        const serviceInfo = this.services.get(name);

        if (serviceInfo.type === 'singleton') {
            if (!serviceInfo.instance) {
                serviceInfo.instance = this.createInstance(serviceInfo);
            }
            return serviceInfo.instance;
        } else {
            return this.createInstance(serviceInfo);
        }
    }

    // Create an instance with dependency injection
    createInstance(serviceInfo) {
        const dependencies = this.resolveDependencies(serviceInfo.dependencies);
        return new serviceInfo.serviceClass(...dependencies);
    }

    // Resolve an array of dependencies
    resolveDependencies(dependencies) {
        return dependencies.map(dep => this.resolve(dep));
    }

    // Check if a service is registered
    has(name) {
        return this.services.has(name) || 
               this.singletons.has(name) || 
               this.factories.has(name);
    }

    // Get all registered service names
    getServiceNames() {
        const names = new Set();
        
        for (const name of this.services.keys()) {
            names.add(name);
        }
        
        for (const name of this.singletons.keys()) {
            names.add(name);
        }
        
        for (const name of this.factories.keys()) {
            names.add(name);
        }
        
        return Array.from(names);
    }

    // Clear all services
    clear() {
        this.services.clear();
        this.singletons.clear();
        this.factories.clear();
    }

    // Debug: Get container statistics
    getStats() {
        return {
            services: this.services.size,
            singletons: this.singletons.size,
            factories: this.factories.size,
            total: this.services.size + this.singletons.size + this.factories.size
        };
    }

    // Advanced: Register with configuration
    register(name, config) {
        const { 
            type = 'singleton', 
            serviceClass, 
            factory, 
            instance, 
            dependencies = [] 
        } = config;

        if (instance) {
            this.registerInstance(name, instance);
        } else if (factory) {
            this.registerFactory(name, factory, dependencies);
        } else if (serviceClass) {
            if (type === 'singleton') {
                this.registerSingleton(name, serviceClass, dependencies);
            } else {
                this.registerTransient(name, serviceClass, dependencies);
            }
        } else {
            throw new Error(`Invalid service configuration for '${name}'`);
        }
    }

    // Create a scoped container (child container)
    createScope() {
        const scope = new ServiceContainer();
        
        // Copy parent services
        for (const [name, config] of this.services) {
            scope.services.set(name, { ...config });
        }
        
        for (const [name, factory] of this.factories) {
            scope.factories.set(name, factory);
        }

        // Singletons are inherited but not copied (remain in parent)
        scope.parent = this;
        
        return scope;
    }

    // Resolve from parent if not found in current scope
    resolveWithParent(name) {
        try {
            return this.resolve(name);
        } catch (error) {
            if (this.parent) {
                return this.parent.resolveWithParent(name);
            }
            throw error;
        }
    }
}

// Global service container instance
export const serviceContainer = new ServiceContainer(); 