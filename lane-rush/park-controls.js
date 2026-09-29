import {DEFS, ICONS, COMPASS} from '../app/party/action-icons.js';

// Share the park's art, not its world/vehicle/pet runtime or event handlers.
export function installParkControls(root = document) {
  const defs = root.createElement('div');
  defs.id = 'party-defs';
  defs.innerHTML = DEFS;
  root.body.prepend(defs);
  root.body.classList.add('lane-park-ui');
  const action = (id, icon, color, label) => {
    const button = root.getElementById(id);
    button.className = `park-action ${color}`;
    button.type = 'button';
    button.innerHTML = ICONS[icon] + `<span>${label}</span>`;
    button.setAttribute('aria-label', label);
    return button;
  };
  action('jump', 'jump', 'pink primary', 'Jump');
  action('sprint', 'sprint', 'cream', 'Sprint');
  const grab = action('grab', 'interact', 'mint', 'Grab');
  const punch = root.getElementById('punch');
  if (punch) {
    punch.className = 'party-eggy party-eggy-pink';
    punch.innerHTML = ICONS.punch + '<span>Punch</span>';
    root.querySelector('.touch').append(punch);
  }
  root.querySelector('.actions').classList.add('park-actions');
  const stick = root.getElementById('stick');
  stick.className = 'park-stick';
  stick.setAttribute('aria-label', 'Movement joystick');
  const rings = root.createElement('div');
  rings.className = 'park-stick-rings';
  stick.prepend(rings);
  const knob = root.getElementById('knob');
  knob.className = 'park-stick-knob';
  knob.innerHTML = COMPASS;
  let carrying = false;
  return {
    setCarrying(value) {
      if (carrying === value) return;
      carrying = value;
      grab.classList.toggle('blue', value);
      grab.classList.toggle('mint', !value);
      grab.innerHTML = ICONS[value ? 'throw' : 'interact'] + `<span>${value ? 'Throw' : 'Grab'}</span>`;
      grab.setAttribute('aria-label', value ? 'Throw' : 'Grab');
    },
  };
}
