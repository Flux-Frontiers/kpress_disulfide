# Settings

++esc++, or the settings button in the top bar (on a phone, in the
three-dot menu), opens the settings. The cart is parked while they are open.
Every setting is saved in this browser.

## Driving and view

| Setting | What it does |
| --- | --- |
| Driving pace | **Gentle exploration** or **Brisk driving**: how fast the cart goes. |
| Steering response | How sharply the cart turns, 0.5x to 1.5x. |
| Camera | In the cart, behind the cart (the default), above the cart, or god's eye. ++c++ steps through them. See [Cameras](driving.md#cameras). |
| Wind and gentle cart motion | The leaves move in the wind and the cart sways. Off by default when your system asks for reduced motion. |

## Sound and cards

| Setting | What it does |
| --- | --- |
| Read each grove aloud on the ring | On the guided tour, each grove's summary is read in the system voice. Off by default. |
| Silent mode | No cards pop up on their own. Clicking a tree still pins its card. The bell in the top bar flips it too. |

## Detail and performance

| Setting | What it does |
| --- | --- |
| Show geometry and frame rate | A readout of triangles, draw calls, leaves and frames per second under the title. |
| Bond complexity | How many of each octant class's sampled bonds are drawn: **Low** 1, **Medium** 3 (the default), **High** 6, **Ultra** every sampled bond, up to 12. The lowest-energy bonds are kept first. Changing it regrows the orchard. |
| Prune sparse octants | Leaves undrawn the folded `-other` tips, and any quadrant class with nothing else above it. Every class keeps its place, so the sparse octants show as gaps. On by default. |
| Shadows and forest floor detail | Shadows, and the undergrowth along the roads. Turn off for a faster frame rate. |

## Environment

| Setting | What it does |
| --- | --- |
| Season | Spring, summer, autumn or winter. Each visit starts in the season of the date; a choice here lasts until you reload. |
| Fog | Clear, light, normal or heavy standing haze. |
| Schematic trees | Every class and sampled bond as a bead, colored by tier; see [Schematic trees](the-orchard.md#schematic-trees). ++v++ flips it. |
| Name plates | Class ids and bond keys over the tree nearest the cart, coarse classes first. Off by default; ++n++ flips it. |
| Random weather | Morning fog that burns off, and cloud. On by default. |

## Reset all settings

**Reset all settings**, at the bottom, asks first, then puts every setting
back to its default, sets the season to the date's and the clock to live, and
forgets the tour's welcome. Your album and the groves you have visited are
kept.
