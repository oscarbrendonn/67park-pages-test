// Installed before the game's modules; only consumes Interact beside this toy.
(()=>{
 const typing=e=>e.target?.closest?.('input,textarea,select,[contenteditable],[role="textbox"]');
 const consume=e=>{e.preventDefault();e.stopImmediatePropagation();};
 let tappedAt=-Infinity;
 addEventListener('keydown',e=>{if(e.code!=='KeyE'||e.repeat||e.ctrlKey||e.metaKey||e.altKey||typing(e))return;if(window.__parkToyInteract?.())consume(e);},true);
 const isInteract=e=>{const b=e.target?.closest?.('.park-action');return b&&/^Interact/i.test(b.getAttribute('aria-label')||b.textContent?.trim()||'');};
 addEventListener('pointerdown',e=>{if(!isInteract(e))return;if(window.__parkToyInteract?.()){tappedAt=performance.now();consume(e);}},true);
 addEventListener('click',e=>{if(!isInteract(e))return;if(performance.now()-tappedAt<750||window.__parkToyInteract?.())consume(e);},true);
})();
