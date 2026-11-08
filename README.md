# Graveyard Shift

A client-rendered Next.js + Phaser 4 game. Play as a skull in a tiled graveyard: catch the man for a point, then escape when he transforms into He-Man.

<p align="center">
  <img src="public/assets/characters/skull/rest.png" alt="Grim, the hooded reaper wielding a scythe in Graveyard Shift" width="100" height="200"/>
</p>

<img width="1060" height="783" alt="Screenshot 2026-11-08 at 1 52 49 PM" src="https://github.com/user-attachments/assets/c21e1f49-57e3-4e41-b3b5-8111a91254e8" />


## Run

```sh
npm install
npm run dev
```

Open http://localhost:8080. Development uses `.next`; production builds use `dist`, so their caches do not conflict.

```sh
npm test
npx tsc --noEmit
npm run build
```

The template's ESLint configuration requires `eslint` and `eslint-config-next` to run linting; these are not included in its dependencies. TypeScript and production compilation run independently.

## Deploy to Cloudflare

The Wrangler configuration serves the static `dist` export at `afterhours.goredlap.com` using a Worker named `afterhours-arcade`. The domain's zone must be managed in the authenticated Cloudflare account.

```sh
npx wrangler login
npm run deploy
```

`npm run deploy:dry-run` builds and validates the package without publishing. After deployment succeeds, verify `https://afterhours.goredlap.com`, start a game, test movement and audio, and restart a round. A successful build or dry-run does not confirm publication.

## Play

- Move with WASD or arrow keys, or click/tap a walkable tile to follow a path there.
- Grim starts, stops, and turns instantly, with no inertia. Man and He-Man retain acceleration and braking.
- Audio starts with your first interaction: a quiet graveyard drone, soul chimes, transformation sweeps, and heart-loss, respawn, and game-over cues. Use the speaker button to mute; your choice is saved when browser storage is available. Pausing also pauses audio; restarting cleans up the old sounds.
- Touch the man to collect one soul. The skull attacks automatically and the man plays a death animation before respawning away from the player.
- After a random 5–7-second cooldown as a man, sampled at the start of each hunt, he transforms for 650 ms. Capturing Man does not reset the cooldown; it keeps counting through his death animation. If it expires while he is dying, he begins transforming on respawn. He-Man's chase duration is 3 seconds + 1 second per minute of active gameplay + 0.15 seconds per collected soul, calculated when the hero phase starts. He then transforms back for 650 ms. Pausing freezes progression; restarting resets it. Transformations cannot deal or receive hits.
- He-Man's speed starts at 105% of the Reaper's speed, increases by 0.5 percentage points per collected soul, and caps at 200% after 190 souls. Losing a heart preserves this progression; restarting resets it.
- He-Man can chase diagonally through open space. Diagonal paths require both adjacent side tiles to be clear, preventing shortcuts through grave corners.
- Man wanders between random nearby walkable destinations, without avoiding Grim. He starts at 90% of Grim's speed and approaches a 95% cap as active time passes: multiplier = 0.95 - 0.05 × exp(-seconds / 60). Growth slows over time. Respawning preserves progression; pausing freezes it and restarting resets it.
- Contact with He-Man triggers his attack and consumes one heart. The round ends after all three hearts are lost.
- Graves and perimeter walls block both characters. Navigation follows connected tile corridors.
- P / Esc pauses, R restarts, and Enter begins the first shift. Switching away from the game automatically pauses it.
- Personal best is saved in browser storage when available.

## Code layout

- `src/game/scenes/Game.ts`: scene lifecycle, collision outcomes, phase effects, and UI snapshots.
- `src/game/systems/ChaseRound.ts`: independent scoring and transformation rules.
- `src/game/systems/Movement.ts`: keyboard/pointer movement, random wandering, and chase navigation.
- `src/game/audio/GameAudio.ts`: scene-owned audio playback, browser unlock, pause, and mute handling.
- `scripts/generate-audio.py`: regenerates the original PCM WAV assets in `public/assets/audio` using Python's standard library; `--check` validates durations, peaks, and loop endpoints.
- `src/game/world/`: tilemap, graves, collision layout, and grid pathfinding.
- `src/game/entities/Character.ts`: sprite movement, actions, labels, and depth.
- `src/game/art/`: graveyard tile generation, imported skull pose animation, and aligned man/He-Man animations. Transformation and sword attack use repaired atlases with intermediate pose blends and shared foot anchors. Character artwork is bundled in `public/assets/characters`; no external service is needed at runtime.
- `src/ui/`: React HUD, dialogs, and overlays; game state arrives through the event bus.
- `src/PhaserGame.tsx`: React/Phaser lifecycle bridge. The page dynamically imports the application with SSR disabled.
- `tests/game.test.cjs`: round-rule and connected-arena regression tests.
- `skills/phaser/`: official Phaser development guides, indexed in its README and referenced by `AGENTS.md`.

## License

Licensed under the [MIT License](LICENSE). The original Phaser Next.js template copyright notice is retained alongside the game's copyright notice.
