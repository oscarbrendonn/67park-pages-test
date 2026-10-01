import {DEFS, ICONS, COMPASS} from './party/action-icons.js';

// Small vector pedals use the existing palette; no texture or model allocation.
const pedal = (mark, fill) => `<svg class="party-icon" viewBox="0 0 64 64" aria-hidden="true"><rect x="17" y="7" width="30" height="48" rx="9" fill="url(#${fill})" stroke="#3d2b4a" stroke-width="3"/><path d="${mark}" fill="none" stroke="#3d2b4a" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const vehicleArt = {
  gas: pedal('M32 43V20M24 28l8-8 8 8','pg-m'),
  reverse: pedal('M32 19v24M24 35l8 8 8-8','pg-b'),
  brake: pedal('M25 21v20M39 21v20','pg-p'),
};
const vehicleLabels = {Accelerate:['gas','Gas'],Reverse:['reverse','Reverse'],Brake:['brake','Brake']};

// Presentation only: retain the game's buttons, listeners and pointer ownership.
export function installParkActionUI(doc = document) {
  const selector = '.park-action,#btn-jump,#btn-sprint,#btn-grab';
  const utilities = '#party-settings-btn,#park-home-button';
  const observedSelector = selector + ',' + utilities + ',.park-toolbar';
  let settingsButton = null;
  const actions = {emote:'emote',bag:'bag',skate:'skate',walk:'walk',interact:'interact',exit:'exit',sprint:'sprint',jump:'jump'};
  const specific = {'btn-jump':['jump','Jump'],'btn-sprint':['sprint','Sprint'],'btn-grab':['punch','Dash']};
  doc.body.classList.add('park-unified-ui');
  if (!doc.getElementById('party-defs')) {
    const defs = doc.createElement('div'); defs.id = 'party-defs'; defs.innerHTML = DEFS; doc.body.prepend(defs);
  }
  const decorate = () => {
    // These controls arrive independently. Keep the original nodes/listeners,
    // but let flex layout reserve space for Homes invites and notch insets.
    settingsButton = doc.getElementById('party-settings-btn') || settingsButton;
    const toolbar = doc.querySelector('.park-toolbar');
    if(settingsButton && !settingsButton.querySelector('.park-settings-icon')){
      settingsButton.innerHTML='<svg class="park-settings-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9.4 3-.6 2.2-1.6.9L5 5.5 2.5 9.8l1.6 1.6v1.8L2.5 15 5 19.3l2.2-.6 1.6.9.6 2.2h5.2l.6-2.2 1.6-.9 2.2.6 2.5-4.3-1.6-1.8v-1.8l1.6-1.6L19 5.5l-2.2.6-1.6-.9-.6-2.2Z" transform="translate(0 -1) scale(1 .98)"/><circle cx="12" cy="11.5" r="3.2"/></svg><span>Settings</span>';
      settingsButton.title='Settings';
    }
    if(toolbar && settingsButton && settingsButton.parentElement!==toolbar){
      toolbar.insertBefore(settingsButton,toolbar.querySelector('[aria-label="Return to lobby"]'));
    }
    // React may unmount the toolbar when opening Profile. Retain the original
    // settings node and its handlers, and restore it when the toolbar returns.
    const buttons = [!toolbar && settingsButton,doc.getElementById('park-home-button')].filter(Boolean);
    if (buttons.length) {
      let dock = doc.getElementById('park-utilities');
      if (!dock) {
        dock = doc.createElement('div'); dock.id = 'park-utilities';
        dock.setAttribute('role','group'); dock.setAttribute('aria-label','Park options');
        doc.body.append(dock);
      }
      buttons.forEach((button,index) => {
        if (dock.children[index] !== button) dock.insertBefore(button,dock.children[index] || null);
      });
    }
    for (const button of doc.querySelectorAll(selector)) {
      const label = button.querySelector(':scope > span')?.textContent || button.getAttribute('aria-label') || '';
      const vehicle = vehicleLabels[button.getAttribute('aria-label')];
      const action = vehicle || specific[button.id] || [actions[label.trim().toLowerCase().split(/\s/)[0]],label];
      const [icon, title] = action;
      const artwork = vehicleArt[icon] || ICONS[icon];
      if (!artwork) continue;
      button.classList.add('park-action');
      // React can rebuild the children while keeping the same button/dataset.
      if (button.dataset.partyIcon !== icon || !button.querySelector('.party-icon')) {
        button.querySelector('.party-icon')?.remove();
        button.insertAdjacentHTML('beforeend', artwork); button.dataset.partyIcon = icon;
      }
      const caption = button.querySelector(':scope > span');
      if (vehicle && caption && caption.textContent !== title) caption.textContent = title;
      if (specific[button.id] && !button.querySelector(':scope > span')) {
        for (const node of [...button.childNodes]) if (node.nodeType === 3) node.remove();
        const text = doc.createElement('span'); text.textContent = title; button.append(text);
      }
    }
    const knob = doc.getElementById('stick-knob');
    if (knob && !knob.querySelector('svg')) knob.innerHTML = COMPASS;
  };
  decorate();
  // Run before the next paint on mount/label changes, not a 400 ms polling delay.
  const observer = new MutationObserver(records => {
    if (records.some(record => {
      const target = record.target.nodeType === 1 ? record.target : record.target.parentElement;
      return target?.closest?.(observedSelector) || [...record.addedNodes,...record.removedNodes].some(node => node.nodeType === 1 && (node.matches(observedSelector) || node.querySelector(observedSelector)));
    })) decorate();
  });
  const observe = () => observer.observe(doc.body,{childList:true,subtree:true,characterData:true});
  observe();
  const win = doc.defaultView;
  win.addEventListener('pagehide',() => observer.disconnect());
  win.addEventListener('pageshow',() => { decorate(); observe(); });
  return () => observer.disconnect();
}

if (typeof document !== 'undefined') installParkActionUI();
