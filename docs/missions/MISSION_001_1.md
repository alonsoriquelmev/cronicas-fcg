# MISSION 001.1 — Board Interaction Fixes + UX Redesign

## Goal

Improve the existing `/dev/board` sandbox so it behaves correctly and feels substantially closer to a digital TCG.

Do **not** rebuild the project from scratch.

Reuse the existing:

- domain model;
- `GameAction`;
- reducer;
- card components;
- dnd-kit setup;
- Motion setup;
- mock GameState.

This mission focuses on **structural interaction fixes + board UX**.

---

## Read first

1. `AGENTS.md`
2. `docs/MVP_SCOPE.md`
3. Relevant sections of `docs/CRONICAS_DOMAIN.md`
4. Relevant board/card sections of `docs/UX_SPEC.md`
5. Relevant UI/state sections of `docs/ARCHITECTURE.md`

Read other docs only if required.

---

# 1. Fix card edit permissions

Opponent cards are public/readable but **not editable**.

Opponent cards must allow:

- hover;
- inspection;
- reading.

Opponent cards must NOT allow:

- tap;
- untap;
- flip;
- counter changes;
- drag;
- moving zones;
- attachment changes.

Enforce this in interaction logic, not only by hiding buttons.

---

# 2. Hand cards cannot Tap / Untap

Cards in `HAND` must not expose Tap/Untap actions.

This applies to:

- double click;
- context menu;
- any direct control.

Tap/Untap is only available in structurally appropriate public play zones.

---

# 3. Support multiple Characters

Fix the sandbox so the local Field supports:

```text
0..N Characters
```

Playing one Character must not prevent another Character from being played.

Character slots must:

- appear dynamically;
- compact naturally;
- support reordering;
- preserve attached Relics.

Do not hardcode a maximum.

---

# 4. Fix tapped-card layout

A tapped card must remain fully inside its visual field area.

Current rotation must not cause cards to overflow or be clipped outside the board.

Adjust:

- slot dimensions;
- transform origin;
- spacing;
- overflow behavior

as needed.

Do not store presentation coordinates in `GameState`.

---

# 5. Redesign the board as one continuous surface

The current large bordered rectangles make the interface feel like HTML sections.

Refactor the board presentation into a **continuous digital play surface**.

Avoid large visible boxes for:

- opponent field;
- own field;
- Verse Resolution.

Zones should be understood primarily through:

- position;
- spacing;
- lighting;
- subtle labels;
- drop feedback.

Keep technical drop zones intact even if their boxes are visually hidden.

---

# 6. Board composition

Use this conceptual hierarchy:

```text
                    OPPONENT

 Graveyard      Sanctuary        Main / Essence Decks

        Character Field + Relics


               VERSE RESOLUTION


        Character Field + Relics

 Graveyard      Sanctuary        Main / Essence Decks

                     YOU

                OWN HAND
```

Each player must still see themselves at the bottom.

Do not copy this literally if a better composition fits the viewport.

---

# 7. Main Deck visual

Both players must visibly have a Main Deck pile.

Display:

- card back;
- remaining count.

Own Main Deck:

```text
click → DRAW_CARD
```

Remove the separate normal gameplay button:

```text
Robar Main Deck
```

Opponent Main Deck is readable only as a pile/count and cannot be clicked to draw.

Use a short draw animation from deck to hand.

---

# 8. Essence Deck visual

Both players must visibly have an Essence Deck pile.

Display:

- card back;
- remaining count.

Own Essence Deck:

```text
click → DRAW_ESSENCE
```

Remove the separate normal gameplay button:

```text
Robar Essence
```

`DRAW_ESSENCE` must visibly animate the top Essence:

```text
ESSENCE_DECK → ESSENCE_ZONE
```

Opponent Essence Deck cannot be manipulated.

---

# 9. Essence Zone

Create a clearly visible Essence Zone for both players.

It must display all Essences currently released.

Own Essences support:

- inspect;
- tap;
- untap.

Opponent Essences support:

- inspect only.

Essences must not be draggable to unrelated zones.

---

# 10. Sanctuary card

Sanctuary must be represented as an actual card, not only an HP widget.

For both players display:

```text
Sanctuary Card
Current HP
```

The Sanctuary card must:

- use the same reusable card presentation system;
- be inspectable by both players;
- show its text/details through inspection.

Own Sanctuary HP can be changed manually.

Opponent Sanctuary HP cannot be changed by the local player.

---

# 11. Sanctuary activation affordance

Sanctuaries can have abilities.

Prepare a simple manual interaction for the own Sanctuary such as:

```text
Activate Sanctuary
```

or an equivalent contextual action.

This action does **not** execute the Sanctuary effect.

It should only provide visual/action feedback that the player is activating the Sanctuary.

If a new `GameAction` is introduced, keep it serializable and domain-safe.

Do not build automatic Sanctuary ability logic.

---

# 12. Remove unexplained MAIN placeholder

Remove the unexplained `MAIN` cell currently visible on the opponent side.

Replace it with the actual Main Deck component if that was its intended role.

No unexplained debug placeholders should remain on the board.

---

# 13. Graveyard visual

Both Graveyards must be visible as compact piles.

Display:

- top card when available;
- card count.

Clicking a Graveyard must open a public inspection overlay/gallery.

Both players may inspect either Graveyard.

---

# 14. Graveyard inspection

The Graveyard overlay must:

- show all cards clearly;
- allow card inspection;
- preserve deterministic ordering;
- close with Escape/click-outside.

For the local player's Graveyard, cards must be manually movable to:

```text
GRAVEYARD → HAND
GRAVEYARD → FIELD
```

using existing `MOVE_CARD` semantics.

This exists to support manual card effects.

Opponent Graveyard remains inspectable but not editable.

---

# 15. Own Hand UX cleanup

Keep:

- fan;
- overlap;
- hover lift;
- automatic type sorting.

Improve:

- card size;
- vertical position;
- spacing;
- readability.

Remove visible per-card `- / +` counter controls from the default Hand presentation.

Counters should be available through contextual interaction where structurally appropriate.

Hand cards must not expose Tap/Untap.

---

# 16. Verse Resolution redesign

Keep the central Verse Resolution Zone.

Make it visually important **when occupied**, but subtle when empty.

Do not reserve a huge empty rectangle.

When empty:

- minimal visual footprint;
- subtle drop target.

When a Verse enters:

- expand/emphasize;
- animate card arrival;
- keep card readable.

---

# 17. Remove normal-play debug UI

Remove from the visible board:

```text
Acción aplicada: ...
```

and other developer-only labels that interfere with normal gameplay presentation.

If useful, place them behind an optional development/debug panel.

The default `/dev/board` view should resemble the game, not instrumentation.

---

# 18. Card sizing

Increase board card readability.

Prioritize:

- own Hand;
- own Field;
- opponent Field;
- Sanctuary;
- Graveyard top card.

Cards should remain distinguishable at 1366×768 without requiring inspection for every interaction.

Do not make them so large that the board no longer fits the viewport.

---

# 19. Viewport behavior

Normal gameplay board should avoid page-level vertical scrolling.

Target desktop viewport usage:

```text
1920×1080
1440×900
1366×768
```

Internal overlays may scroll.

The Hand must not create an unwanted vertical scrollbar.

---

# 20. Visual depth

Increase 2.5D presentation using existing Motion/CSS approach.

Improve:

- board perspective;
- card shadows;
- hover depth;
- drop target glow;
- zone transitions;
- subtle surface lighting.

Do not introduce:

- Three.js;
- WebGL engine;
- heavy particles.

Keep effects restrained.

---

# 21. Drag/drop structural behavior

Verify these flows:

```text
HAND Character → FIELD
HAND Relic → FIELD unattached
Relic → Character
Relic attached → unattached Field
HAND Verse → VERSE_RESOLUTION
VERSE_RESOLUTION → GRAVEYARD
FIELD → GRAVEYARD
GRAVEYARD → HAND
GRAVEYARD → FIELD
```

Do not permit structural nonsense such as:

```text
HAND → ESSENCE_ZONE
ESSENCE_ZONE → HAND
opponent card manipulation
```

---

# 22. Context menus

Context menus must reflect zone + authority.

Examples:

## Own Field Character

- Inspect
- Tap / Untap
- Flip
- Counter
- Send to Graveyard
- Return to Hand

## Own Hand

- Inspect
- Play / move where structurally supported
- Send to Graveyard if manual movement is supported

No Tap/Untap.

## Opponent public card

- Inspect only.

## Own Graveyard

- Inspect
- Return to Hand
- Move to Field

Keep menus compact.

---

# 23. Animation principles

Animations should communicate state changes.

Priority:

1. Deck → Hand
2. Essence Deck → Essence Zone
3. Hand → Field
4. Relic attach/detach
5. Verse → Resolution
6. Resolution → Graveyard
7. Tap/Untap
8. Sanctuary HP feedback

Avoid slowing repeated actions.

---

# 24. Do not change

Do not implement in this mission:

- multiplayer;
- production Convex GameState;
- rooms;
- sessions;
- PlayerView backend filtering;
- rules engine;
- automatic card effects;
- automatic costs;
- combat;
- Deck Builder;
- official card import;
- matchmaking;
- accounts;
- analytics.

Do not rewrite the domain architecture unless a demonstrated bug requires a small documented correction.

---

# 25. Tests

Update/add tests for the fixes that affect domain or interaction behavior.

At minimum verify:

- multiple Characters can coexist in Field;
- Hand cards cannot trigger Tap/Untap through the board interaction layer;
- opponent cards cannot execute editable actions;
- `DRAW_ESSENCE` visibly results in Essence Zone state;
- own Graveyard cards can move to Hand/Field;
- opponent Graveyard cards cannot be moved;
- Sanctuary authority is respected.

Keep pure domain tests separate from UI permission tests when appropriate.

---

# 26. Acceptance criteria

At `/dev/board` I must be able to verify:

1. board feels like one continuous play surface;
2. no large empty HTML-like field boxes dominate the screen;
3. own and opponent Main Decks are visible;
4. clicking own Main Deck draws;
5. own and opponent Essence Decks are visible;
6. clicking own Essence Deck releases the top Essence;
7. Essence Zone is visible;
8. Sanctuary cards are visible for both players;
9. Sanctuary cards can be inspected;
10. own Sanctuary HP can be edited, rival HP cannot;
11. multiple Characters can be played;
12. opponent cards cannot be edited;
13. Hand cards cannot be tapped;
14. tapped cards stay inside their layout;
15. Graveyards can be inspected;
16. own Graveyard cards can move to Hand/Field;
17. opponent Graveyard is read-only;
18. Verse Resolution is compact when empty and prominent when used;
19. page-level vertical scrolling is not required during normal play;
20. debug labels/buttons no longer pollute the normal board.

---

# 27. Required checks

Run and fix:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

Final report: maximum 15 lines, following `AGENTS.md`.
