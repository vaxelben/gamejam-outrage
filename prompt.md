# CONTEXT
We are building a gameplay-focused proof of concept (POC) for the abstract single-player game **“Masques et Outrage”**.

Gameplay recap (keep implementation minimal):
• World = small sphere planet (≈ 60 units diameter).  
• Player = grey sphere moving tangentially on the surface (WASD) + mouse orbit camera.  
• 7 masks (keys 1-7). Wearing the *wrong* mask inside a crowd raises the global **Outrage** bar; the *right* mask inside that crowd recharges **Energy** until a 30 s kick-out.  
• At ≥ 90 % Outrage, a red **Police** drone spawns and chases the player (speed × 1 .3).  
• Player can return to Neutral only when far enough and not pursued.  
• **Score** = survivalTime × α (1) + polarisedPeople × β (0.2).  
• Endings: Arrested, “Adult” (Outrage < 10 % for 3 min), or Chaos (Outrage ≥ 100 % for 30 s).  

Technical constraints:
• **Vanilla JS + Babylon.js Lite** (latest) via CDN → zero build step.  
• Ultra-simple graphics: primitive meshes, solid colors, no textures.  
• Use **thin instances** for crowds to keep draw calls tiny.  
• Minimal GUI with `BABYLON.GUI` for Outrage bar, Energy bar, Score text.  
• Optional live-tuning via **Tweakpane** (or dat.GUI) for speeds, timers, α/β.  
• Total code per file ≤ 150 LOC.

# REQUEST
Generate an initial static-site scaffold:

1. **Project tree**
MasquesEtOutragePOC/
├─ index.html
├─ js/
│ ├─ main.js # boots Babylon, creates planet, player
│ ├─ gameState.js # globals: outrage, energy, score
│ ├─ ui.js # builds GUI & updates bars
│ ├─ playerController.js
│ ├─ crowdSystem.js
│ ├─ police.js
│ └─ params.js # tweakable constants
├─ .gitignore
└─ README.md


2. **index.html**
* `<canvas id="renderCanvas">`, includes `babylon.lite.js` (CDN), imports `./js/main.js` (type="module").

3. **main.js**
* Creates engine/scene, ArcRotateCamera, hemispheric light.
* Builds planet sphere (standard material grey).
* Imports modules (`params`, `gameState`, `playerController`, `crowdSystem`, `ui`, `police`).
* Game loop: `scene.onBeforeRenderObservable` updates logic & GUI.

4. **playerController.js**
* Handles tangential movement on sphere, mask switching, energy logic.
* Exports `playerMesh`, `update(dt)`.

5. **crowdSystem.js**
* Creates one thin-instanced mesh per crowd type (triangle, square, circle).
* Detects player proximity & mask mismatch; increments outrage; counts polarised people.

6. **police.js**
* Spawns drone mesh when `gameState.outrage >= params.OUTRAGE_POLICE`.
* Simple chase toward player; triggers game over on collision.

7. **ui.js**
* Builds fullscreen GUI (two `Rectangle` bars + score `TextBlock`).
* Provides `update()` called each frame.

8. **params.js**
* Export tunable constants (speeds, α, β, thresholds).
* If Tweakpane is included, expose those constants for live tuning.

9. **gameState.js**
* Holds `outrage`, `energy`, `scoreTime`, `polarised`, `isGameOver`, plus helper functions.

10. **.gitignore**
 * Standard Node/Web ignore (even if no build).

11. **README.md**
 * How to run (double-click **index.html** or serve with `npx http-server`), controls, tweaking guide, TODO list for next iteration.

12. **Code style**
 * ES module syntax, no external build.
 * Each JS file ≤ 150 lines, well-commented.
 * Placeholder meshes only; no textures, sounds or external assets.

# OUTPUT FORMAT
First print a bash-like tree, then the full content of every file inside triple-backtick blocks (```filename.ext\n…code…\n```).
Finish with the line:  
✅ Scaffold ready
