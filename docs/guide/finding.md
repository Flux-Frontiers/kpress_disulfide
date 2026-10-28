# Finding and linking

## The search box

The search box at the bottom of the screen takes a PDB id, a class id or a
family name: `1xr9`, `22222o`, `LHSpiral`. It lists the trees that answer,
and the cart's lantern points to the nearest of them, or to the one you
pick. ++enter++ goes to the first. The clear button empties the query and
puts out the lantern's trail.

## Browse

The Browse button opens one panel with three tabs:

- **Groves** (++g++): every exhibit and grove; pick one to jump to it. The
  cart stays yours; steer to hop off.
- **Classes** (++b++): every class tree, with a filter by class, name,
  function or PDB id. Pick one to jump to its tree.
- **Album** (++l++): the classes you have collected and your rank. See
  [The album](reading.md#the-album).

The map at the top right does the same at a glance: tap a grove to list its
classes, or a marker to jump to it.

## Links

The orchard's address takes these parameters:

| Parameter | What it does | Example |
| --- | --- | --- |
| `?tree=<binary class>` | Opens beside that class's tree. | `?tree=00000b` |
| `?home=<bond key>` | Puts that bond on the hub's monument for this visit. The bond must be one of the sampled bonds. | `?home=1xr9_203A_259A` |

They combine:
[`?tree=00000b&home=2q7q_75D_140D`](https://flux-frontiers.github.io/kpress_disulfide/?tree=00000b&home=2q7q_75D_140D).
An unknown class or bond is ignored and the orchard opens at home as usual.
