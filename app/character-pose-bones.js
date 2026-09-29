// GLTFLoader gives duplicate skeleton joints a numeric suffix. Procedural
// poses must reach every copy, retaining each copy's authored rest transform.
// Non-bone nodes and unknown names deliberately keep their original identity.
const POSE_BONES = new Set(['Root','Spine1','Spine2','Spine3','Head','BiscepL','ArmL','HandL','BiscepR','ArmR','HandR','ThighL','ShinL','ToeL','ThighR','ShinR','ToeR','AttachmentL','AttachmentR','Backpiece_Attachment']);
export function canonicalPoseBoneName(node) {
  const name = node.name;
  if (!node.isBone) return name;
  const base = name.replace(/_\d+$/, '');
  return POSE_BONES.has(base) ? base : name;
}
