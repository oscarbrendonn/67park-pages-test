// Guidance is platform-specific; fullscreen support is always feature-detected.
export function appModeGuide(host=window){
 const nav=host.navigator||{},ua=nav.userAgent||'';
 const ios=/iPhone|iPad|iPod/i.test(ua)||(/Mac/i.test(nav.platform||'')&&nav.maxTouchPoints>1);
 const android=/Android/i.test(ua);
 return {
  platform:ios?'ios':android?'android':'desktop',
  title:'Play 67Park like an app',
  steps:ios?[
   'Open this game link in Safari. If you opened it inside Discord or another app, copy the link below and paste it in Safari.',
   'Tap Share (or More → Share), then Add to Home Screen.',
   'Keep Open as Web App turned on if offered, then tap Add.',
   'Open the new 67Park icon from your Home Screen to play without the browser address bar.'
  ]:android?[
   'Open this game link in Chrome or your preferred full browser, not inside another app.',
   'Open the browser menu and choose Install app or Add to Home screen, if offered.',
   'Open the installed 67Park app icon. If the browser adds only a shortcut, use Full screen here instead.'
  ]:[
   'Use Full screen above to hide browser controls for this visit, when supported.',
   'For a separate app window, use your browser’s Install app option. In Safari on Mac, use File → Add to Dock, if available.',
   'Open 67Park from the installed app icon.'
  ],
  note:'Your browser controls installation. A website cannot add itself to your Home Screen or hide all system bars automatically.',
  identity:'Before switching browsers or opening a new app install, save your recovery code in Account & recovery. Use it there if your identity is not carried over. Keep it private.'
 };
}

export function fullscreenAdapter(doc){
 const root=doc.documentElement;
 const standard=()=>typeof root?.requestFullscreen==='function'&&typeof doc.exitFullscreen==='function'&&doc.fullscreenEnabled!==false;
 const webkit=()=>typeof root?.webkitRequestFullscreen==='function'&&typeof doc.webkitExitFullscreen==='function'&&(doc.webkitFullscreenEnabled??doc.fullscreenEnabled)!==false;
 return {
  element:()=>doc.fullscreenElement||doc.webkitFullscreenElement||null,
  supported:()=>standard()||webkit(),
  request:()=>standard()?root.requestFullscreen({navigationUI:'hide'}):root.webkitRequestFullscreen(),
  exit:()=>doc.fullscreenElement&&typeof doc.exitFullscreen==='function'?doc.exitFullscreen():typeof doc.webkitExitFullscreen==='function'?doc.webkitExitFullscreen():doc.exitFullscreen(),
  events:['fullscreenchange','webkitfullscreenchange']
 };
}
