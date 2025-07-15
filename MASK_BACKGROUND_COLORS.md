# Système de Couleurs de Fond basé sur les Masques

## Vue d'ensemble

Le système lie automatiquement la couleur de fond de la scène au masque sélectionné par le joueur. Chaque masque a sa propre couleur de fond distinctive qui s'active automatiquement lors du changement de masque.

## Couleurs de Fond par Masque

| Masque | Idéologie | Couleur de Fond | Code Hexadécimal |
|--------|-----------|-----------------|------------------|
| Neutre | Neutral | Bleu foncé | `0x001122` |
| 1 | Conservative | Bleu profond | `0x0a1a3a` |
| 2 | Social Justice | Rouge profond | `0x3a0a0a` |
| 3 | Libertarian | Orange/Brun profond | `0x332211` |
| 4 | Nationalist | Vert profond | `0x0a2a0a` |
| 5 | Culture | Violet profond | `0x2a0a3a` |
| 6 | Religious | Brun profond | `0x2a1a0a` |
| 7 | Antisystem | Rose profond | `0x3a1a2a` |

## Configuration

### Paramètres dans `params.js`

```javascript
// Background colors based on player mask
MASK_BACKGROUND_COLORS: {
    null: 0x001122,        // Neutral - Default dark blue
    1: 0x0a1a3a,         // Conservative - Deep blue
    2: 0x3a0a0a,         // Social Justice - Deep red
    3: 0x332211,         // Libertarian - Deep orange/brown
    4: 0x0a2a0a,         // Nationalist - Deep green
    5: 0x2a0a3a,         // Culture - Deep purple
    6: 0x2a1a0a,         // Religious - Deep brown
    7: 0x3a1a2a          // Antisystem - Deep pink
}
```

## Utilisation

### Changement Automatique

Le système fonctionne automatiquement :
- Lorsque le joueur change de masque (touches 1-7), la couleur de fond change
- Lorsque le joueur revient au neutre (Échap), la couleur revient au bleu foncé par défaut
- Le changement est instantané et synchronisé

### Méthodes Disponibles

#### SceneManager

```javascript
// Changer la couleur de fond basée sur le masque
sceneManager.setBackgroundFromMask(maskType);

// Changer la couleur de fond avec une couleur personnalisée
sceneManager.setBackgroundColor(0x123456);

// Obtenir la couleur de fond actuelle
const currentColor = sceneManager.getBackgroundColor();

// Tester toutes les couleurs de fond des masques
sceneManager.testAllMaskColors();
```

#### PlayerSystem

```javascript
// Changer le masque du joueur (change automatiquement le fond)
playerSystem.setMask(maskType);

// Obtenir le masque actuel
const currentMask = playerSystem.getCurrentMask();
```

## Système de Test

Un utilitaire de test est disponible dans `testMaskColors.js` :

### Raccourcis Clavier

- `Ctrl+T` : Teste toutes les couleurs de fond des masques
- `Ctrl+P` : Simule les changements de masque du joueur

### Utilisation Programmatique

```javascript
import { maskColorTester } from './testMaskColors.js';

// Initialiser le testeur
maskColorTester.initialize();

// Tester toutes les couleurs
maskColorTester.testAllColors();

// Tester une couleur spécifique
maskColorTester.testMaskColor(1); // Test Conservative mask

// Simuler les changements de masque
maskColorTester.simulatePlayerMaskChanges();

// Ajouter les raccourcis clavier
maskColorTester.addKeyboardShortcuts();
```

## Intégration

Le système est intégré dans :
- `SceneManager` : Gestion des couleurs de fond
- `PlayerSystem` : Notifications lors des changements de masque
- `GameStateSystem` : Synchronisation de l'état du jeu
- `ServiceContainer` : Injection de dépendances

## Personnalisation

Pour modifier les couleurs de fond :

1. Modifiez les valeurs dans `params.js` → `MASK_BACKGROUND_COLORS`
2. Les couleurs utilisent le format hexadécimal (`0x123456`)
3. Les changements sont appliqués immédiatement

## Logs et Debugging

Le système génère des logs console :
- `🎭 Background color changed to match [MaskName] mask ([HexColor])`
- `🎨 Testing mask [Type] ([MaskName])`
- `🎨 Background color initialized for neutral mask: [HexColor]`

## Notes Techniques

- Les couleurs de fond sont des versions "profondes" des couleurs des masques
- Le système utilise THREE.Color pour la gestion des couleurs
- La synchronisation est assurée par le ServiceContainer
- Le système est performant et ne cause pas de ralentissement 