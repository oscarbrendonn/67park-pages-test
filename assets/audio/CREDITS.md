# Natural movement and vehicle sounds

## Character punch calls (2026-10-05)

- `punch-gorilla-v1.wav`: J0ck0, [Gorillaschrei.wav](https://freesound.org/people/J0ck0/sounds/397054/), CC0, described by its author as a zoo recording. Public preview: `https://cdn.freesound.org/previews/397/397054_2884295-hq.mp3`. First 0.62 seconds, mono PCM16 24kHz, 70Hz high-pass / 5kHz low-pass, 12ms attack / 100ms release, peak limit 0.85 without makeup gain.
- `punch-frog-v1.wav`: egomassive, [Frog.ogg](https://freesound.org/people/egomassive/sounds/536759/), CC0, derived from Craig Smith's CC0 "R01-47-Frog Ribbits". Public preview: `https://cdn.freesound.org/previews/536/536759_1415754-hq.mp3`. Mono PCM16 24kHz, 70Hz high-pass / 5.5kHz low-pass, 8ms attack / 50ms release, peak limit 0.85 without makeup gain.

Licenses checked 2026-10-05. No game soundtrack or paid generation used.
Other new character cues are original short procedural/cartoon effects, not
recordings of real animals. The existing recorded cow call is retained.

`natural-foley-v1.wav` contains edited **real recordings**, all released under
[CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/).
No voice service, paid generation, runtime CDN or account is required.

| Recording | Author | Source and license | Download used |
| --- | --- | --- | --- |
| Car Horn | 15HPanska_Ruttner_Jan | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Car_Horn.wav), CC0; [original](https://freesound.org/people/15HPanska_Ruttner_Jan/sounds/461679/) | https://upload.wikimedia.org/wikipedia/commons/8/8c/Car_Horn.wav |
| Jumping on Concrete #2 | Joseph SARDIN | [BigSoundBank](https://bigsoundbank.com/jumping-on-concrete-2-s1836.html), CC0 | https://bigsoundbank.com/UPLOAD/mp3/1836.mp3 |
| skateboard ollie | nolimitkid | [Freesound](https://freesound.org/people/nolimitkid/sounds/515229/), CC0 | Public listening preview: https://cdn.freesound.org/previews/515/515229_11123146-hq.mp3 |

License pages checked 2026-09-28. The Freesound public preview is the licensed
recording, not a download of the login-protected original.

Edits: trim silence, mono 32kHz PCM16, remove sub-bass rumble, normalize with
headroom, short non-clicking fades; separate the skateboard's takeoff, airborne
shoe flick and wheel impact. The horn retains its recorded attack and a
phase-matched, crossfaded sustain loop. No synthesized beep is layered on it.

Rebuild: download these three files as `horn.wav`, `jump.mp3`, `ollie.mp3` into a
temporary directory, then run `node qa/build-natural-audio.mjs /that/directory`.
The JSON manifest records clip boundaries, byte count and output SHA-256.

## Recorded vehicle engine (2026-09-30)

`vehicle-cabin-v1.wav` uses the following CC0 1.0 public listening previews.
The engine clips are all the same BMW 120d recorded inside the cabin by
GiocoSound, so starting, idling and changing RPM retain a consistent timbre.

| Clip / saved filename | Author | Source | Download used |
| --- | --- | --- | --- |
| start.mp3 | GiocoSound | https://freesound.org/people/GiocoSound/sounds/401554/ | https://cdn.freesound.org/previews/401/401554_5820033-hq.mp3 |
| stop.mp3 | GiocoSound | https://freesound.org/people/GiocoSound/sounds/401553/ | https://cdn.freesound.org/previews/401/401553_5820033-hq.mp3 |
| idle.mp3 | GiocoSound | https://freesound.org/people/GiocoSound/sounds/401550/ | https://cdn.freesound.org/previews/401/401550_5820033-hq.mp3 |
| low.mp3 | GiocoSound | https://freesound.org/people/GiocoSound/sounds/401548/ | https://cdn.freesound.org/previews/401/401548_5820033-hq.mp3 |
| mid.mp3 | GiocoSound | https://freesound.org/people/GiocoSound/sounds/401547/ | https://cdn.freesound.org/previews/401/401547_5820033-hq.mp3 |
| brake.mp3 | WavJunction.com | https://freesound.org/people/WavJunction.com/sounds/456764/ | https://cdn.freesound.org/previews/456/456764_9514571-hq.mp3 |

License checked on each source page 2026-09-30: CC0 1.0. Edits: mono 24kHz
PCM16, 45Hz high-pass / 6.5kHz low-pass, trimmed silence, DC removal,
RMS normalization with peak headroom, 80ms crossfaded loop joins and faded
one-shot edges. No synthetic engine wave, UI chirp or repeated starter is mixed
into the engine. The bus uses the same licensed recordings with a lower pitch
and darker filter (not a separate bus recording).

Rebuild: download the six filenames above, then run
`node qa/build-vehicle-audio.mjs /that/directory`. `vehicle-cabin-v1.json`
records exact cuts, loop points, size and SHA-256. The whole bank is 525,644
bytes and decoded only when needed, without blocking game entry.

## Five-gear audio revision (2026-09-30)

`vehicle-cabin-v2.wav` retains those six CC0 clips and adds GiocoSound's
[Inside RPMHigh, 401549](https://freesound.org/people/GiocoSound/sounds/401549/),
also CC0 (checked 2026-09-30). Download as `high.mp3` from
https://cdn.freesound.org/previews/401/401549_5820033-hq.mp3.
The current builder emits v2; the old v1 bank remains unchanged for rollback.
The new bank is 608,444 bytes, mono 24kHz, decoded on demand.

Its four loops are pitch-matched to their measured firing rates (28, 49.2,
67, 85 Hz) before adjacent-layer crossfading. A bounded five-gear audio-only
powertrain controls RPM, throttle load, lift-off and short shift load dips.
There is no repeated shift/starter sample or timer-driven fake limiter.
Bus RPM and filtering are lower, still using this shared recording bank.

Behaviour references only, not source assets:
[Stirling GT start, revs and acceleration](https://www.youtube.com/watch?v=UuN1S4di-Ho)
(0:00–1:25 frames and audio signal inspected), and Alastair MacGregor's
[The Sound of Grand Theft Auto V](https://www.youtube.com/watch?v=L4GuM15QOFE)
(23:18–27:22 technical explanation, captions and slides inspected).
No GTA recording is shipped in the game. This is a small browser-game
crossfade engine, not Rockstar's proprietary granular synthesis system.

## Cow punch voice (2026-10-01)

`cow-moo-v1.wav`: JarredGibb, [Cow - Moo 2 - 96kHz.wav (233129)](https://freesound.org/people/JarredGibb/sounds/233129/).
Real farm field recording, CC0 1.0 (source page checked 2026-10-01).
Source preview: https://cdn.freesound.org/previews/233/233129_4056007-hq.mp3.
Converted to mono PCM16 at 24 kHz, 65 Hz high-pass / 6.5 kHz low-pass,
12 ms attack and 120 ms end fade, peak limiter 0.85 with no makeup gain.
The full 2.18-second call is retained. A new accepted punch fades the old call
before retriggering; mute and page hiding cancel pending and active calls.
This separate, lazy cow sample does not alter the vehicle or foley banks.
# Interaction foley v1 — 2026-10-01

268,844-byte mono 24 kHz PCM bank; loaded in the existing gesture-unlocked audio graph, never awaited by startup. No GTA or Eggy Party audio is shipped.

All recordings below are CC0. Original public preview checksums, precise trims, fades and bank checksum are in `interaction-foley-v1.json`; rebuild with `node qa/build-interaction-audio.mjs <source-directory>`.

- Pool entry: **Water Splash**, felix.blume / Sara Lana — https://freesound.org/people/felix.blume/sounds/434978/ (first 2.45 seconds; close swimming-pool dive).
- Dog response: **Dog bark 3**, Sadiquecat — https://freesound.org/people/Sadiquecat/sounds/850824/ (0.34 seconds).
- Cat care: **Cat Purr**, Joseph SARDIN — https://bigsoundbank.com/cat-purr-s0436.html (2.00–3.65 seconds).
- Throw: **Stick - Whoosh 5**, Sadiquecat — https://freesound.org/people/Sadiquecat/sounds/802463/ (0.015–0.36 seconds).
- Dog biting its ball: **Squeaky Toy #2**, Breviceps — https://freesound.org/people/Breviceps/sounds/468444/ (2.00–2.43 seconds).
- Toy-ball contact: **basketball**, noamp2003 — https://freesound.org/people/noamp2003/sounds/460649/ (single contact, 0.195–0.43 seconds, quietly mixed for the small toy).

Gentle DC removal, 55 Hz high-pass / 9.5 kHz low-pass, peak headroom and short edge fades; no synthetic tones added to these recordings. Technical sample/envelope checks are not a substitute for listening approval on the player's speakers.

## Skate rolling (2026-10-09)

`skate-roll-v1.wav`: Lanterr, [SkateRolling.wav](https://freesound.org/people/Lanterr/sounds/688733/), CC0 (verified 2026-10-09). Author describes this as a looped rolling skateboard. Source preview: https://cdn.freesound.org/previews/688/688733_14949144-lq.mp3. Converted to mono PCM16 24kHz, high-pass 100Hz / low-pass 4500Hz, gain 4 with 0.85 peak limiter (no makeup). Playback pitch and volume follow actual speed; stopped and airborne boards are silent. No existing recordings replaced.


## Real coin and basketball contacts (2026-10-09)

BasketballBounce.wav by Blankened: https://freesound.org/people/Blankened/sounds/505628/ (CC0). Coin recording by keatonmarek: https://freesound.org/people/keatonmarek/sounds/533770/ (CC0). Public listening previews downloaded; mono PCM16 24kHz, filtered and short fade-out. Basketball 0.254s; coin 0.35s with leading silence removed. Existing sound banks unchanged.

## Loading music (2026-10-09)
Friendly NPC music [LOOP] by DAN2008, CC0: https://freesound.org/people/DAN2008/sounds/848504/ . Public preview saved unchanged as loading-party-v1.mp3. Low-volume loading-only playback with fade and mute handling.
