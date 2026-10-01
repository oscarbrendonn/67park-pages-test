# 67Park public Pages comparison

Client revision: 72e364255512f7c254e48fa0f9b1df7964a97941 (audio-guard-1).

Owner-authorized public test. Game/model files are intentionally public. The client password screen is a playtest entrance, NOT file access protection. The protected game and private source repositories are unchanged.

Only hosting paths and isolated test-backend routing differ. Multiplayer still uses a separate Mac-hosted test service through a tunnel. Test accounts and progress are separate from the protected game.

50 players per island, overflow islands, friend-lobby joining and social panel are included. The test service has a separate 128-player overall safety limit.

No server code, private runtime data, credentials, or source Git history is published here. The operational endpoint branch refreshes routing after restarts.

Vehicle idle loops now survive brief focus/audio interruptions. Camera, driving physics, map contours, character models and recordings are unchanged.
