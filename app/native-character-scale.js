// All authored heads share the original Gorilla/Cat body and 20-bone rig.
// Normalizing each silhouette separately makes short-headed characters' bodies
// larger and changes the apparent fit of every accessory. Keep the same body
// scale as the first page; ears, fins and head shapes retain their own outline.
export const NATIVE_BODY_REFERENCE_HEIGHT = .3345185926093267;
const approved = new Set(['axolotl67','cyclops67','skeleton67','zombie67','chick67','sloth67','pig67']);
export function applyNativeBodyScale(asset) {
  for (const scene of new Set([asset?.scene, ...(asset?.scenes || [])])) {
    if (!scene || !approved.has(scene.userData?.originalCharacter) || scene.userData.sharedBody !== true) continue;
    scene.userData.parkNativeHeight = NATIVE_BODY_REFERENCE_HEIGHT;
  }
  return asset;
}
