# Migration vers la méthode WebGPU Earth (Three.js)

## 🌍 Vue d'ensemble

Le `SceneManager.js` a été entièrement refactorisé pour utiliser **exactement la même méthode** que l'exemple Three.js WebGPU Earth officiel. Cette migration remplace les custom shaders par des **TSL nodes** modernes.

## 🚀 Changements majeurs

### 1. **Architecture des matériaux**

**Avant** (Custom Shaders):
```javascript
// Dual sphere avec custom shader chunks
const outerMaterial = new THREE.MeshStandardMaterial({...});
outerMaterial.onBeforeCompile = (shader) => {
    // Custom shader modifications
};
```

**Après** (TSL Nodes):
```javascript
// Globe avec MeshStandardNodeMaterial
const globeMaterial = new THREE.MeshStandardNodeMaterial();
globeMaterial.colorNode = mix(texture(dayTexture), vec3(1), cloudsStrength.mul(2));

// Atmosphère avec MeshBasicNodeMaterial  
const atmosphereMaterial = new THREE.MeshBasicNodeMaterial({
    side: THREE.BackSide, 
    transparent: true 
});
```

### 2. **Gestion des nuages volumétriques**

**Extraction des nuages** (identique à l'exemple):
```javascript
const cloudsStrength = texture(bumpRoughnessCloudsTexture, uv()).b.smoothstep(0.2, 1);
```

**Effet volumétrique** via double rendu:
- **Globe**: Surface terrestre avec nuages intégrés (`FrontSide`)
- **Atmosphère**: Couche transparente avec effet fresnel (`BackSide`, échelle 1.04x)

### 3. **Effets atmosphériques**

**Fresnel** (effet de bord):
```javascript
const viewDirection = positionWorld.sub(cameraPosition).normalize();
const fresnel = viewDirection.dot(normalWorldGeometry).abs().oneMinus().toVar();
```

**Orientation solaire**:
```javascript
const sunOrientation = normalWorldGeometry.dot(normalize(vec3(sunDirection.x, sunDirection.y, sunDirection.z))).toVar();
```

**Couleurs atmosphériques**:
```javascript
const atmosphereColor = mix(atmosphereTwilightColor, atmosphereDayColor, sunOrientation.smoothstep(-0.25, 0.75));
```

### 4. **Contrôles GUI**

Ajout de contrôles temps réel (comme l'exemple):
- **Atmosphere Day Color** (`#4db2ff`)
- **Atmosphere Twilight Color** (`#bc490b`)
- **Roughness Low/High** (0.25 - 0.35)

### 5. **Rotation planétaire**

Intégration dans `GameEngine.js`:
```javascript
// Update planet rotation (exactly like WebGPU example)
this.sceneManager.updatePlanetRotation(deltaTime);
```

## 🎨 Canaux de texture

La texture `earth_bump_roughness_clouds_4096.jpg` utilise:
- **Canal Rouge**: Bump/Élévation
- **Canal Vert**: Rugosité de surface  
- **Canal Bleu**: **Densité des nuages** (effet volumétrique)

## 🌟 Avantages

1. **Performance**: TSL nodes plus optimisés que les custom shaders
2. **Compatibilité**: 100% compatible avec l'exemple WebGPU officiel
3. **Maintenabilité**: Code plus lisible et modulaire
4. **Fonctionnalités**: GUI temps réel pour ajustement atmosphérique
5. **Modernité**: Utilisation des dernières fonctionnalités Three.js

## 🎛️ Utilisation

Les contrôles atmosphériques sont maintenant disponibles via GUI :
- Modification temps réel des couleurs atmosphériques
- Ajustement de la rugosité planétaire
- Rotation automatique (0.025 rad/s comme l'exemple)

## 📊 Compatibilité

✅ **Compatibilité complète** avec l'exemple Three.js WebGPU Earth  
✅ **Mêmes paramètres** (uniforms, couleurs, échelles)  
✅ **Mêmes effets** (fresnel, nuages volumétriques, jour/nuit)  
✅ **Même architecture** (TSL nodes + double rendering)  

La planète utilise maintenant la **technique officielle Three.js** pour un rendu Earth photoréaliste ! 🌍✨ 