# MISSION 004 — Manual Zone Control + Hidden Information Hardening

## Goal

Complete the remaining multiplayer manual-control gaps identified by the functional audit, and harden `PlayerView` so hidden cards do not expose unnecessary stable metadata.

This mission is intentionally narrow.

Do NOT redesign the board.
Do NOT add a rules engine.
Do NOT implement Sanctuary activation semantics.
Do NOT implement Prologue/Epilogue selection yet.

Focus only on:

1. Manual multiplayer zone movement from Graveyard / Field.
2. Graveyard inspection UX.
3. Multiplayer flip actions.
4. Explicit backend validation for Essence Tap/Untap.
5. Hidden-card privacy hardening.

---

## Read first

1. `AGENTS.md`
2. Visibility/privacy sections of `docs/CRONICAS_DOMAIN.md`
3. Relevant multiplayer sections of `docs/ARCHITECTURE.md`
4. Current `PlayerView` implementation
5. Current `RoomBoard` / Graveyard / context-menu implementation
6. `convex/_generated/ai/guidelines.md`

Inspect current tests before changing behavior.

---

# 1. Preserve existing gameplay

Do NOT break:

- HAND → FIELD Character;
- HAND → FIELD Relic;
- Relic attachment/detach;
- Verse Resolution;
- Tap/Untap;
- Sanctuary HP;
- phase progression;
- preparation flow;
- deck building;
- Essence ordering;
- mulligan;
- realtime sync;
- reconnect;
- current board layout.

This mission fills gaps; it does not replace existing systems.

---

# 2. Graveyard → Hand

For the owner/controller, support:

```text
GRAVEYARD → HAND
```

through the multiplayer board.

At minimum provide a context-menu action:

```text
Devolver a la Mano
```

Use the existing serializable `MOVE_CARD` semantics if appropriate.

The transition must be authoritative through Convex.

Opponent Graveyard cards must remain read-only.

---

# 3. Graveyard → Field

For the owner/controller, support:

```text
GRAVEYARD → FIELD
```

through the multiplayer board.

At minimum provide a context-menu action:

```text
Mover al Campo
```

The destination is the owner's general FIELD.

Preserve card identity/state according to the current domain model.

Do not add automatic legality based on card text.

---

# 4. FIELD → Hand

Support manual:

```text
FIELD → HAND
```

for own/control cards where structurally meaningful.

At minimum provide:

```text
Volver a la Mano
```

in the context menu of own public Field cards.

Use `MOVE_CARD` or the existing domain action.

Do not allow the opponent to move these cards.

---

# 5. Attached Relic → Hand

If a Relic is attached to a Character and the player explicitly moves that Relic to Hand:

- Relic goes to HAND;
- `attachedToInstanceId = null`;
- Character remains in FIELD;
- derived stats update immediately.

The transition must be atomic.

Do not leave dangling attachment references.

---

# 6. Character with attached Relics → Hand

Use the same structural rule already established for Character leaving FIELD:

If Character moves FIELD → HAND:

- only Character moves to HAND;
- attached Relics remain in FIELD;
- each attached Relic becomes loose;
- `attachedToInstanceId = null`;
- Relic instance/state is preserved.

This must occur atomically, just like Character → Graveyard.

Do not invent a different rule solely for Hand movement.

---

# 7. Graveyard inspection gallery

Current multiplayer Graveyard inspection is too compact and may hide cards.

Implement a proper public Graveyard overlay/gallery.

Requirements:

- click Graveyard pile → open overlay;
- show all cards in deterministic order;
- allow full card inspection;
- internal scrolling if needed;
- Escape closes;
- click outside closes.

Do not use a fixed `max-h` + `overflow-hidden` that makes cards inaccessible.

Both players may inspect either Graveyard.

---

# 8. Graveyard owner actions inside gallery

In own Graveyard gallery:

right-click / contextual action on a card may expose:

- Inspeccionar;
- Devolver a la Mano;
- Mover al Campo.

Opponent Graveyard gallery:

- Inspeccionar only.

Do not expose edit actions based only on UI hiding; backend authority remains required.

---

# 9. Graveyard ordering

Preserve deterministic Graveyard ordering.

Do not reorder Graveyard just for gallery rendering.

If the current domain uses `zoneOrder`, keep it meaningful for PUBLIC Graveyard cards.

Hidden-card privacy rules later in this mission apply to private zones, not public Graveyard order.

---

# 10. Flip Face Up / Face Down in multiplayer

The domain/reducer already contains:

```text
FLIP_FACE_UP
FLIP_FACE_DOWN
```

Expose these actions in the multiplayer board where structurally appropriate.

For own/control public cards:

context menu may show:

- Voltear boca abajo;
- Voltear boca arriba.

Do not expose these actions in HAND if the current UX/domain does not need them.

Opponent cards remain read-only.

---

# 11. Face-down public card rendering

If a public Field card is face-down:

- opponent sees card back / hidden front identity according to existing domain visibility rules;
- owner behavior follows the current documented visibility model.

Do not leak front card identity through DOM props, image path, tooltip or PlayerView if that card should be hidden while face-down.

If current project docs do not define owner visibility for own face-down Field card, preserve the existing behavior and report it rather than inventing a new rule.

---

# 12. Essence Tap/Untap backend validation

Audit finding:

Essence Tap/Untap works, but backend validation relies on zone/control without explicitly validating card type.

Harden it.

For:

```text
TAP_CARD
UNTAP_CARD
```

when `zone === ESSENCE_ZONE`:

require the target card definition/type to be:

```text
ESSENCE
```

Do not allow a structurally invalid non-Essence card in ESSENCE_ZONE to gain valid Tap/Untap authority merely because of its zone.

Preserve Character/Relic Tap/Untap behavior.

---

# 13. Hidden-information hardening — principle

Private-zone cards must expose only the minimum data required for the viewer UI.

Do not send stable/internal metadata to the opponent merely because it is convenient.

Audit specifically identified unnecessary exposure of:

```text
instanceId
zoneOrder
ownerId
controllerId
```

for hidden Hand/Deck cards.

Review all hidden-card projections.

---

# 14. Opponent Hand representation

Opponent Hand must not expose real card identity or unnecessary stable identity.

Preferred safe model:

```text
handCount
```

and, if the UI requires placeholders:

```text
HiddenCardView {
  hidden: true
  ephemeralRenderKey?
}
```

Do not expose the real:

- instanceId;
- cardId;
- name;
- type;
- cost;
- rules text;
- image;
- zoneOrder;
- ownerId/controllerId

unless a field is strictly required and demonstrably non-sensitive.

Prefer count-based rendering when possible.

---

# 15. Opponent Main Deck representation

Opponent Main Deck should expose only what gameplay requires:

```text
remainingCount
```

Do NOT expose:

- CardInstance list;
- instanceIds;
- cardIds;
- zoneOrder;
- shuffled order;
- owner/controller metadata per hidden card.

The opponent should not be able to trace a specific hidden card through the deck.

---

# 16. Opponent Essence Deck representation

Same principle:

Opponent Essence Deck exposes:

```text
remainingCount
```

Do NOT expose:

- identities;
- instanceIds;
- ordered list;
- `zoneOrder`;
- owner/controller metadata per hidden card.

The confirmed Essence order remains private until each Essence moves into public `ESSENCE_ZONE`.

---

# 17. Own private zones

The owner may receive enough data to render and interact with their own:

- Hand;
- Main Deck when private inspection is explicitly allowed;
- Essence Deck during allowed preparation/private contexts.

Do not accidentally remove data the owner legitimately needs.

Privacy hardening must be viewer-relative.

---

# 18. Hidden card tracking risk

Review whether the opponent can infer hidden-card movement by stable placeholder identity.

Example risk:

```text
hidden instance abc
→ opponent draws
→ same hidden instance abc disappears from deck
→ placeholder abc appears in hand
```

Avoid stable cross-zone hidden identifiers for the opponent.

A hidden card should become identifiable to the opponent only when game rules make it public.

---

# 19. Public reveal transition

When a previously hidden card moves into a public zone:

- Field;
- Graveyard;
- Sanctuary;
- Essence Zone;
- Verse Resolution;

PlayerView may then expose the real public CardInstance identity/details required for gameplay.

Do not preserve a hidden placeholder identity contract unnecessarily.

---

# 20. Backend action authority must not rely on PlayerView IDs for hidden opponent cards

Clients must never need hidden opponent `instanceId`s to perform valid actions.

Any action involving an opponent hidden card should already be impossible unless game rules explicitly reveal/select it in a future mission.

Do not weaken privacy to support nonexistent actions.

---

# 21. Generic counter

Do NOT expand generic counter UX in this mission.

Preserve current domain support.

Do not reintroduce +/- controls into Characters, Essence or Sanctuary just because the audit marked generic counter partial.

This mission does not need to solve that.

---

# 22. Sanctuary activation out of scope

Do NOT implement:

```text
ACTIVATE_SANCTUARY
```

or equivalent in this mission.

The audit identified it as missing, but semantics have not yet been defined.

Leave it for a later focused mission.

---

# 23. Prologue / Epilogue out of scope

Do NOT implement selection or resolution semantics for:

```text
PRÓLOGO
EPÍLOGO
```

The CardDefinition fields remain.

A later mission will define the manual interaction.

---

# 24. UI authority matrix

Ensure the multiplayer board now behaves at least as follows:

## Own Field card
- Inspect
- Tap/Untap when supported
- Flip when supported
- Send to Graveyard
- Return to Hand

## Own Graveyard card
- Inspect
- Return to Hand
- Move to Field

## Opponent Field card
- Inspect only

## Opponent Graveyard card
- Inspect only

## Own hidden Hand
- existing own-hand interactions

## Opponent Hand
- count/backs only; no real card identifiers

---

# 25. Server authority

Convex must enforce all zone movement regardless of UI.

At minimum verify:

- actor session valid;
- card belongs/is controlled as required;
- source zone matches action;
- destination zone is structurally supported;
- opponent cards cannot be moved;
- attached references are cleaned atomically;
- Character leaving Field releases attached Relics as already defined.

Do not rely on context-menu visibility.

---

# 26. Tests — manual zone control

Add/update tests for:

- own Graveyard → Hand;
- own Graveyard → Field;
- opponent Graveyard → Hand rejected;
- opponent Graveyard → Field rejected;
- own Field → Hand;
- opponent Field → Hand rejected;
- attached Relic → Hand clears attachment;
- Character + attached Relics → Hand:
  - Character in HAND;
  - Relics remain FIELD;
  - Relics unattached;
  - Relic state preserved.

---

# 27. Tests — Graveyard UI / permissions

Test as appropriate:

- Graveyard overlay shows all public cards;
- own gallery exposes movement actions;
- opponent gallery exposes Inspect only;
- gallery does not hide overflow content.

Avoid brittle pixel tests.

---

# 28. Tests — flip

Add/update tests for:

- own supported public card → FLIP_FACE_DOWN;
- own face-down card → FLIP_FACE_UP;
- opponent flip rejected;
- public face-down projection does not expose forbidden front identity.

---

# 29. Tests — Essence authority

Add explicit backend tests:

- ESSENCE in ESSENCE_ZONE can TAP;
- ESSENCE in ESSENCE_ZONE can UNTAP;
- opponent Essence cannot be changed;
- non-ESSENCE card in ESSENCE_ZONE is rejected for Essence-specific Tap/Untap authority.

Preserve Character/Relic tests.

---

# 30. Tests — PlayerView privacy

Add focused privacy tests proving opponent PlayerView does NOT expose:

## Hand
- real instanceId;
- cardId;
- zoneOrder;
- owner/controller metadata per hidden card.

## Main Deck
- card list;
- instanceIds;
- cardIds;
- zoneOrder/order.

## Essence Deck
- card list;
- instanceIds;
- cardIds;
- confirmed order.

Also verify:

- handCount remains correct;
- deck counts remain correct;
- public Field/Graveyard/Essence Zone identities still work;
- attachment relationships remain public.

---

# 31. E2E privacy smoke

If current E2E environment is working, extend a smoke test:

A/B enter IN_GAME.

A has hidden Hand/Deck.

From B's rendered/query-visible data verify:
- only hand count/backs;
- no hidden card names/ids/order;
- Main Deck count only;
- Essence Deck count only.

Then:

A moves one card Hand → Field.

B now receives that card's public identity in Field.

Also test:

A moves a Graveyard card → Hand.

B sees Graveyard count change and Hand count change, but does NOT receive the hidden Hand card identity.

If E2E remains blocked by external Convex deployment configuration, do not weaken implementation; report separately.

---

# 32. Acceptance criteria

Mission is complete when:

1. owner can move Graveyard → Hand in multiplayer;
2. owner can move Graveyard → Field;
3. owner can move Field → Hand;
4. opponent cannot perform those movements;
5. Graveyards are fully inspectable through a real gallery;
6. own Graveyard gallery exposes manual movement actions;
7. flip actions work in multiplayer where supported;
8. Essence Tap/Untap explicitly validates ESSENCE type;
9. opponent Hand no longer exposes stable hidden-card metadata;
10. opponent Main Deck exposes count only;
11. opponent Essence Deck exposes count only;
12. public cards still expose full required data;
13. existing gameplay remains functional.

---

# 33. Out of scope

Do NOT implement:

- Sanctuary activation;
- Prologue/Epilogue selection;
- automatic effects;
- rules engine;
- combat automation;
- official assets;
- new board redesign;
- new preparation flow;
- inventory/economy;
- matchmaking;
- spectators.

---

# 34. Quality gates

Run and fix:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npm run test:e2e
```

If E2E is blocked exclusively by the known external/deployment issue, report that clearly and do not alter gameplay logic to mask it.

Final report: maximum 15 lines following `AGENTS.md`.

Report only:
- manual zone-control gaps completed;
- Graveyard gallery result;
- hidden-information changes;
- Essence Tap/Untap validation change;
- files modified;
- quality-gate results;
- any remaining ambiguity around face-down visibility.
