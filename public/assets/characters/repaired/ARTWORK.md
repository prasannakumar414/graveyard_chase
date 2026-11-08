# Repaired animation artwork

Created on 2026-11-05 using the built-in image-generation tool, with the supplied
`scared_to_powerful_transform_sheet.png` and `powerful_attack_sheet.png` as edit targets.
Original files are retained one directory above. No CLI/API fallback was used.

- `transform.png`: eight poses, four columns by two rows. Used forwards for transformation
  and backwards for reversion, with the actual walking poses at both endpoints.
- `attack.png`: twelve sword attack poses, four columns by three rows. Used with entry,
  follow-through, and recovery blends.

The generated images have native dimensions of 1774×887 and 1448×1086. Runtime packing
uses their measured cell sizes, foot pivots, and uniform scales from
`src/game/art/repairedFrames.json`; it does not assume the requested output resolution.
`scripts/inspect-repaired-sprites.cjs` reproduces those measurements without editing images.

The skull files under `../skull` are the user's originals, not generated replacements.

## Transformation prompt

Edit target: supplied sprite sheet. Repair it into a production-ready animation atlas preserving exactly the same frightened brown-haired man and blond muscular He-Man designs and hand-painted chibi game art. Output ONE transparent PNG 1024x512, exactly FOUR equal columns and TWO equal rows, eight 256x256 cells in reading order. No text, grid lines, border, background, floor or shadow. Each cell contains exactly one full character facing RIGHT. Keep foot baseline at y=232 within every cell and pelvis centered x=128; same scale throughout, character height progresses naturally from man 115px to hero140px. Frame1 original man crouched. Frames2-7 gradual continuous morph: straighten legs, expand muscle and chest harness, grow blond hair, tighten determined expression, golden energy smoothly rises then fades. Frame8 exactly hero in neutral standing stance, arms relaxed and no glow, matching subsequent hero walk. Preserve design, brown boots, gray chest harness red emblem, brown shorts. All hands, feet, hair, and energy completely INSIDE each cell with 24px transparent padding. NO previous/next frame fragments. This repairs alignment, clipping and missing in-between motion; do not redesign characters.

## Attack prompt

Edit target: supplied sprite sheet. Repair into a fluid production-ready sword attack animation atlas preserving exactly the SAME blond muscular chibi He-Man face, clothes, brown boots, gray harness with red emblem, painted shading and steel sword. Output ONE transparent PNG 1024x768, exactly FOUR equal columns and THREE equal rows, twelve 256x256 cells in reading order. No text, grid lines, border, scenery, floor or ground shadows. Exactly one full character per cell, facing RIGHT, consistent scale about140px tall from feet to hair, constant foot baseline y232 and pelvis x112. All sword and golden slash trails completely inside each cell; leave transparent padding. Full continuous twelve-pose sword swing: 1 relaxed sword held down; 2 anticipation crouch; 3 draw sword back; 4 windup sword above shoulder; 5 overhead peak; 6 descend; 7 fast diagonal cut; 8 forward followthrough; 9 low extended followthrough; 10 begin recovery; 11 straighten and lower sword; 12 return to same neutral as frame1. Stable anatomy, planted feet with subtle hip rotation; NO teleporting, changing scale, duplicate body parts or foreign fragments. Preserve character identity and source art style. Transparent alpha background.
