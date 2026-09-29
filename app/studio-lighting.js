// Shared by both wardrobe renderers and both releases. Match the park's
// baseline colour pipeline; never compensate by changing character materials.
export function configureStudioLighting(renderer,scene,T) {
  renderer.outputColorSpace=T.SRGBColorSpace;
  renderer.toneMapping=T.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1;
  scene.environment=null;
  const ambient=new T.AmbientLight(0xffffff,.62);
  const key=new T.DirectionalLight(0xffffff,1.55);
  key.position.set(3,5,4);
  scene.add(ambient,key);
  scene.userData.studioLighting='park-neutral-v1';
  renderer.domElement.dataset.studioLighting='park-neutral-v1';
}
