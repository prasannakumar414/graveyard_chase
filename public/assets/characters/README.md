# Character artwork

Copied unchanged from the user-provided `Godot_Character_Sprites_Download` directory.
All sheets have one row of 256×256 frames; frame counts are recorded in `manifest.json`.

Mappings:

- `scared_walk_sheet.png`: man walking (4 frames).
- `scared_death_sheet.png`: man death (5 frames).
- `scared_to_powerful_transform_sheet.png`: transformation into He-Man (8 frames).
- `powerful_walk_sheet.png`: He-Man walking (4 frames).
- `powerful_attack_sheet.png`: He-Man attack (6 frames).
- `powerful_to_scared_transform_sheet.png`: transformation back to the man (8 frames).

The skull now uses the three supplied reaper images under `skull/`, copied from
`Downloads/individual_game_sprites 2`. Rest, walking bob, and attack motion are built
from those poses during boot.

The active transformation and attack clips use the repaired artwork under `repaired/`.
The original sheets above are retained as source references. See `repaired/ARTWORK.md`
for generation provenance and the repair prompts.
