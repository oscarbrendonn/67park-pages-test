// Canvas reconfiguration (including keyboard-induced top/left changes) must
// agree with the island's lifecycle. A constant city="never" silently undoes
// the island's imperative resume when only the canvas offset changes.
export function parkFrameMode({mapId,ready,wardrobeOpen,hidden}) {
 return mapId !== 'city' || (ready && !wardrobeOpen && !hidden) ? 'always' : 'never';
}
export function useParkFramePolicy(React, sources) {
 const {mapId,subscribeEntry,entrySnapshot,subscribeWardrobe,wardrobe,doc=document}=sources;
 const subscribe=React.useCallback(notify=>{
  const stopEntry=subscribeEntry(notify),stopWardrobe=subscribeWardrobe(notify);
  doc.addEventListener('visibilitychange',notify);
  return()=>{stopEntry();stopWardrobe();doc.removeEventListener('visibilitychange',notify)};
 },[subscribeEntry,subscribeWardrobe,doc]);
 const snapshot=()=>parkFrameMode({mapId,ready:entrySnapshot().status==='ready',wardrobeOpen:wardrobe.open,hidden:doc.hidden});
 return React.useSyncExternalStore(subscribe,snapshot,()=> 'never');
}
