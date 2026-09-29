# Natural movement and vehicle sounds

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
