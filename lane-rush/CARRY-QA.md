# Color Rush carry — rush-hands-1

- Reuses the island's final-render two-arm pose, including duplicate skeletons.
- 200 ms pickup follows the hands instead of teleporting 1.8 m overhead.
- Passenger idles while held instead of playing a falling animation.
- Throws start at the actual held position, not a second height teleport.
- Existing grab/throw controls, cooldown, physics, audio and course retained.
- Reviewed other standalone mini-game scripts: no other grab/carry state was
  found; this release does not introduce new controls to those games.

Browser QA: desktop 1280x900 keyboard E and mobile emulation 390x844 touch
Grab/Throw. Approached a bot through normal movement, picked it up, verified
two arm chains at full hold weight, threw it and verified zero release weight.
1,000 button clicks were safely coalesced by the existing pending-action flag;
27–28 frames rendered over the next 450 ms, with no page exceptions.
Not a physical-device or multiplayer test (Color Rush is a local bot race).
