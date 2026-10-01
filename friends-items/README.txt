FRIENDS - ITEM STUDIO

Browse 111 standalone wearable accessories and 7 procedural cosmetic effects.
No complete character or body models are included.

1. Search or filter the collection and select a thumbnail.
2. Drag the 3D view to orbit. Pinch or scroll to zoom.
3. Select a material. Keep its original texture, tint it, or use a solid color.
4. Adjust finish, size, rotation, and position. Use Undo, Redo, or Reset.
5. Export an edited GLB, save a PNG, or download the untouched original item.

On smaller screens, switch between Browse collection and Edit selected item.
Edits are stored in this browser's local storage only, not in a shared account.
They do not change the original files or the live game. Export important work
before clearing browser data or changing devices. Private browsing may discard
local drafts when the session ends.

EFFECTS
The Effects category contains 67Park procedural sparkles, particles, and aura
rings. They are not extracted Friends model files or gameplay abilities.
Export effect JSON to save appearance, transform, and speed. Download
effect-runtime.js alongside it and provide Three.js via an import map or bundler.

Example:
  import { createEffect } from './effect-runtime.js';
  const preset = await fetch('./vibe-mint-edited.json').then(r => r.json());
  const fx = createEffect(preset.id, preset.settings);
  scene.add(fx.root);
  // In your existing render loop; elapsedSeconds starts at zero:
  fx.update(elapsedSeconds * preset.settings.speed);
  // Respect prefers-reduced-motion: call update(0) instead for a still preview.
  // On removal:
  scene.remove(fx.root);
  fx.dispose();

The supplied ZIP is the original 111-item collection; effects use code and JSON
and are downloaded separately. All source asset license terms still apply.

The studio uses existing local Three.js modules and model URLs from the same
GitHub Pages site. Serve the repository over HTTP; file:// is not supported.
