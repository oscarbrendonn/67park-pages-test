import {createNaturalAudioBank,FOLEY_CLIPS} from './natural-audio.js?v=natural-audio-1';

// One audio graph; bounded voices; no animation-loop ownership.
export function createPartyAudio({settings, saveSettings, gameMuted, host = window}) {
  let ctx, master, compressor, noise, resuming, hornVoice, hornWanted = false, blocked = false;
  const voices = new Set(), last = new Map(), counts = {};
  const pendingEffects=new Map();
  const recordedEffects=new Set(['jump','double','land','skate-ollie','skate-flip','skate-land','horn']);
  const recordings=createNaturalAudioBank({host,onReady:soundHeldHorn});
  // Warm only the 97KB file while the map prepares. No AudioContext, decoding,
  // autoplay or loading-screen dependency; muted entry allocates none of it.
  if(!host.document.hidden&&!gameMuted()&&settings.sfx>0)recordings.preload();
  const limits = {step: 90, jump: 140, double: 140, land: 100, 'skate-ollie':110, 'skate-flip':140, 'skate-land':100, horn:120, swing: 150, hit: 100, pad: 250, grab: 150, throw: 150, click: 60, stars: 350, note:80, bell:1800, portal:500, 'water-splash':450, 'vehicle-start':500, 'vehicle-stop':250, 'ui-confirm':120, 'pet-call':240, 'punch-cat':600, 'punch-gorilla':600, 'punch-frog':600};
  const audible = () => ctx?.state === 'running' && !host.document.hidden && !blocked && !gameMuted() && settings.sfx > 0;
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
  function recording(name,{gain=.4,pitch=1,loop=false,duration}={}){
    if(!audible()||!recordings.buffer||voices.size>=24)return null;
    const clip=FOLEY_CLIPS[name];if(!clip)return null;
    let source,envelope;
    try{
      source=ctx.createBufferSource();envelope=ctx.createGain();
      const start=ctx.currentTime,v={source,envelope,started:start};
      source.buffer=recordings.buffer;source.playbackRate.value=pitch;
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
      source.onended=()=>{voices.delete(source);source.disconnect();envelope.disconnect();if(hornVoice===v)hornVoice=null;};
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
    'punch-cat'(){vocal({notes:[[0,580],[.055,760],[.14,590],[.3,340]],formants:[[0,900],[.09,1900],[.3,600]],duration:.3,gain:.075});},
    'punch-gorilla'(){vocal({notes:[[0,110],[.05,145],[.2,62]],formants:[[0,430],[.05,650],[.2,190]],duration:.2,gain:.1,pulses:2});},
    'punch-frog'(){vocal({notes:[[0,220],[.06,270],[.24,130]],formants:[[0,850],[.08,1200],[.24,420]],duration:.24,gain:.075,pulses:3});},
    'pet-purr'(){for(let i=0;i<6;i++)voice({type:'triangle',from:64,to:58,duration:.13,delay:i*.09,gain:.045});},
    'pet-happy'(){voice({type:'triangle',from:360,to:440,duration:.09,gain:.055});voice({from:430,to:370,duration:.11,delay:.10,gain:.035});},
    // Same actual horn recording, with a finite release for assistive clicks.
    horn(){return !!recording('horn',{loop:true,duration:.22,gain:.2});},
    bell(){voice({from:660,to:660,duration:.3,gain:.16});voice({from:520,to:520,duration:.45,delay:.22,gain:.13});},
    note(index) {
      const f=[261.63,293.66,329.63,392,440,523.25][index];if(!f)return;
      voice({type:'sine',from:f,to:f,duration:.42,gain:.16});
      voice({type:'sine',from:f*2,to:f*2,duration:.20,gain:.025});
    },
    step(left, p) {
      voice({noiseBand:'lowpass', from:left ? 750 : 640, duration:0.065, gain:0.13, pitch:p});
      voice({from:left ? 145 : 130, to:65, duration:0.055, gain:0.08, pitch:p});
    },
    jump(_,p){return !!recording('takeoff',{gain:.19,pitch:1+(p-1)*.5});},
    double(_,p){return !!recording('flick',{gain:.085,pitch:1+(p-1)*.5});},
    land(hard,p){return !!recording('landing',{gain:hard?.48:.32,pitch:1+(p-1)*.5});},
    'skate-ollie'(_,p){return !!recording('ollie',{gain:.36,pitch:1+(p-1)*.5});},
    'skate-flip'(_,p){return !!recording('flick',{gain:.16,pitch:1+(p-1)*.5});},
    'skate-land'(hard,p){return !!recording('skateLanding',{gain:hard?.5:.36,pitch:1+(p-1)*.5});},
    swing(_, p) { voice({noiseBand:'bandpass', from:1100, duration:0.15, gain:0.17, pitch:p}); },
    hit(_, p) {
      voice({noiseBand:'lowpass', from:950, duration:0.09, gain:0.28, pitch:p});
      voice({type:'triangle', from:230, to:65, duration:0.12, gain:0.25, pitch:p});
      voice({from:620, to:280, duration:0.07, gain:0.08, pitch:p});
    },
    pad(_, p) {
      voice({from:160, to:85, duration:0.09, gain:0.21, pitch:p});
      voice({type:'triangle', from:220, to:1150, duration:0.28, delay:0.06, gain:0.16, pitch:p});
      voice({from:750, to:1500, duration:0.18, delay:0.16, gain:0.07, pitch:p});
    },
    grab(_, p) { voice({from:440, to:280, duration:0.10, gain:0.18, pitch:p}); voice({from:660, to:520, duration:0.08, delay:0.04, gain:0.07, pitch:p}); },
    // A rounded toy-projectile whoosh; avoid the sharp "tif" transient that
    // previously made every throw sound like a UI click.
    throw(_, p) { voice({noiseBand:'bandpass', from:720, duration:0.2, gain:0.085, pitch:p}); voice({type:'triangle', from:260, to:105, duration:0.16, gain:0.11, pitch:p}); voice({type:'sine', from:420, to:610, duration:0.12, delay:0.035, gain:0.035, pitch:p}); },
    click(_, p) { voice({from:750, to:570, duration:0.045, gain:0.10, pitch:p}); },
    stars(_, p) { [880,1100,1320].forEach((f,i)=>voice({from:f,to:f*1.02,duration:0.15,delay:i*0.08,gain:0.065,pitch:p})); },
    portal() {
      voice({type:'triangle',from:260,to:520,duration:.22,gain:.08});
      voice({type:'sine',from:520,to:1040,duration:.28,delay:.08,gain:.075});
      voice({type:'sine',from:1040,to:1560,duration:.34,delay:.17,gain:.045});
    },
    'water-splash'() {
      voice({noiseBand:'lowpass',from:900,duration:.22,gain:.24});
      voice({type:'sine',from:420,to:150,duration:.28,delay:.015,gain:.12});
      voice({type:'triangle',from:780,to:390,duration:.2,delay:.08,gain:.055});
    },
    'vehicle-start'() {
      voice({type:'sawtooth',from:62,to:118,duration:.28,gain:.08});
      voice({type:'triangle',from:124,to:236,duration:.22,delay:.06,gain:.035});
    },
    'vehicle-stop'() { voice({type:'triangle',from:180,to:72,duration:.16,gain:.08}); },
    'ui-confirm'() { voice({type:'sine',from:440,to:660,duration:.12,gain:.07}); voice({type:'sine',from:660,to:880,duration:.16,delay:.09,gain:.055}); },
    'pet-call'() { voice({type:'triangle',from:520,to:760,duration:.10,gain:.06}); voice({type:'triangle',from:760,to:620,duration:.14,delay:.11,gain:.045}); }
  };
  function play(name, arg) {
    try {
      // First touch can reach the controller a few milliseconds before Safari
      // finishes resume/decode. Preserve that one cue, but never replay it after
      // a slow load, mute, blur or page change. No timer or movement dependency.
      if(ctx&&recordedEffects.has(name)&&!host.document.hidden&&!blocked&&!gameMuted()&&settings.sfx>0&&(!audible()||!recordings.buffer)){
        if(pendingEffects.has(name))return;
        const token={at:Date.now()};pendingEffects.set(name,token);
        Promise.all([recordings.load(ctx),resuming]).then(([ready])=>{
          if(pendingEffects.get(name)!==token)return;
          pendingEffects.delete(name);
          if(ready&&Date.now()-token.at<=80&&audible())play(name,arg);
        }).catch(()=>{if(pendingEffects.get(name)===token)pendingEffects.delete(name);});
        return;
      }
      if (!audible() || !recipes[name]) return;
      if (name === 'horn' && hornWanted) return;
      const now = ctx.currentTime * 1000;
      const rateKey=name==='note'?'note:'+Math.max(0,Math.min(5,Math.trunc(Number(arg)||0))):name;
      if (now - (last.get(rateKey) ?? -Infinity) < (limits[name] ?? 80)) return;
      volume();
      if(recipes[name](arg, 0.96 + Math.random() * 0.08)===false)return;
      last.set(rateKey, now);
      counts[name] = (counts[name] || 0) + 1;
    } catch {} // Sound synthesis never escapes into the simulation.
  }
  function quiet() {
    volume();
    if (host.document.hidden || blocked || gameMuted() || !(settings.sfx > 0)) {stopHorn();pendingEffects.clear();}
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
  host.addEventListener('pageshow', () => { blocked = false; volume(); });
  host.addEventListener('storage', quiet);
  host.addEventListener('park:settings-change',quiet);
  host.addEventListener('park:audio-mute-change',quiet);
  host.addEventListener('blur',()=>{stopHorn();pendingEffects.clear();});
  return {
    ensure, play, startHorn, stopHorn,
    ready:()=>ctx?recordings.load(ctx):Promise.resolve(false),
    punch(base){play('swing');const sound={cat67:'punch-cat',goril:'punch-gorilla',frog67:'punch-frog'}[base];if(sound)play(sound);},
    state: () => ctx?.state || 'none',
    setVolume(value) { settings.sfx = Math.min(1, Math.max(0, Number(value) || 0)); quiet(); saveSettings(); },
    stats: () => ({voices:voices.size, maxVoices:24, counts:{...counts}, hornActive:!!hornVoice, state:ctx?.state || 'none',recordings:recordings.stats()})
  };
}
