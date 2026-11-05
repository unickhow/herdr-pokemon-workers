# Notices

## Sprites: PMD SpriteCollab (not part of this repository)

The Pokémon sprites are **not included** in this repository or in the mod. The first time a sprite is needed, the
mod downloads it from [PMDCollab/SpriteCollab](https://github.com/PMDCollab/SpriteCollab) to the user's own computer
(`<Herdr app folder>/data/pokemon-workers/`), which is where it stays.

What SpriteCollab asks of anyone who uses its sprites (see its
[LICENSE.md](https://github.com/PMDCollab/SpriteCollab/blob/master/LICENSE.md) and README), and how this project does it:

| Requirement | How it is met |
|---|---|
| Sprites are licensed [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/) (older contributions: PMDCollab's terms, credit retained and not for profit) | This project is non-commercial. It is free, has no ads, no payment and no paid tier, and must stay that way. Anyone who forks it takes on the same limit. |
| Credit the creators | Every sprite folder in SpriteCollab has a `credits.txt`. The mod downloads it next to the sprite and the **Credits** button lists every artist of the sprites in use, with the license of each contribution and a link where they gave one (names come from SpriteCollab's `credit_names.txt`). |
| Keep a copyright / license notice and a link to the licensed material | The Credits dialog and this file link to SpriteCollab and to the CC BY-NC 4.0 text. |
| Indicate if you modified the material | The mod crops each animation to its visible pixels, resizes it with nearest-neighbour scaling (2x, times a per-species size factor) and re-encodes it as a GIF. Nothing else is changed (no recoloring, no redrawing). This is stated in the Credits dialog and here. |
| No endorsement | This is an unofficial fan project. It is not made, endorsed or sponsored by PMDCollab, its artists, Spike Chunsoft or any Pokémon rights holder. |
| No downstream restrictions | Nothing here adds terms to the sprites. The MIT license in this repository does not apply to them. |

Some of the animations SpriteCollab hosts are the original game sprites by **Spike Chunsoft**; SpriteCollab does not
license those, and neither does this project. They are credited as such in the Credits dialog.

## Pokémon

Pokémon and its characters are trademarks and copyrights of Nintendo, Creatures Inc. and GAME FREAK inc. This project
uses their names and characters only to tell the user which animal belongs to which agent, and is not affiliated with
them.

## pixelfx (MIT)

The sleeping "Z" and the blocked "!" animations in `mods/pokemon-workers/fx/` were made with
[pixelfx](https://github.com/patch-gg/pixelfx) (MIT License). Its license and notices are in `vendor/pixelfx/`
(`LICENSE`, `NOTICE.md`), which also holds the sources used by `tools/build-fx.mjs`.

## Everything else

The code, the campus scenes (`mods/pokemon-workers/scenes/`) and the prototypes (`prototype/`) are original and are
released under the MIT License (see `LICENSE`).
