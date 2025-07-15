# Guide du Système d'Événements Formalisé

## Vue d'ensemble

Le système d'événements formalisé remplace les communications directes entre systèmes par un système centralisé, découplé et typé qui respecte les principes SOLID.

## Architecture

```
EventManager (Central)
    ↓
GameEventTypes (Constantes)
    ↓
EventDataFactory (Création d'événements)
    ↓
IGameSystem (Interface avec helpers)
    ↓
Systems individuels
```

## Utilisation de Base

### 1. Publier un Événement

```javascript
// Dans un système
import { GameEventTypes, EventDataFactory } from '../interfaces/GameEvents.js';

export class MySystem extends IGameSystem {
    someMethod() {
        // Publier un événement simple
        this.publishEvent(GameEventTypes.PLAYER_MOVE, {
            position: this.getPlayerPosition(),
            timestamp: Date.now()
        });
        
        // Publier avec données typées
        const eventData = EventDataFactory.playerMaskChange(
            this.oldMask, 
            this.newMask, 
            energyCost
        );
        this.publishEvent(GameEventTypes.PLAYER_MASK_CHANGE, eventData);
    }
}
```

### 2. S'abonner à un Événement

```javascript
export class MySystem extends IGameSystem {
    async initialize(sceneManager) {
        // S'abonner avec priorité normale
        this.subscribeToEvent(GameEventTypes.PLAYER_MASK_CHANGE, (event) => {
            console.log('Player mask changed:', event.data);
        });
        
        // S'abonner avec priorité haute
        this.subscribeToEvent(
            GameEventTypes.GAME_STATE_CHANGE,
            (event) => this.handleGameStateChange(event),
            EventPriorities.HIGH
        );
        
        // S'abonner une seule fois
        this.subscribeToEventOnce(GameEventTypes.GAME_OVER, (event) => {
            this.handleGameOver(event.data);
        });
    }
    
    handleGameStateChange(event) {
        if (event.data.property === 'outrage') {
            this.reactToOutrageChange(event.data.newValue);
        }
    }
}
```

### 3. Événements Asynchrones

```javascript
export class MySystem extends IGameSystem {
    async processComplexAction() {
        // Publier un événement asynchrone
        await this.publishEventAsync(GameEventTypes.SYSTEM_INITIALIZE, {
            systemName: this.name,
            status: 'starting'
        });
        
        // Traitement long...
        await this.doComplexWork();
        
        await this.publishEventAsync(GameEventTypes.SYSTEM_INITIALIZE, {
            systemName: this.name,
            status: 'completed'
        });
    }
}
```

## Types d'Événements Disponibles

### Événements Joueur
- `PLAYER_MOVE` - Mouvement du joueur
- `PLAYER_MASK_CHANGE` - Changement de masque
- `PLAYER_ENERGY_CHANGE` - Changement d'énergie
- `PLAYER_TELEPORT` - Téléportation
- `PLAYER_INTERACTION` - Interaction avec un objet/PNJ

### Événements d'État de Jeu
- `GAME_STATE_CHANGE` - Changement d'état général
- `GAME_OUTRAGE_CHANGE` - Changement d'outrage
- `GAME_OVER` - Fin de partie
- `GAME_WIN` - Victoire
- `GAME_RESET` - Remise à zéro

### Événements PNJ
- `NPC_SPAWN` - Apparition d'un PNJ
- `NPC_DESPAWN` - Disparition d'un PNJ
- `NPC_STATE_CHANGE` - Changement d'état d'un PNJ
- `NPC_INTERACTION` - Interaction entre PNJ

### Événements Police
- `POLICE_ACTIVATE` - Activation de la police
- `POLICE_DEACTIVATE` - Désactivation de la police
- `POLICE_PURSUIT` - Poursuite active
- `POLICE_CATCH_PLAYER` - Capture du joueur

## Priorités d'Événements

```javascript
import { EventPriorities } from '../interfaces/GameEvents.js';

// Priorité critique (traitée en premier)
this.subscribeToEvent(eventType, callback, EventPriorities.CRITICAL);

// Priorité haute
this.subscribeToEvent(eventType, callback, EventPriorities.HIGH);

// Priorité normale (par défaut)
this.subscribeToEvent(eventType, callback, EventPriorities.NORMAL);

// Priorité basse
this.subscribeToEvent(eventType, callback, EventPriorities.LOW);

// Priorité arrière-plan
this.subscribeToEvent(eventType, callback, EventPriorities.BACKGROUND);
```

## Middleware d'Événements

```javascript
// Ajouter un middleware pour logger tous les événements
eventManager.addMiddleware((event) => {
    console.log(`Event: ${event.type} from ${event.source}`);
    return true; // Continuer le traitement
});

// Middleware pour filtrer certains événements
eventManager.addMiddleware((event) => {
    if (event.type.startsWith('debug.') && !window.debugMode) {
        return false; // Annuler l'événement
    }
    return true;
});
```

## Gestion des Erreurs

```javascript
export class MySystem extends IGameSystem {
    async initialize(sceneManager) {
        // Les erreurs dans les listeners sont automatiquement catchées
        this.subscribeToEvent(GameEventTypes.PLAYER_MOVE, (event) => {
            try {
                this.handlePlayerMove(event.data);
            } catch (error) {
                // Publier un événement d'erreur
                this.publishEvent(GameEventTypes.SYSTEM_ERROR, 
                    EventDataFactory.systemError(this.name, error, 'handlePlayerMove')
                );
            }
        });
    }
}
```

## Debugging et Monitoring

```javascript
// Activer le debugging des événements
eventManager.setDebugging(true);

// Obtenir les statistiques
const stats = eventManager.getStats();
console.log('Event stats:', stats);

// Lister tous les types d'événements
const eventTypes = eventManager.getEventTypes();
console.log('Available events:', eventTypes);

// Compter les listeners pour un événement
const listenerCount = eventManager.getListenerCount(GameEventTypes.PLAYER_MOVE);
console.log('Player move listeners:', listenerCount);
```

## Migration depuis l'Ancien Système

### Avant (Ancien système)
```javascript
// Ancien système avec callbacks directs
gameStateSystem.addEventListener((event) => {
    if (event.property === 'outrage') {
        this.handleOutrageChange(event.newValue);
    }
});
```

### Après (Nouveau système)
```javascript
// Nouveau système avec événements typés
this.subscribeToEvent(GameEventTypes.GAME_OUTRAGE_CHANGE, (event) => {
    this.handleOutrageChange(event.data.newOutrage);
});
```

## Bonnes Pratiques

### ✅ À Faire
- Utiliser les constantes `GameEventTypes` pour les types d'événements
- Utiliser `EventDataFactory` pour créer des données d'événements
- Spécifier des priorités appropriées pour les événements critiques
- Nettoyer les souscriptions dans la méthode `shutdown()`
- Gérer les erreurs dans les listeners

### ❌ À Éviter
- Publier des événements trop fréquemment (chaque frame)
- Créer des cycles d'événements infinis
- Utiliser des événements pour des communications synchrones simples
- Ignorer les erreurs dans les listeners
- Oublier de nettoyer les souscriptions

## Exemple Complet

```javascript
// systems/ExampleSystem.js
import { IGameSystem } from '../interfaces/IGameSystem.js';
import { GameEventTypes, EventDataFactory, EventPriorities } from '../interfaces/GameEvents.js';

export class ExampleSystem extends IGameSystem {
    constructor() {
        super('Example');
        this.playerPosition = null;
    }

    async initialize(sceneManager) {
        // S'abonner aux événements du joueur
        this.subscribeToEvent(
            GameEventTypes.PLAYER_MOVE,
            (event) => this.handlePlayerMove(event),
            EventPriorities.NORMAL
        );
        
        // S'abonner aux changements d'état critique
        this.subscribeToEvent(
            GameEventTypes.GAME_OVER,
            (event) => this.handleGameOver(event),
            EventPriorities.HIGH
        );
        
        console.log('📋 Example System initialized with events');
    }

    handlePlayerMove(event) {
        this.playerPosition = event.data.newPosition;
        
        // Publier un événement de réaction
        this.publishEvent(GameEventTypes.SYSTEM_INITIALIZE, {
            systemName: this.name,
            action: 'player_tracked',
            position: this.playerPosition
        });
    }

    handleGameOver(event) {
        console.log('Game over received:', event.data.reason);
        
        // Publier un événement de nettoyage
        this.publishEvent(GameEventTypes.SYSTEM_SHUTDOWN, {
            systemName: this.name,
            reason: 'game_over'
        });
    }

    shutdown() {
        // Le nettoyage des événements est automatique via IGameSystem
        super.shutdown();
        console.log('📋 Example System shutdown');
    }
}
```

## Conclusion

Le système d'événements formalisé offre :
- **Découplage** : Les systèmes ne se connaissent plus directement
- **Typage** : Événements et données structurés
- **Flexibilité** : Priorités, middleware, événements asynchrones
- **Robustesse** : Gestion d'erreurs et nettoyage automatique
- **Débogage** : Outils de monitoring intégrés

Ce système respecte tous les principes SOLID et facilite l'extension et la maintenance du jeu. 