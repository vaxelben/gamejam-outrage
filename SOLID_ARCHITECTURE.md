# Architecture SOLID - Masques et Outrage

## Vue d'ensemble

Ce projet a été refactorisé pour respecter les principes SOLID et adopter une architecture modulaire, extensible et maintenable.

## Structure du Projet

```
js/
├── core/                    # Classes centrales du moteur
│   ├── GameEngine.js       # Moteur de jeu principal
│   ├── SceneManager.js     # Gestion de la scène 3D
│   ├── SystemManager.js    # Coordination des systèmes
│   ├── InputManager.js     # Gestion centralisée des entrées
│   └── ServiceContainer.js # Container d'injection de dépendances
├── interfaces/             # Interfaces et contrats
│   └── IGameSystem.js      # Interface pour tous les systèmes
├── systems/                # Systèmes de jeu
│   ├── GameStateSystem.js  # Gestion de l'état du jeu
│   ├── PlayerSystem.js     # Système du joueur
│   ├── NPCSystem.js        # Système des PNJ
│   ├── PoliceSystem.js     # Système de police
│   └── UISystem.js         # Système d'interface utilisateur
├── components/             # Composants réutilisables
│   ├── Transform.js        # Composant de transformation
│   └── Renderer.js         # Composant de rendu
├── factories/              # Factories pour créer des objets
│   └── NPCFactory.js       # Factory pour créer des PNJ
└── tests/                  # Tests d'architecture
    └── ArchitectureTest.js # Validation des principes SOLID
```

## Principes SOLID Implémentés

### 1. Single Responsibility Principle (SRP)

Chaque classe a une seule responsabilité :

- **GameEngine** : Orchestration générale du jeu
- **SceneManager** : Gestion de la scène 3D et du rendu
- **SystemManager** : Coordination des systèmes de jeu
- **InputManager** : Gestion des entrées clavier/souris
- **GameStateSystem** : Gestion de l'état du jeu uniquement
- **PlayerSystem** : Logique du joueur uniquement
- **NPCSystem** : Gestion des PNJ uniquement

### 2. Open/Closed Principle (OCP)

- **Nouveau système** : Créer une classe héritant de `IGameSystem`
- **Nouveau type de PNJ** : Utiliser le `NPCFactory` avec un nouveau type
- **Nouveau composant** : Créer dans le dossier `components/`

### 3. Liskov Substitution Principle (LSP)

Tous les systèmes héritent de `IGameSystem` et peuvent être utilisés de manière interchangeable :

```javascript
// Tous ces systèmes sont substituables
const systems = [
    new GameStateSystem(),
    new PlayerSystem(),
    new NPCSystem()
];

systems.forEach(system => {
    system.initialize(sceneManager); // Fonctionne pour tous
    system.update(deltaTime);        // Fonctionne pour tous
});
```

### 4. Interface Segregation Principle (ISP)

- `IGameSystem` : Interface minimale pour les systèmes
- `Transform` : Composant spécialisé pour les transformations
- `Renderer` : Composant spécialisé pour le rendu

### 5. Dependency Inversion Principle (DIP)

Utilisation d'un container d'injection de dépendances :

```javascript
// Enregistrement
serviceContainer.registerSingleton('gameStateSystem', GameStateSystem);

// Résolution
const gameState = serviceContainer.resolve('gameStateSystem');
```

## Avantages de la Nouvelle Architecture

### 🔧 Maintenabilité
- Code modulaire et organisé
- Responsabilités clairement séparées
- Tests automatisés d'architecture

### 🚀 Extensibilité
- Ajout facile de nouveaux systèmes
- Nouveaux types d'entités via factory
- Composants réutilisables

### 🧪 Testabilité
- Injection de dépendances
- Isolation des responsabilités
- Validation automatique des principes SOLID

### 🔄 Flexibilité
- Architecture modulaire permettant l'évolution
- Ajout facile de nouvelles fonctionnalités
- Refactoring sans impact sur les autres systèmes

## Guide d'Utilisation

### Créer un Nouveau Système

```javascript
import { IGameSystem } from '../interfaces/IGameSystem.js';

export class MonNouveauSystem extends IGameSystem {
    constructor() {
        super('MonNouveauSystem');
    }

    async initialize(sceneManager) {
        // Initialisation
    }

    update(deltaTime) {
        // Mise à jour
    }

    shutdown() {
        // Nettoyage
    }
}
```

### Enregistrer le Système

```javascript
// Dans main.js
serviceContainer.registerSingleton('monSystem', MonNouveauSystem);
gameEngine.registerSystem('monSystem', serviceContainer.resolve('monSystem'), 60);
```

### Utiliser l'Injection de Dépendances

```javascript
// Dans un système
const gameState = serviceContainer.resolve('gameStateSystem');
const player = serviceContainer.resolve('playerSystem');
```

## Tests d'Architecture

Exécuter les tests de validation SOLID :

```javascript
import { runArchitectureTests } from './js/tests/ArchitectureTest.js';

// Dans la console du navigateur
runArchitectureTests().then(report => {
    console.log('Tests results:', report);
});
```

## Architecture Moderne

L'architecture SOLID remplace complètement l'ancien système :

```javascript
// Nouvelle architecture avec injection de dépendances
const gameState = serviceContainer.resolve('gameStateSystem');
const player = serviceContainer.resolve('playerSystem');

gameState.addOutrage(10);
player.setMask(1);
```

## Debug et Monitoring

### Stats du Moteur
```javascript
window.getEngineStats(); // Statistiques du moteur
window.getSystemStats(); // État des systèmes
```

### Accès Direct
```javascript
window.gameEngine();      // Accès au moteur
window.serviceContainer(); // Accès au container
```

## Bonnes Pratiques

### ✅ À Faire
- Utiliser l'injection de dépendances
- Créer des composants réutilisables
- Respecter les interfaces
- Écrire des tests

### ❌ À Éviter
- Dépendances directes entre systèmes
- Classes avec multiples responsabilités
- Modification de l'interface IGameSystem
- Couplage fort

## Performance

- **SystemManager** : Mise à jour par priorité
- **NPCSystem** : Throttling automatique (100ms)
- **UISystem** : Rendu optimisé
- **InputManager** : Gestion d'événements efficace

## Conclusion

Cette architecture SOLID offre :
- **Flexibilité** pour les futurs développements
- **Robustesse** grâce aux tests automatisés
- **Clarté** avec la séparation des responsabilités
- **Évolutivité** avec l'injection de dépendances

Le jeu est maintenant prêt pour une expansion future tout en maintenant la qualité du code et la facilité de maintenance. 