# 🎭 Masques et Outrage - POC

## Migration vers Three.js

Ce projet a été **migré de Babylon.js vers Three.js** pour une meilleure compatibilité et performance.

## 🚀 Installation et lancement

### Prérequis
- [Node.js](https://nodejs.org/) (version 16 ou supérieure)
- [Yarn](https://yarnpkg.com/) package manager

### Installation des dépendances
```bash
# Installer les dépendances
yarn install
```

### Développement
```bash
# Lancer le serveur de développement avec hot reload
yarn dev

# Le jeu sera accessible sur http://localhost:3000
```

### Build de production
```bash
# Construire le projet pour la production
yarn build

# Prévisualiser le build de production
yarn preview
```

### Méthodes alternatives (sans build)

#### Méthode 1 : Serveur HTTP local (Python)
```bash
python -m http.server 8000
```
Puis ouvrez `http://localhost:8000` dans votre navigateur.

#### Méthode 2 : Serveur HTTP local (Node.js)
```bash
npx serve .
```

#### Méthode 3 : Live Server (VS Code)
Installez l'extension "Live Server" dans VS Code et cliquez sur "Go Live" en bas à droite.

## 🎮 Contrôles

- **ZQSD** : Déplacement (clavier AZERTY)
- **1-7** : Sélection des masques idéologiques
- **ESC** : Retour au masque neutre

## 📊 Système de jeu

### Masques idéologiques
1. **Conservatives** (Bleu)
2. **Social Justice** (Rouge)
3. **Libertarians** (Orange)
4. **Nationalists** (Vert)
5. **Culture** (Mauve)
6. **Religious** (Marron)
7. **Antisystem** (Rose)

### Mécaniques
- **Énergie** : Se vide quand vous portez un masque
- **Outrage** : Augmente si vous portez le mauvais masque dans une foule
- **Police** : Apparaît quand l'outrage dépasse 90%
- **Foules** : Chaque foule nécessite un masque spécifique

### Conditions de victoire/défaite
- **Adulte** : Maintenez l'outrage < 10% pendant 3 minutes
- **Chaos** : Maintenez l'outrage ≥ 100% pendant 30 secondes
- **Arrestation** : La police vous attrape

## 🔧 Architecture technique

### Migration Babylon.js → Three.js

#### Rendu et scène
- `BABYLON.Engine` → `THREE.WebGLRenderer`
- `BABYLON.Scene` → `THREE.Scene`
- `BABYLON.FreeCamera` → `THREE.PerspectiveCamera`
- `BABYLON.HemisphericLight` → `THREE.AmbientLight` + `THREE.DirectionalLight`

#### Géométries et matériaux
- `BABYLON.MeshBuilder` → `THREE.SphereGeometry`, `THREE.BoxGeometry`, etc.
- `BABYLON.StandardMaterial` → `THREE.MeshLambertMaterial`
- `BABYLON.Color3` → `THREE.Color`

#### Vecteurs et transformations
- `BABYLON.Vector3` → `THREE.Vector3`
- `BABYLON.Vector2` → `THREE.Vector2`
- `BABYLON.Quaternion` → `THREE.Quaternion`
- `BABYLON.Matrix` → `THREE.Matrix4`

#### Instancing
- `thinInstanceSetBuffer` → `THREE.InstancedMesh`

#### Interface utilisateur
- `BABYLON.GUI` → Interface HTML/CSS personnalisée

#### Animations
- `BABYLON.Animation` → Animations manuelles avec `requestAnimationFrame`

### Fichiers modifiés
- `index.html` : Remplacement des CDN et ajout de l'interface CSS
- `js/main.js` : Migration complète du moteur de rendu
- `js/gameState.js` : Adaptation des couleurs
- `js/params.js` : Adaptation des couleurs
- `js/systems/PlayerSystem.js` : Système de contrôles modernisé
- `js/systems/NPCSystem.js` : Migration vers `InstancedMesh`
- `js/systems/PoliceSystem.js` : Migration complète du système de police
- `js/systems/UISystem.js` : Remplacement complet par HTML/CSS

## 🎨 Fonctionnalités

### Système de masques
- 7 masques idéologiques différents (Conservatives, Social Justice, Libertarians, etc.)
- Système d'énergie pour limiter l'utilisation
- Couleurs distinctes pour chaque idéologie

### Système de foules
- 12 foules générées aléatoirement
- 3 types visuels : triangles, carrés, cercles
- Chaque foule nécessite un masque spécifique
- Système de timer pour expulsion après 30 secondes

### Système de police
- Apparition automatique à 90% d'outrage
- IA de poursuite du joueur
- Animation de vol stationnaire
- Effet de flash lors de l'arrestation

### Interface utilisateur
- Barres verticales pour énergie et outrage
- Sélecteur de masques interactif
- Informations de temps, statut et score
- Écran de fin de partie personnalisé

## 🐛 Débogage

### Problèmes courants
1. **Écran noir** : Vérifiez la console pour les erreurs JavaScript
2. **Pas de contrôles** : Cliquez sur le canvas pour lui donner le focus
3. **Pas d'interface** : Vérifiez que tous les éléments HTML sont chargés

### Console de débogage
Le jeu affiche des logs détaillés dans la console :
- 🎭 Événements de jeu
- 🚶 Mouvements du joueur
- 👥 Interactions avec les foules
- 🚓 Actions de la police

## 📁 Structure des fichiers

```
MasquesEtOutragePOC/
├── index.html          # Page principale avec interface CSS
├── js/
│   ├── main.js         # Initialisation et boucle principale
│   ├── gameState.js    # Gestion de l'état du jeu
│   ├── params.js       # Paramètres configurables
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
├── README.md           # Ce fichier
└── autres fichiers...
```

## 🌟 Améliorations apportées

- **Performance** : Utilisation d'`InstancedMesh` pour optimiser le rendu des foules
- **Interface** : Interface HTML/CSS native plus réactive
- **Compatibilité** : Three.js offre une meilleure compatibilité navigateur
- **Maintenabilité** : Code plus modulaire et mieux documenté
- **Expérience utilisateur** : Écran de fin de partie amélioré
- **Environnement de développement** : Configuration Vite avec hot reload et bundling optimisé

## 🛠️ Environnement de développement moderne

### Configuration Vite
Le projet utilise maintenant [Vite](https://vitejs.dev/) pour :
- **Hot Module Replacement (HMR)** : Rechargement instantané des modifications
- **Bundling optimisé** : Code splitting et optimisation automatique
- **Support ES6** : Import/export natifs avec Three.js local
- **Build rapide** : Compilation ultra-rapide en développement

### Structure des dépendances
```json
{
  "dependencies": {
    "three": "^0.155.0"
  },
  "devDependencies": {
    "vite": "^4.4.9"
  }
}
```

### Scripts disponibles
- `yarn dev` : Serveur de développement avec hot reload
- `yarn build` : Build de production optimisé
- `yarn preview` : Prévisualisation du build de production

Le jeu conserve toutes les fonctionnalités originales tout en bénéficiant des avantages de Three.js et d'un environnement de développement moderne !

---

*Migration réalisée avec succès de Babylon.js vers Three.js* ✨ 