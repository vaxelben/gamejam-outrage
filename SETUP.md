# 🚀 Setup rapide - Masques et Outrage

## Installation et lancement en 3 étapes

### 1. Installer les dépendances
```bash
yarn install
```

### 2. Lancer le serveur de développement
```bash
yarn dev
```

### 3. Ouvrir le jeu
Le jeu s'ouvrira automatiquement sur `http://localhost:3000`

## Scripts disponibles

| Commande | Description |
|----------|-------------|
| `yarn dev` | Serveur de développement avec hot reload |
| `yarn build` | Build de production optimisé |
| `yarn preview` | Prévisualisation du build de production |

## Structure du projet

```
/
├── package.json        # Configuration des dépendances
├── vite.config.js      # Configuration Vite
├── index.html          # Page principale
├── js/                 # Code source du jeu
│   ├── main.js         # Point d'entrée
│   ├── gameState.js    # État du jeu
│   ├── core/           # Moteur de jeu (SOLID)
│   │   ├── GameEngine.js
│   │   ├── SceneManager.js
│   │   ├── InputManager.js
│   │   └── SystemManager.js
│   ├── systems/        # Systèmes de jeu
│   │   ├── PlayerSystem.js
│   │   ├── NPCSystem.js
│   │   ├── PoliceSystem.js
│   │   └── UISystem.js
│   └── components/     # Composants réutilisables
│       ├── Transform.js
│       └── Renderer.js
└── dist/               # Build de production (généré)
```

## Contrôles du jeu

- **ZQSD** : Déplacement
- **1-7** : Sélection des masques idéologiques
- **ESC** : Retour au neutre

## Développement

- **Hot reload** : Modifications instantanées
- **DevTools** : Console pour debug
- **Source maps** : Debug facilité
- **Code splitting** : Chargement optimisé

Bon développement ! 🎮 