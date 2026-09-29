# Style Studio preview 5 / shared lighting

Both desktop/mobile and both studio renderers now use `app/studio-lighting.js`:
ACES filmic, sRGB, exposure 1, ambient .62 and white key 1.55. These match the
park renderer's baseline colour/exposure and light intensities, not its dynamic
time-of-day illumination. Removed the separate wardrobe's extra environment
reflections and high-intensity studio lights. Character materials, textures,
geometry, camera framing, cap fit and CSS backdrop are unchanged.

QA: `check-studio-lighting.cjs` compares actual renderer/light values between
desktop and mobile and exercises Friends profile open/render/return. The existing
studio test also checks all items, 1000 swaps, persistence and narrow layouts.

2026-09-18: profile navigation now opens this studio for Gorilla 67. Friends
characters retain their existing in-game equipment editor (studio view), not
a forced gorilla replacement. Character selection is confirmed only on a
successful park entry. Returning players load the saved character automatically.
No IP-based identity is used. Clearing browser storage resets this local profile.
The studio return link retains the game's URL/query within the same repository.
The propeller cap uses a narrower, lower, head-centred fit; source GLBs unchanged.

IMPORTANT: Gorilla studio outfits remain a saved preview, not in-game equipment
or multiplayer outfit synchronization. Profile navigation is not an equip bridge.
See `check-profile.cjs` in the working release folder for the entry/reload/profile
tests. Physical iPhone/Safari and NFT/account identity are not certified.

## Original preview baseline

Isolated selection-screen prototype. No live game entry, map, online protocol,
character source file, or existing wardrobe was changed.

- Existing Friends assets: 3 footwear choices, rainbow wings, a backpack,
  rainbow outfit, propeller cap, crown, green glasses; each slot has a no-item option.
- Gorilla head, body rig and original hands are retained. The donor outfit's
  separate hand triangles are excluded from a cloned geometry. A second outfit
  with non-detached wrist topology was deliberately excluded.
- Headwear/glasses are extracted from existing meshes and attached to the
  gorilla Head bone, with studio-only fit offsets.
- Saves to `67park.style-studio.v1` in this browser; NOT game equipment or NFT ownership.
- Cached equipment is toggled, not allocated on each click. Source assets are unchanged.

QA: Chrome desktop 1440x960, narrow layouts 390x844 and 320x568; all selection
options, 1000 shoe swaps, save/reload, reset, original hands visibility,
walk animation and advancing render frames. No page errors. Visual front/back
inspection performed. Physical iPhone/Safari not certified.

Reference test: `/tmp/67park-party-audio-llRIah/fit-lab/check-studio.cjs`.
Mobile wardrobe scrolls independently so the character remains visible.
Publishing this directory does not activate it as the game's entry screen.
