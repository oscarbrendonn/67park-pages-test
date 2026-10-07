import {createNaturalAudioBank,FOLEY_CLIPS} from './natural-audio.js?v=natural-audio-1';
import {createVehicleAudio} from './vehicle-audio.js?v=five-gears-1';
import {createCowVoice} from './cow-voice.js?v=cow-release-1';
import {createPunchRecordings} from './punch-recordings.js';
import {CHARACTER_FEEDBACK,feedbackBase} from '../character-feedback.js';
import {createInteractionAudioBank,INTERACTION_CLIPS} from './interaction-audio.js?v=interaction-foley-1';
import {createWorldAudioBank,WORLD_CLIPS} from './world-audio.js';
import {createFountainAudioBank,FOUNTAIN_CLIPS} from './fountain-audio.js';
import {createSoftFeedbackBank,SOFT_CLIPS} from './soft-feedback-audio.js';

// One audio graph; bounded voices; no animation-loop ownership.
export function createPartyAudio({settings, saveSettings, gameMuted, host = window}) {
  let ctx, master, compressor, noise, resuming, hornVoice, hornWanted = false, blocked = false;
  const voices = new Set(), last = new Map(), counts = {};
  const pendingEffects=new Map();
  const recordedEffects=new Set(['jump','double','land','skate-ollie','skate-flip','skate-land','horn']);
  const recordings=createNaturalAudioBank({host,onReady:soundHeldHorn});
  const interactions=createInteractionAudioBank({host});
  const worldAudio=createWorldAudioBank({host});
  const fountainAudio=createFountainAudioBank({host});
  const softAudio=createSoftFeedbackBank({host});
  let fountainVoice=null,footVariant=0;
  const interactionEffects=new Set(['throw','swing','hit','water-splash','pet-bark','pet-happy','pet-purr','pet-toy','toy-bounce']);
  // Warm only the 97KB file while the map prepares. No AudioContext, decoding,
  // autoplay or loading-screen dependency; muted entry allocates none of it.
  if(!host.document.hidden&&!gameMuted()&&settings.sfx>0)recordings.preload();
  const limits = {step: 90, jump: 140, double: 140, land: 100, 'character-jump':110, 'character-land':120, 'skate-ollie':110, 'skate-flip':140, 'skate-land':100, horn:120, swing: 150, hit: 100, pad: 250, grab: 150, throw: 150, click: 60, stars: 350, note:80, bell:1800, portal:500, 'water-splash':450, 'vehicle-start':500, 'vehicle-stop':250, 'vehicle-brake':300, 'ui-confirm':120, 'pet-call':240, 'pet-purr':260, 'pet-happy':220, 'pet-bark':500, 'pet-fetch':450, 'pet-pounce':180, 'pet-paw':160, 'pet-pickup':260, 'pet-drop':240, 'pet-roll':220, 'punch-cat':600, 'punch-gorilla':600, 'punch-frog':600};
  const audible = () => ctx?.state === 'running' && !host.document.hidden && !blocked && !gameMuted() && settings.sfx > 0;
  const cowVoice=createCowVoice({host,getContext:()=>ctx,getOutput:()=>master,audible,voices,onPlay:()=>{counts['punch-cow']=(counts['punch-cow']||0)+1;}});
  const punchRecordings=createPunchRecordings({host,getContext:()=>ctx,getOutput:()=>master,audible,voices,onPlay:base=>{const key=CHARACTER_FEEDBACK[base].sound;counts[key]=(counts[key]||0)+1;}});
  let lastPunch=-Infinity;
  function selectedBase(base){
    if(feedbackBase(base))return base;
    const current=host.document.documentElement?.dataset.gameplayAvatarBase;
    if(feedbackBase(current))return current;
    try{return feedbackBase(JSON.parse(host.localStorage?.getItem('67park-feel-lab.character.v3')||'null')?.base);}catch{return null;}
  }
  if(!host.document.hidden&&!gameMuted()&&settings.sfx>0)punchRecordings.preload(selectedBase());
  function cowSelected(){
    if(host.document.documentElement?.dataset.gameplayAvatarBase==='cow67')return true;
    try{return JSON.parse(host.localStorage?.getItem('67park-feel-lab.character.v3')||'null')?.base==='cow67';}catch{return false;}
  }
  if(!host.document.hidden&&!gameMuted()&&settings.sfx>0&&cowSelected())cowVoice.preload();
  let vehicleFocused=true, vehicleBlurTimer=null;
  const schedule=host.setTimeout?.bind(host)||setTimeout,cancel=host.clearTimeout?.bind(host)||clearTimeout;
  const clearVehicleBlur=()=>{if(vehicleBlurTimer!==null){cancel(vehicleBlurTimer);vehicleBlurTimer=null;}};
  const vehicleEnabled=()=>!host.document.hidden&&!blocked&&!gameMuted()&&settings.sfx>0&&vehicleFocused;
  const vehicle=createVehicleAudio({host,getContext:()=>ctx,getOutput:()=>master,audible:()=>audible()&&vehicleFocused,onCue:name=>{counts[name]=(counts[name]||0)+1;}});
  const volume = () => {
    if (ctx && master) master.gain.setTargetAtTime(audible() ? Math.min(1, Math.max(0, Number(settings.sfx) || 0)) * 0.65 : 0, ctx.currentTime, 0.025);
  };
  function ensure(gesture = false) {
    try {
      if (!ctx) {
        const AC = host.AudioContext || host.webkitAudioContext;
        if (!AC) return null;
        ctx = new AC({latencyHint: 'interactive'});
        master = ctx.createGain(); compressor = ctx.createDynamicsCompressor();
        compressor.threshold.value = -16; compressor.knee.value = 16;
        compressor.ratio.value = 5; compressor.attack.value = 0.003; compressor.release.value = 0.12;
        master.connect(compressor); compressor.connect(ctx.destination);
        noise = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
        const data = noise.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
        ctx.addEventListener?.('statechange', () => {
          if (ctx.state === 'running') { volume(); soundHeldHorn(); }
          else if (hornVoice || ctx.state === 'closed' || ctx.state === 'interrupted') stopHorn();
        });
      }
      // iOS can leave a pointerdown resume pending until a qualifying touchend.
      // That old promise must not suppress resume() INSIDE the next gesture.
      // Ordinary simulation calls still coalesce; never allocate a second graph.
      if ((ctx.state === 'suspended' || ctx.state === 'interrupted') && (!resuming || gesture)) {
        const pending = ctx.resume().then(volume).catch(() => {}).finally(() => { if (resuming === pending) resuming = null; });
        resuming = pending;
      }
      volume();
      // Load/decode once in the existing gesture-unlocked graph; never block entry.
      recordings.load(ctx);
      interactions.load(ctx);
      worldAudio.load(ctx);
      fountainAudio.load(ctx);
      softAudio.load(ctx);
      if(cowSelected())cowVoice.load();
      punchRecordings.load(selectedBase());
      return ctx;
    } catch { return null; } // Audio failure must never disable gameplay or the party pack.
  }
  function stopHorn() {
    hornWanted = false;
    pendingEffects.delete('horn');
    const v = hornVoice; hornVoice = null;
    if (!v) return;
    try {
      // Preserve the instantaneous attack level on a very quick tap. A short
      // release removes the click without imposing an artificial hold limit.
      const t = ctx.currentTime;
      const level = Math.min(.2,.2*Math.max(0,t-v.started)/.012);
      v.envelope.gain.cancelScheduledValues(t);
      if (t < v.started+.012) v.envelope.gain.linearRampToValueAtTime(level,t);
      else v.envelope.gain.setValueAtTime(level,t);
      v.envelope.gain.linearRampToValueAtTime(0,t+.04);
      v.source.stop(t+.045);
    } catch { try { v.source.stop(); } catch {} }
  }
  function soundHeldHorn() {
    if (!hornWanted || hornVoice || !audible()) return;
    const v=recording('horn',{loop:true,gain:.2});
    if(!v)return;
    hornVoice=v;counts.horn=(counts.horn||0)+1;
  }
  function startHorn() {
    if (hornWanted || host.document.hidden || blocked || gameMuted() || !(settings.sfx > 0)) return;
    hornWanted = true;
    if (!ensure()) { hornWanted = false; return; }
    if (audible()) soundHeldHorn();
    else resuming?.then(soundHeldHorn); // release before iOS unlock cancels this start
  }
  function recording(name,{gain=.4,pitch=1,loop=false,duration,bank=recordings,clips=FOLEY_CLIPS}={}){
    if(!audible()||!bank.buffer||voices.size>=24)return null;
    const clip=clips[name];if(!clip)return null;
    let source,envelope;
    try{
      source=ctx.createBufferSource();envelope=ctx.createGain();
      const start=ctx.currentTime,v={source,envelope,started:start};
      source.buffer=bank.buffer;source.playbackRate.value=pitch;
      source.loop=loop;
      if(loop){source.loopStart=clip.offset+clip.loopStart;source.loopEnd=clip.offset+clip.loopEnd;}
      envelope.gain.setValueAtTime(0,start);
      envelope.gain.linearRampToValueAtTime(gain,start+(loop?.012:.002));
      const length=duration??(loop?null:clip.duration/pitch);
      if(length!==null){
        envelope.gain.setValueAtTime(gain,start+Math.max(.012,length-.025));
        envelope.gain.linearRampToValueAtTime(0,start+length);
      }
      source.connect(envelope);envelope.connect(master);voices.add(source);
      source.onended=()=>{voices.delete(source);source.disconnect();envelope.disconnect();if(hornVoice===v)hornVoice=null;if(fountainVoice===v)fountainVoice=null;};
      if(loop)source.start(start,clip.offset);
      else source.start(start,clip.offset,clip.duration);
      if(length!==null)source.stop(start+length+.005);
      return v;
    }catch{
      voices.delete(source);
      try{source?.stop();source?.disconnect();envelope?.disconnect();}catch{}
      return null;
    }
  }
  const interaction=(name,options)=>!!recording(name,{...options,bank:interactions,clips:INTERACTION_CLIPS});
  const worldRecording=(name,options)=>recording(name,{...options,bank:worldAudio,clips:WORLD_CLIPS});
  function stopFountain(){const v=fountainVoice;fountainVoice=null;if(v)try{v.source.stop();}catch{}}
  function updateFountain(distance=Infinity){
    if(!audible()||!Number.isFinite(distance)||distance>=20){stopFountain();return;}
    if(!worldAudio.buffer){void worldAudio.load(ctx);return;}
    const gain=.16*Math.pow(Math.max(0,1-Math.max(0,distance-2)/18),2);
    if(!fountainVoice){fountainVoice=worldRecording('fountain',{loop:true,gain:0});}
    fountainVoice?.envelope.gain.setTargetAtTime(gain,ctx.currentTime,.18);
  }
  function voice({noiseBand, type = 'sine', from = 400, to = 200, duration = 0.09, gain = 0.15, delay = 0, pitch = 1}) {
    if (!audible() || voices.size >= 24) return;
    const start = ctx.currentTime + delay, end = start + duration;
    const source = noiseBand ? ctx.createBufferSource() : ctx.createOscillator();
    const envelope = ctx.createGain(), filter = noiseBand ? ctx.createBiquadFilter() : null;
    if (noiseBand) {
      source.buffer = noise; source.playbackRate.value = pitch;
      filter.type = noiseBand; filter.frequency.value = from; filter.Q.value = 0.7;
      source.connect(filter); filter.connect(envelope);
    } else {
      source.type = type; source.frequency.setValueAtTime(from * pitch, start);
      source.frequency.exponentialRampToValueAtTime(Math.max(30, to * pitch), end);
      source.connect(envelope);
    }
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.exponentialRampToValueAtTime(Math.max(0.001, gain), start + Math.min(0.008, duration / 4));
    envelope.gain.exponentialRampToValueAtTime(0.0001, end);
    envelope.connect(master); voices.add(source);
    source.onended = () => { voices.delete(source); source.disconnect(); envelope.disconnect(); filter?.disconnect(); };
    source.start(start); source.stop(end + 0.01);
  }
  // Same unlocked graph as horn/movement; real loops, no oscillator engine.
  function stopVehicleEngine(shutdown=false) { vehicle.stop({shutdown}); }
  function updateVehicleEngine(speed=0,options={}) {
    if (!vehicleEnabled() || ctx?.state==='closed') { stopVehicleEngine(); return; }
    // Safari can briefly suspend/interrupt its audio session during a gesture.
    // Its clock and buffer sources pause together: keep those loops alive so
    // resume continues the same engine instead of repeatedly tearing it down.
    if (!audible()) return;
    vehicle.update(speed,options);
  }
  // Short stylized animal calls. One oscillator + filter + envelope per call;
  // no downloaded recordings, speech API, extra context or recurring timer.
  function vocal({notes,formants,duration,gain,pulses=1}) {
    if(!audible()||voices.size>=24)return;
    const source=ctx.createOscillator(),filter=ctx.createBiquadFilter(),envelope=ctx.createGain(),start=ctx.currentTime;
    source.type='sawtooth';filter.type='lowpass';filter.Q.value=2.4;
    for(const [parameter,points] of [[source.frequency,notes],[filter.frequency,formants]]){
      parameter.setValueAtTime(points[0][1],start);
      for(const [at,value] of points.slice(1))parameter.exponentialRampToValueAtTime(value,start+at);
    }
    for(let i=0;i<pulses;i++){
      const at=start+i*duration/pulses,end=at+duration/pulses;
      envelope.gain.setValueAtTime(.0001,at);
      envelope.gain.exponentialRampToValueAtTime(gain,at+.012);
      envelope.gain.exponentialRampToValueAtTime(.0001,end);
    }
    source.connect(filter);filter.connect(envelope);envelope.connect(master);voices.add(source);
    source.onended=()=>{voices.delete(source);source.disconnect();filter.disconnect();envelope.disconnect();};
    source.start(start);source.stop(start+duration+.01);
  }
  const recipes = {
    // Explicitly rejected by the user. Keep legacy callers harmless.
    'swing-creak'(){return false;},
    'punch-cat'(){vocal({notes:[[0,580],[.055,760],[.14,590],[.3,340]],formants:[[0,900],[.09,1900],[.3,600]],duration:.3,gain:.075});},
    'punch-gorilla'(){vocal({notes:[[0,110],[.05,145],[.2,62]],formants:[[0,430],[.05,650],[.2,190]],duration:.2,gain:.1,pulses:2});},
    'punch-frog'(){vocal({notes:[[0,220],[.06,270],[.24,130]],formants:[[0,850],[.08,1200],[.24,420]],duration:.24,gain:.075,pulses:3});},
    'punch-ninja'(){voice({noiseBand:'highpass',from:2800,duration:.14,gain:.12});voice({from:620,to:210,duration:.11,gain:.035});},
    'punch-shark'(){voice({noiseBand:'lowpass',from:650,duration:.28,gain:.15});voice({noiseBand:'bandpass',from:1500,duration:.1,delay:.1,gain:.07});},
    'punch-cyclops'(){vocal({notes:[[0,145],[.07,210],[.3,85]],formants:[[0,450],[.1,1000],[.3,350]],duration:.3,gain:.15});},
    'punch-skeleton'(){[0,.055,.11].forEach((delay,i)=>voice({type:'triangle',from:920+i*310,to:450+i*130,duration:.045,delay,gain:.10}));},
    'punch-zombie'(){vocal({notes:[[0,92],[.13,72],[.34,58]],formants:[[0,550],[.12,390],[.34,230]],duration:.34,gain:.14,pulses:2});},
    'punch-chick'(){[0,.1].forEach(delay=>voice({from:2100,to:2900,duration:.08,delay,gain:.08}));},
    'punch-sloth'(){vocal({notes:[[0,190],[.14,160],[.38,115]],formants:[[0,750],[.2,600],[.38,420]],duration:.38,gain:.11});},
    'punch-axolotl'(){[0,.07,.14].forEach((delay,i)=>voice({from:520+i*240,to:240+i*100,duration:.075,delay,gain:.095}));},
    'punch-pig'(){vocal({notes:[[0,210],[.04,135],[.21,95]],formants:[[0,1150],[.06,680],[.21,440]],duration:.21,gain:.16,pulses:2});},
    'pet-purr'(){return interaction('purr',{gain:.24});},
    'pet-happy'(_,p){return interaction('bark',{gain:.12,pitch:1+(p-1)*.3});},
    'pet-bark'(_,p){return interaction('bark',{gain:.22,pitch:1+(p-1)*.3});},
    'pet-toy'(_,p){return interaction('toy',{gain:.14,pitch:1+(p-1)*.3});},
    'toy-bounce'(_,p){return interaction('ball',{gain:.12,pitch:1.14+(p-1)*.3});},
    // Do not turn every pet state transition into an electronic notification.
    // The ball's actual ground contact / bite owns its foley in pet-commands.
    'pet-fetch'(){return false;},
    'pet-pounce'(){return false;},
    'pet-paw'(){return false;},
    'pet-pickup'(){return false;},
    'pet-drop'(){return false;},
    'pet-roll'(){return false;},
    // Same actual horn recording, with a finite release for assistive clicks.
    horn(){return !!recording('horn',{loop:true,duration:.22,gain:.2});},
    bell(){voice({from:660,to:660,duration:.3,gain:.16});voice({from:520,to:520,duration:.45,delay:.22,gain:.13});},
    note(index) {
      const f=[261.63,293.66,329.63,392,440,523.25][index];if(!f)return;
      voice({type:'sine',from:f,to:f,duration:.42,gain:.16});
      voice({type:'sine',from:f*2,to:f*2,duration:.20,gain:.025});
    },
    step(arg, p) {
      const surface=['grass','sand'].includes(arg?.surface)?arg.surface:'stone';
      const left=typeof arg==='boolean'?arg:arg?.left;
      const variant=1+(footVariant++%3);
      return !!worldRecording(surface+(left?'L':'R')+variant,{gain:surface==='grass'?.16:.20,pitch:1+(p-1)*.4});
    },
    jump(_,p){return !!recording('takeoff',{gain:.19,pitch:1+(p-1)*.5});},
    double(_,p){return !!recording('flick',{gain:.085,pitch:1+(p-1)*.5});},
    land(arg,p){
      const hard=typeof arg==='object'?arg?.hard:arg;
      if(arg?.surface==='grass'||arg?.surface==='sand')return !!worldRecording(arg.surface+'L'+(1+footVariant++%3),{gain:hard?.35:.23,pitch:.88+(p-1)*.4});
      return !!recording('landing',{gain:hard?.48:.32,pitch:1+(p-1)*.5});
    },
    // The recordings carry the physical action. These quiet character cues
    // make the jump belong to the selected rig instead of sounding generic.
    'character-jump'(base){
      voice({noiseBand:'bandpass',from:820,duration:.11,gain:.025});
      if(base==='goril')vocal({notes:[[0,118],[.045,150],[.15,92]],formants:[[0,360],[.06,540],[.16,210]],duration:.16,gain:.055});
      else if(base==='frog67')vocal({notes:[[0,300],[.045,410],[.12,230]],formants:[[0,760],[.06,1280],[.15,460]],duration:.16,gain:.05});
      else if(base==='cat67')vocal({notes:[[0,520],[.05,690],[.14,430]],formants:[[0,1100],[.08,1800],[.16,760]],duration:.16,gain:.035});
    },
    'character-land'({hard=false,base}={}){
      const weight=hard?.075:.045;
      voice({noiseBand:'lowpass',from:180,duration:hard?.15:.11,gain:weight});
      voice({type:'triangle',from:115,to:58,duration:hard?.18:.12,delay:.012,gain:weight*.7});
      if(hard&&base==='goril')vocal({notes:[[0,105],[.06,76]],formants:[[0,310],[.14,180]],duration:.14,gain:.045});
      else if(hard&&base==='frog67')vocal({notes:[[0,240],[.05,185]],formants:[[0,680],[.14,390]],duration:.14,gain:.035});
    },
    'skate-ollie'(_,p){return !!recording('ollie',{gain:.36,pitch:1+(p-1)*.5});},
    'skate-flip'(_,p){return !!recording('flick',{gain:.16,pitch:1+(p-1)*.5});},
    'skate-land'(hard,p){return !!recording('skateLanding',{gain:hard?.5:.36,pitch:1+(p-1)*.5});},
    swing(_,p){return interaction('whoosh',{gain:.18,pitch:1+(p-1)*.4});},
    hit(_,p){return interaction('ball',{gain:.26,pitch:.8+(p-1)*.3});},
    pad(_, p) {
      voice({from:160, to:85, duration:0.09, gain:0.21, pitch:p});
      voice({type:'triangle', from:220, to:1150, duration:0.28, delay:0.06, gain:0.16, pitch:p});
      voice({from:750, to:1500, duration:0.18, delay:0.16, gain:0.07, pitch:p});
    },
    grab(_, p) { voice({from:440, to:280, duration:0.10, gain:0.18, pitch:p}); voice({from:660, to:520, duration:0.08, delay:0.04, gain:0.07, pitch:p}); },
    throw(_,p){return interaction('whoosh',{gain:.22,pitch:1+(p-1)*.35});},
    click(_, p) { return !!recording('click',{gain:.45,pitch:p,bank:softAudio,clips:SOFT_CLIPS}); },
    stars(_, p) { [880,1100,1320].forEach((f,i)=>voice({from:f,to:f*1.02,duration:0.15,delay:i*0.08,gain:0.065,pitch:p})); },
    portal() {
      voice({type:'triangle',from:260,to:520,duration:.22,gain:.08});
      voice({type:'sine',from:520,to:1040,duration:.28,delay:.08,gain:.075});
      voice({type:'sine',from:1040,to:1560,duration:.34,delay:.17,gain:.045});
    },
    'fountain-launch'(){return !!recording('launch',{gain:.9,pitch:1,bank:fountainAudio,clips:FOUNTAIN_CLIPS});},
    'fountain-warning'(){return !!recording('launch',{gain:.18,pitch:.8,bank:fountainAudio,clips:FOUNTAIN_CLIPS});},
    'water-splash'(impact=.5,p){const strength=Math.max(0,Math.min(1,Number(impact)||0));return interaction('splash',{gain:.12+strength*.29,pitch:1.06-strength*.1+(p-1)*.3});},
    'ui-confirm'() { return !!recording('ui-confirm',{gain:.5,bank:softAudio,clips:SOFT_CLIPS}); },
    'coin-collect'() { return !!recording('coin-collect',{gain:.6,bank:softAudio,clips:SOFT_CLIPS}); },
    'reward-earned'() { return !!recording('reward-earned',{gain:.55,bank:softAudio,clips:SOFT_CLIPS}); },
    'pet-call'() { voice({type:'triangle',from:520,to:760,duration:.10,gain:.06}); voice({type:'triangle',from:760,to:620,duration:.14,delay:.11,gain:.045}); }
  };
  function play(name, arg) {
    try {
      if(settings.menuSounds===false&&(name==='click'||name==='ui-confirm'))return;
      // First touch can reach the controller a few milliseconds before Safari
      // finishes resume/decode. Preserve that one cue, but never replay it after
      // a slow load, mute, blur or page change. No timer or movement dependency.
      const bank=Object.hasOwn(SOFT_CLIPS,name)?softAudio:name==='step'||name==='land'&&['grass','sand'].includes(arg?.surface)?worldAudio:name.startsWith('fountain-')?fountainAudio:interactionEffects.has(name)?interactions:recordedEffects.has(name)?recordings:null;
      if(ctx&&bank&&!host.document.hidden&&!blocked&&!gameMuted()&&settings.sfx>0&&(!audible()||!bank.buffer)){
        if(pendingEffects.has(name))return;
        const token={at:Date.now()};pendingEffects.set(name,token);
        Promise.all([bank.load(ctx),resuming]).then(([ready])=>{
          if(pendingEffects.get(name)!==token)return;
          pendingEffects.delete(name);
          if(ready&&Date.now()-token.at<=80&&audible())play(name,arg);
        }).catch(()=>{if(pendingEffects.get(name)===token)pendingEffects.delete(name);});
        return;
      }
      if (!audible() || !recipes[name]) return;
      if (name === 'horn' && hornWanted) return;
      const now = ctx.currentTime * 1000;
      const rateKey=name==='note'?'note:'+Math.max(0,Math.min(5,Math.trunc(Number(arg)||0))):name==='pet-happy'?'pet-bark':name;
      const interval=name==='pet-purr'?1800:name==='pet-toy'?600:limits[rateKey]??80;
      if (now - (last.get(rateKey) ?? -Infinity) < interval) return;
      volume();
      if(recipes[name](arg, 0.96 + Math.random() * 0.08)===false)return;
      last.set(rateKey, now);
      counts[name] = (counts[name] || 0) + 1;
    } catch {} // Sound synthesis never escapes into the simulation.
  }
  function quiet() {
    volume();
    if (host.document.hidden || blocked || gameMuted() || !(settings.sfx > 0)) {
      // Cancelling a pending blur must retain its unfocused state; otherwise
      // a later volume/storage change could restart the engine in background.
      if(vehicleBlurTimer!==null){vehicleFocused=false;clearVehicleBlur();}
      stopFountain();stopHorn();stopVehicleEngine();cowVoice.cancel();punchRecordings.cancel();pendingEffects.clear();
    }
    if (host.document.hidden || blocked || gameMuted()) for (const source of voices) { try { source.stop(); } catch {} }
  }
  // Board mode bypasses the walking controller used by __partyVisual. Listen
  // to its accepted trick events instead; never add polling or another graph.
  host.addEventListener('candy:skate-trick', event => {
    if (event.detail?.trick === 'ollie') play('skate-ollie');
    else if (event.detail?.trick === 'kickflip') play('skate-flip');
  });
  host.addEventListener('candy:skate-land', event => {
    const p = event.detail;
    if (p && [p.x, p.y, p.z].every(Number.isFinite)) play('skate-land', p.hard === true);
  });
  // Muted gameplay must not pay a first-input AudioContext initialization.
  // A later audible gesture still unlocks the graph normally.
  const gesture = () => {
    if (!host.document.hidden && !blocked && !gameMuted() && settings.sfx > 0) ensure(true);
    quiet();
  };
  for (const event of ['pointerdown','pointerup','touchend','keydown']) host.addEventListener(event, gesture, {passive:true,capture:true});
  host.document.addEventListener('visibilitychange', quiet);
  host.addEventListener('pagehide', () => { blocked = true; quiet(); });
  host.addEventListener('pageshow', () => { blocked = false; clearVehicleBlur();vehicleFocused=true;volume(); });
  host.addEventListener('storage', quiet);
  host.addEventListener('park:settings-change',quiet);
  host.addEventListener('park:audio-mute-change',quiet);
  host.addEventListener('blur',()=>{
    stopHorn();cowVoice.cancel();punchRecordings.cancel();pendingEffects.clear();clearVehicleBlur();
    // Release held input immediately, but do not turn an 80ms focus flicker
    // during camera/UI input into a stopped/restarted idle engine. Hiding the
    // page, leaving, muting, or zero volume still stops it immediately above.
    vehicleBlurTimer=schedule(()=>{vehicleBlurTimer=null;vehicleFocused=false;stopVehicleEngine();},250);
  });
  host.addEventListener('focus',()=>{clearVehicleBlur();vehicleFocused=true;});
  return {
    ensure, play, startHorn, stopHorn, updateVehicleEngine, stopVehicleEngine, updateFountain,
    worldReady:()=>ctx?worldAudio.load(ctx):Promise.resolve(false),
    fountainReady:()=>ctx?fountainAudio.load(ctx):Promise.resolve(false),
    ready:()=>ctx?recordings.load(ctx):Promise.resolve(false),
    interactionReady:()=>ctx?interactions.load(ctx):Promise.resolve(false),
    vehicleReady:()=>ctx?vehicle.ready():Promise.resolve(false),
    cowReady:()=>ctx?cowVoice.load():Promise.resolve(false),
    punchReady:base=>punchRecordings.load(selectedBase(base)),
    punch(base){
      if(!audible()||ctx.currentTime-lastPunch<.60)return;
      lastPunch=ctx.currentTime;base=selectedBase(base);play('swing');
      if(base==='cow67'){cowVoice.play();return;}
      if(punchRecordings.supported(base)){punchRecordings.play(base);return;}
      const sound=CHARACTER_FEEDBACK[base]?.sound;if(sound)play(sound);
    },
    state: () => ctx?.state || 'none',
    setVolume(value) { settings.sfx = Math.min(1, Math.max(0, Number(value) || 0)); quiet(); saveSettings(); },
    stats: () => ({voices:voices.size, maxVoices:24, counts:{...counts}, cowVoice:cowVoice.stats(), hornActive:!!hornVoice, engineActive:vehicle.stats().active, vehicle:vehicle.stats(), state:ctx?.state || 'none',recordings:recordings.stats(),interactions:interactions.stats()})
  };
}
