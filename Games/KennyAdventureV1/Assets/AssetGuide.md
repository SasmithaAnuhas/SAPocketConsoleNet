# Kenny Adventure Asset Guide

The original Kenney pack is kept intact as the source. Use this guide to pick assets by game role; paths below are relative to `Assets/kenney_new-platformer-pack-1.1/`.

## Starter Set

| Game role | Suggested assets | Source folder |
| --- | --- | --- |
| Player | `character_green_idle.png`, `character_green_walk_a.png`, `character_green_walk_b.png`, `character_green_jump.png`, `character_green_hit.png` | `Sprites/Characters/Default/` |
| Background | `background_solid_sky.png`, `background_color_hills.png`, `background_clouds.png` | `Sprites/Backgrounds/Default/` |
| Platforms | `terrain_grass_horizontal_left.png`, `terrain_grass_horizontal_middle.png`, `terrain_grass_horizontal_right.png`, `terrain_grass_block.png` and matching corner/edge pieces | `Sprites/Tiles/Default/` |
| Enemy | `slime_normal_rest.png`, `slime_normal_walk_a.png`, `slime_normal_walk_b.png` | `Sprites/Enemies/Default/` |
| Pickups | `coin_gold.png`, `gem_blue.png`, `heart.png` | `Sprites/Tiles/Default/` |
| Hazards | `spikes.png`, `lava.png`, `lava_top.png` | `Sprites/Tiles/Default/` |
| Goal | `flag_green_a.png`, `flag_green_b.png` | `Sprites/Tiles/Default/` |
| HUD | `hud_coin.png`, `hud_heart.png`, `hud_heart_empty.png` | `Sprites/Tiles/Default/` |
| Sound effects | `sfx_jump.ogg`, `sfx_coin.ogg`, `sfx_hurt.ogg`, `sfx_disappear.ogg` | `Sounds/` |

This is enough to prototype movement, a simple outdoor level, one enemy, collectibles, hazards, a goal, and basic feedback. Add the green character's `climb` frames only if the level includes ladders.

## Add Later

- More terrain styles: `terrain_dirt_*`, `terrain_stone_*`, `terrain_snow_*`, `terrain_sand_*`, and `terrain_purple_*` in `Sprites/Tiles/Default/`.
- More enemies: other files in `Sprites/Enemies/Default/` (for example `bee_*`, `frog_*`, and `snail_*`). Each enemy's `rest`, `walk`, or `attack` frames form its animation.
- Level objects: doors, keys, switches, ladders, bridges, springs, signs, and checkpoints are in `Sprites/Tiles/Default/`.
- Extra sound: `sfx_jump-high.ogg`, `sfx_gem.ogg`, `sfx_bump.ogg`, `sfx_magic.ogg`, and `sfx_select.ogg` in `Sounds/`.
- Character choices: beige, pink, purple, and yellow have the same main animation set as green in `Sprites/Characters/Default/`.

## Choosing Files

- `Sprites/` contains individual images, best for loading only the assets a level uses.
- `Spritesheets/` contains packed PNG sheets and matching XML frame maps. Use the PNG and its same-named XML together; do not load both the sheet and its individual sprites for the same artwork.
- `Default/` and `Double/` are alternate sprite sizes. Pick one consistently for a given game build.
- The matching `Vector/` folders contain scalable artwork for the same broad groups.

## Source and License

The source pack and its license are in `kenney_new-platformer-pack-1.1/`. Keep `License.txt` with the pack when sharing or distributing the game. The pack identifies itself as CC0; credit is optional, but welcome.
