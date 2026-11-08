# Project guidance

## Stack and rendering

- This project uses a Next.js template with TypeScript, React, and Phaser to build browser games.
- The game is rendered on the client. Preserve the dynamic import with `ssr: false` in `src/pages/index.tsx` so Phaser and browser APIs do not execute during server rendering.
- Use Next.js and React for the page shell and surrounding UI. Use Phaser for game scenes, rendering, input, physics, and the game loop.
- Follow the existing Pages Router structure; do not migrate routers or replace the game framework unless requested.

## Modular, readable code

- Write clear, maintainable code with descriptive names, small focused functions, and explicit responsibilities.
- Keep scenes focused on coordinating their lifecycle and gameplay. Extract reusable or substantial behavior into focused modules for systems, entities, input, configuration, or utilities as needed.
- Keep game logic separate from React UI and framework integration. Use the existing `src/PhaserGame.tsx` bridge and `src/game/EventBus.ts` for communication across that boundary.
- Prefer named constants and typed configuration over unexplained numbers or repeated strings.
- Use TypeScript types for public interfaces, game state, configuration, and event payloads. Avoid `any` when a concrete type is practical.
- Favor readable multi-line code over compressed expressions, deeply nested logic, or clever abstractions. Add comments to explain intent or non-obvious constraints.
- Match the conventions of the surrounding code. Avoid unrelated refactors, speculative abstractions, and unnecessary dependencies.

## Phaser skills

- Project-local Phaser guides are indexed in `skills/phaser/README.md`. Before changing a Phaser subsystem, read the relevant `skills/phaser/<topic>/SKILL.md` and follow its guidance within the requested scope.
- Start with `game-setup-and-config`, `scenes`, and `events-system` for game initialization, lifecycle, or React integration work. Load other guides only as needed.
- These guides target Phaser 4. Check APIs against the version installed in this project; upstream `master` may describe newer features. Paths such as `src/scene/Scene.js` inside the guides refer to the Phaser library source, not this application's `src` directory.
- Preserve the client-rendering boundary and project conventions described above when adapting guide examples.

## Game lifecycle and performance

- Create and destroy Phaser instances through the React bridge. Clean up listeners, timers, subscriptions, and other resources when their owning scene shuts down or component unmounts.
- Remove event listeners using the specific handler that was registered so cleanup does not remove another consumer's listeners.
- Keep frame-by-frame state inside Phaser. Use React state for UI updates at meaningful boundaries rather than every game frame.
- Use Phaser's lifecycle and timing APIs for gameplay. Make movement and timing independent of display frame rate.
- Keep asset loading in the boot/preloader flow and reuse loaded assets.

## Validation

- Run the checks appropriate to the change and available project scripts. Use `npm run build` to validate production compilation when application code changes.
- For gameplay or rendering changes, verify the affected behavior in a browser when available, including scene transitions and relevant controls.
- Report what was checked and any checks that could not be completed. Distinguish a successful build from actual browser verification.
