# Central buildings v68

Twelve handmade v8 buildings placed additively on the existing central lawns.
Four round corners, two tall northern squares, two tall upper-side squares,
two short lower-side squares and two short southern squares. Tall models are
14.4 metres; short models are uniformly scaled to 10.8 metres.

Source assets: `/Volumes/Films/handmade-buildings-v8/` (authored geometry, no Meshy generation).
The two shared GLBs total about 2.75 MB. Instancing uses 24 visible material draws
instead of 144 separate building-part draws. No added textures or lights.

Ground height is sampled separately for each map. The loader checks lawn support
before adding the group. Collision and camera volumes are included. Loading errors
are reported via canvas.dataset.centralBuildings68 without blocking the base game.

No terrain, roads, fountain, existing buildings or original map files are edited.
Pre-change game entry files are backed up in `/Volumes/Films/central-placement-v68-backup/`.

Normal game entry: `calisma.html?v=68`. Sector QA links are inspection-only.

## v70 two-building toy trial (not a full style rollout)

Only NW (round) and N1 (square) use the new trial assets in both maps.
Height, placement, glass interiors and all other buildings are unchanged.
The trial removes hairline joints and secondary floor trim, doubles the structural
frame width, rounds the bands and square footprint, and adds a satin clear coat.
The original v8 assets remain untouched. The trial increases visible material
batches from 24 to 46 while reducing each trial asset from 67,272 to 60,648 triangles.
Revert using the saved loaders in `/Volumes/Films/handmade-buildings-toy-v70/`.
