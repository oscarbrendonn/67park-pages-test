// 67 Park icon set for the action buttons: glossy cartoon shapes with a plum outline, drawn once as
// inline SVG (no emoji, no bitmaps). Shared gradients live in one hidden <svg> in the document.
const OUT = '#3d2b4a';
const DEFS = '<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>'
  + '<linearGradient id="pg-w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#dfe6f2"/></linearGradient>'
  + '<linearGradient id="pg-y" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe98a"/><stop offset="1" stop-color="#ffb42a"/></linearGradient>'
  + '<linearGradient id="pg-p" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffbcd6"/><stop offset="1" stop-color="#ff6fa3"/></linearGradient>'
  + '<linearGradient id="pg-b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#bfe1ff"/><stop offset="1" stop-color="#5aa9ec"/></linearGradient>'
  + '<linearGradient id="pg-m" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c9f4e0"/><stop offset="1" stop-color="#5fcf9f"/></linearGradient>'
  + '</defs></svg>';
const svg = inner => `<svg class="party-icon" viewBox="0 0 64 64" aria-hidden="true">${inner}</svg>`;
const st = (extra = '') => `stroke="${OUT}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" ${extra}`;
const ICONS = {
  punch: svg(`<rect x="9" y="36" width="15" height="15" rx="5" fill="url(#pg-y)" ${st()}/>`
    + `<path d="M22 22c0-5 4-9 9-9h9c8 0 14 6 14 14v9c0 8-6 14-14 14H30c-5 0-8-3-8-8z" fill="url(#pg-w)" ${st()}/>`
    + `<path d="M33 14v11M42 14v11" fill="none" ${st('stroke-width="2.6"')}/>`
    + `<path d="M22 29c-5 0-8 3-8 7s3 7 8 7" fill="url(#pg-w)" ${st()}/>`
    + `<ellipse cx="41" cy="19" rx="6" ry="2.6" fill="#fff" opacity=".8"/>`
    + `<path d="M55 11l3-5M58 20l5-2M50 7l0-5" fill="none" ${st()}/>`),
  throw: svg(`<path d="M13 40c-3-4-1-9 3-9l9 4V23c0-3 5-3 5 0v10l3-1c3-1 6 1 6 4v6c0 7-5 12-12 12h-3c-4 0-7-2-9-5z" fill="url(#pg-w)" ${st()}/>`
    + `<ellipse cx="47" cy="17" rx="8" ry="10" fill="url(#pg-p)" ${st()}/>`
    + `<circle cx="44" cy="15" r="1.5" fill="${OUT}"/><circle cx="50" cy="15" r="1.5" fill="${OUT}"/><path d="M44 21c2 1.5 4 1.5 6 0" fill="none" ${st('stroke-width="2.2"')}/>`
    + `<ellipse cx="45" cy="10" rx="3" ry="1.6" fill="#fff" opacity=".8"/>`
    + `<path d="M28 12l6 2M26 20l5-1M33 6l4 4" fill="none" ${st('stroke-width="2.6"')}/>`),
  jump: svg(`<path d="M32 7l20 22H41v18H23V29H12z" fill="url(#pg-w)" ${st()}/>`
    + `<ellipse cx="30" cy="19" rx="5" ry="2.4" fill="#fff" opacity=".85"/>`
    + `<path d="M17 56h30" fill="none" ${st('stroke-width="4"')}/>`),
  sprint: svg(`<path d="M37 5L13 36h15l-5 23 25-33H34z" fill="url(#pg-y)" ${st()}/>`
    + `<ellipse cx="30" cy="16" rx="4" ry="2" fill="#fff" opacity=".8"/>`),
  interact: svg(`<rect x="18" y="11" width="7" height="24" rx="3.5" fill="url(#pg-w)" ${st()}/><rect x="27" y="7" width="7" height="28" rx="3.5" fill="url(#pg-w)" ${st()}/><rect x="36" y="9" width="7" height="26" rx="3.5" fill="url(#pg-w)" ${st()}/><rect x="45" y="15" width="7" height="20" rx="3.5" fill="url(#pg-w)" ${st()}/>`
    + `<path d="M18 30h34v8c0 10-7 18-17 18h-2c-6 0-10-3-12-8l-8-11c-2-3 2-7 6-4l-1 0z" fill="url(#pg-w)" ${st()}/>`
    + `<ellipse cx="34" cy="36" rx="8" ry="2.5" fill="#fff" opacity=".8"/>`),
  exit: svg(`<rect x="10" y="9" width="26" height="46" rx="4" fill="url(#pg-w)" ${st()}/><circle cx="30" cy="33" r="2.5" fill="${OUT}"/>`
    + `<path d="M36 32h19M49 24l8 8-8 8" fill="none" ${st('stroke-width="4"')}/>`),
  skate: svg(`<path d="M9 30c3-6 43-6 46 0l0 5c-3 6-43 6-46 0z" fill="url(#pg-b)" ${st()}/>`
    + `<circle cx="21" cy="46" r="5.5" fill="url(#pg-w)" ${st()}/><circle cx="43" cy="46" r="5.5" fill="url(#pg-w)" ${st()}/>`
    + `<path d="M21 40v-4M43 40v-4" fill="none" ${st('stroke-width="2.6"')}/><ellipse cx="24" cy="29" rx="8" ry="1.6" fill="#fff" opacity=".7"/>`),
  walk: svg(`<ellipse cx="23" cy="24" rx="7.5" ry="12" fill="url(#pg-w)" ${st()}/><circle cx="23" cy="42" r="4.5" fill="url(#pg-w)" ${st()}/>`
    + `<ellipse cx="42" cy="34" rx="7.5" ry="12" fill="url(#pg-w)" ${st()}/><circle cx="42" cy="52" r="4.5" fill="url(#pg-w)" ${st()}/>`),
  emote: svg(`<circle cx="32" cy="32" r="22" fill="url(#pg-y)" ${st()}/>`
    + `<circle cx="24" cy="27" r="3.2" fill="${OUT}"/><circle cx="40" cy="27" r="3.2" fill="${OUT}"/>`
    + `<path d="M21 38c6 7 16 7 22 0" fill="none" ${st('stroke-width="3.6"')}/><ellipse cx="24" cy="16" rx="6" ry="2.6" fill="#fff" opacity=".85"/>`),
  bag: svg(`<path d="M24 17v-4c0-5 16-5 16 0v4" fill="none" ${st()}/>`
    + `<rect x="15" y="17" width="34" height="38" rx="11" fill="url(#pg-b)" ${st()}/>`
    + `<path d="M15 30h34" fill="none" ${st('stroke-width="2.6"')}/><rect x="22" y="35" width="20" height="14" rx="5" fill="url(#pg-w)" ${st()}/><ellipse cx="26" cy="23" rx="6" ry="2.4" fill="#fff" opacity=".8"/>`),
};

// Same duotone CompassIcon used by the main park joystick.
export const COMPASS = "<svg viewBox=\"0 0 256 256\" width=\"24\" height=\"24\" fill=\"currentColor\" aria-hidden=\"true\"><path d=\"M128,32a96,96,0,1,0,96,96A96,96,0,0,0,128,32Zm16,112L80,176l32-64,64-32Z\" opacity=\"0.2\"/><path d=\"M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216ZM172.42,72.84l-64,32a8.05,8.05,0,0,0-3.58,3.58l-32,64A8,8,0,0,0,80,184a8.1,8.1,0,0,0,3.58-.84l64-32a8.05,8.05,0,0,0,3.58-3.58l32-64a8,8,0,0,0-10.74-10.74ZM138,138,97.89,158.11,118,118l40.15-20.07Z\"/></svg>";
export {DEFS, ICONS};
