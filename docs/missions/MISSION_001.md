# MISSION 001 — FOUNDATION + INTERACTIVE BOARD SANDBOX

You are beginning implementation of the **Crónicas FCG Digital Playtesting Simulator**.

This repository contains persistent project instructions and product documentation.

Before doing anything else:

1. Read `/AGENTS.md`.
2. Read `/docs/PRODUCT_SPEC.md`.
3. Read `/docs/MVP_SCOPE.md`.
4. Read `/docs/CRONICAS_DOMAIN.md`.
5. Read `/docs/UX_SPEC.md`.
6. Read `/docs/ARCHITECTURE.md`.
7. Consult `/docs/CRONICAS_RULES.md` only when game-rule context is necessary.

Do not infer Crónicas rules from other TCGs.

---

# MISSION OBJECTIVE

Build the first executable vertical foundation of the project.

At the end of this mission I want to be able to run the application locally and see an **interactive Crónicas FCG board sandbox** that already demonstrates the intended architecture and visual direction.

This is NOT the full MVP.

Do not implement rooms, multiplayer gameplay, matchmaking, accounts or a rules engine yet.

---

# 1. Inspect the repository

Before modifying anything:

* inspect existing files;
* inspect `package.json`;
* inspect installed dependencies;
* inspect TypeScript configuration;
* inspect Next.js configuration;
* inspect Convex setup;
* determine whether the project already compiles.

Do not regenerate the project unnecessarily.

---

# 2. Verify required dependencies

The intended baseline is:

```text
Next.js
React
TypeScript
Tailwind CSS
Convex
Motion
dnd-kit
Zod
Vitest
React Testing Library
Playwright
```

Do not replace these technologies without a documented reason.

If one is missing and is required for this mission, install it.

Do not add large additional UI or state-management libraries.

In particular, do NOT introduce:

```text
Redux
Zustand
Three.js
Socket.IO
Supabase
Prisma
Drizzle
PostgreSQL
```

during this mission.

---

# 3. Create the domain foundation

Implement the initial pure TypeScript domain model under an appropriate structure based on `/docs/ARCHITECTURE.md`.

At minimum define:

```text
CardDefinition
CardInstance
CardType
CardStatus
CardZone

PlayerId
GameId
RoomId

GamePhase
GameState
PlayerGameState

GameAction
```

Respect the distinction:

```text
CardDefinition
!=
CardInstance
```

Do not add rules-engine fields such as:

```text
canAttack
canBlock
validTargets
effectAST
triggerEngine
```

---

# 4. CardDefinition

Represent the known structural differences between:

```text
CHARACTER
RELIC
VERSE
ESSENCE
SANCTUARY
```

Prefer a TypeScript discriminated union where appropriate.

Support the domain described in `CRONICAS_DOMAIN.md`, including:

### Character

```text
cost
attack
health
rulesText
```

### Relic

```text
cost
attackModifier
healthModifier
rulesText
```

### Verse

```text
cost
prologueText
epilogueText
```

### Essence

```text
rulesText
```

### Sanctuary

```text
health
rulesText
```

Do not convert card text into executable effects.

---

# 5. CardInstance

Support at minimum:

```text
instanceId
cardId

ownerId
controllerId

zone
zoneOrder

tapped
faceUp
counter

attachedToInstanceId
```

No pixel coordinates belong in CardInstance.

---

# 6. GameAction

Create a serializable discriminated union supporting the baseline actions documented in `CRONICAS_DOMAIN.md`.

At minimum include:

```text
DRAW_CARD
SHUFFLE_MAIN_DECK

DRAW_ESSENCE

PLAY_CHARACTER
PLAY_RELIC
PLAY_VERSE
RESOLVE_VERSE

MOVE_CARD
REORDER_FIELD

ATTACH_RELIC
DETACH_RELIC

TAP_CARD
UNTAP_CARD

FLIP_FACE_UP
FLIP_FACE_DOWN

CHANGE_CARD_COUNTER

CHANGE_SANCTUARY_HP
SET_SANCTUARY_HP

SET_PHASE
END_TURN
```

Do not implement rules automation around these actions.

---

# 7. Pure GameState transitions

Create a pure transition function conceptually equivalent to:

```ts
applyGameAction(
  state: GameState,
  action: GameAction
): GameState
```

It must not depend on React.

It must not depend on the DOM.

It must not depend on Motion or dnd-kit.

For this first mission, implement enough actions to drive the visual sandbox, especially:

```text
MOVE_CARD
PLAY_CHARACTER
PLAY_RELIC
PLAY_VERSE
RESOLVE_VERSE
TAP_CARD
UNTAP_CARD
DRAW_CARD
DRAW_ESSENCE
CHANGE_SANCTUARY_HP
CHANGE_CARD_COUNTER
REORDER_FIELD
```

Unsupported actions may initially fail explicitly rather than silently doing the wrong thing.

---

# 8. Mock card catalog

Create a small development catalog.

Do NOT scrape external websites.

Do NOT invent real Crónicas card data and present it as canonical.

Use clearly marked development/mock cards until official assets and metadata are imported.

Include enough examples to represent:

```text
2 Characters
2 Relics
2 Verses
2 Essences
1 Sanctuary
```

Use placeholder card artwork that is clearly development-only.

Prefer a visually coherent generic card placeholder rather than external stock images.

Structure the data so official cards can later replace the mock catalog without changing game components.

---

# 9. Card component

Create a reusable card component.

It must support:

* front;
* back;
* hover;
* selection;
* tapped orientation;
* face-down state;
* generic counter;
* high-resolution inspection overlay;
* owner/editability distinction.

Use Motion for presentation.

The card should already feel like an object on a digital table.

Avoid excessive effects.

---

# 10. Card inspection

Clicking a public/owned card should open a larger inspection view.

Requirements:

```text
Escape closes
click outside closes
aspect ratio preserved
text readable
```

The inspection component must be reusable.

---

# 11. Interactive board sandbox

Create a development route:

```text
/dev/board
```

This route represents a local sandbox only.

Clearly mark it internally as development tooling.

It must use a mock GameState and the same domain structures intended for multiplayer.

Do NOT create a separate simplified card model just for the sandbox.

---

# 12. Board perspective

The local player must always appear at the bottom.

The sandbox should visibly contain:

```text
Opponent
Opponent Main Deck
Opponent Essence Deck
Opponent Sanctuary
Opponent Essence Zone
Opponent Field
Opponent Graveyard

Verse Resolution Zone

Own Graveyard
Own Field
Own Essence Zone
Own Sanctuary
Own Essence Deck
Own Main Deck

Own Hand
```

Do not design it as a dashboard grid.

Follow `UX_SPEC.md`.

---

# 13. Dynamic Character field

The Field must NOT display a fixed grid of empty slots.

Character slots exist dynamically.

If there are:

```text
0 Characters
```

the field should remain visually open.

If there are:

```text
3 Characters
```

display three Character slots.

Character slots must compact naturally.

---

# 14. Relic attachment

Each Character slot must visually support:

```text
0..N Relics
```

Relics associated with a Character should appear clearly attached to that Character.

Also implement an area for:

```text
unattached Relics
```

on the Field.

Attachment is represented through:

```text
attachedToInstanceId
```

Do not embed Relic objects inside Character state.

---

# 15. Hand

Implement the own Hand as a digital TCG hand.

Requirements:

* bottom of viewport;
* slight fan;
* overlap;
* hover lift;
* readable selected card;
* automatic ordering by card type;
* no manual hand reordering.

Opponent hand should show card backs only.

---

# 16. Drag and drop

Use dnd-kit.

Implement at least these sandbox movements:

```text
HAND → FIELD
FIELD → GRAVEYARD

HAND Verse → VERSE_RESOLUTION
VERSE_RESOLUTION → GRAVEYARD

HAND Relic → FIELD unattached
Relic → Character attachment

Character Field reorder
```

Do not permit arbitrary movement to Essence Zone.

---

# 17. Essence interaction

Mock Essence Deck must preserve an explicit order.

Implement:

```text
DRAW_ESSENCE
```

which always moves only the first Essence into Essence Zone.

In Essence Zone:

* card may be inspected;
* tapped;
* untapped.

Do not allow Essence cards to be freely dragged to unrelated zones.

---

# 18. Main Deck interaction

Implement sandbox:

```text
DRAW_CARD
```

with a visible transition from Deck to Hand.

Main Deck should show remaining count.

No full private deck-search UI is required in Mission 001.

---

# 19. Verse Resolution Zone

The central Verse Resolution Zone must be visually important.

Dragging a Verse from Hand into it should:

* move the card to the center;
* enlarge it moderately;
* animate its arrival;
* keep it readable;
* allow inspection.

Provide a manual action to resolve it to Graveyard.

Do NOT execute Prologue or Epilogue effects.

---

# 20. Sanctuary

Show:

```text
Sanctuary card
current HP
[-] [+]
```

Changing HP must:

* update GameState through GameAction;
* animate the numeric change;
* provide restrained impact feedback.

Do not calculate damage automatically.

---

# 21. Tap / Untap

Implement explicit:

```text
TAP_CARD
UNTAP_CARD
```

with animated approximately 90-degree rotation.

Double-click may act as a shortcut.

Do not implement a generic domain `TOGGLE_TAP` action.

---

# 22. Generic counter

Cards must support the generic counter from the domain.

Provide a small unobtrusive control or context interaction for:

```text
+1
-1
```

Do not assign semantic meaning to the counter.

---

# 23. Right-click context menu

For editable own cards, provide a compact contextual menu with structurally relevant actions.

Examples:

```text
Inspect
Tap
Untap
Flip face down
Flip face up
Send to Graveyard
Return to Hand
```

Only show actions that make structural sense from that card's current zone.

Do not present opponent cards as editable.

---

# 24. Animation quality

The board must demonstrate the intended 2.5D direction.

Use Motion for:

* hover lift;
* scale;
* layout transitions;
* tap;
* card entry/exit;
* Sanctuary feedback;
* inspection.

Use CSS perspective/shadows carefully.

Do not add Three.js.

Do not add heavy particle systems.

This is a visual foundation, not final art direction.

---

# 25. dnd-kit vs Motion

Follow the architecture rule:

```text
dnd-kit
→ drag/drop semantics

Motion
→ visual presentation
```

Do not make both libraries independently control the same drag transform.

Avoid conflicting drag implementations.

---

# 26. Convex foundation

Verify Convex is configured.

Create a minimal backend/schema foundation compatible with the architecture.

For Mission 001 it is sufficient to prove connectivity with a small development query or health-style record/function.

Do NOT implement full room/game multiplayer yet.

Do NOT persist the sandbox GameState as the final multiplayer game implementation.

The sandbox is a visual/domain harness.

---

# 27. Testing

Configure Vitest if it is not already configured.

Write unit tests for at least:

```text
DRAW_CARD
DRAW_ESSENCE
PLAY_CHARACTER / Hand → Field
PLAY_RELIC attachment
PLAY_VERSE → Verse Resolution
RESOLVE_VERSE
TAP_CARD
UNTAP_CARD
CHANGE_SANCTUARY_HP
REORDER_FIELD
```

Also test the important Essence invariant:

> DRAW_ESSENCE always uses the first card of the ordered Essence Deck.

---

# 28. Privacy model preparation

Do NOT implement multiplayer PlayerView yet.

However, organize the types so that the future architecture can distinguish:

```text
GameState
PlayerView
```

Do not couple the visual card component to full authoritative GameState.

Components should render safe view-model/card-view data.

---

# 29. Scripts

Ensure package scripts exist for:

```text
npm run dev
npm run build
npm run lint
npm run typecheck
npm run test
```

If Playwright is configured during this mission, also:

```text
npm run test:e2e
```

Do not add scripts that do not work.

---

# 30. Quality gates

Before declaring the mission complete, run:

```text
npm run lint
npm run typecheck
npm run test
npm run build
```

Fix failures introduced by this implementation.

Do not claim success while these checks fail.

---

# 31. Do not implement during Mission 001

Explicitly out of scope:

```text
room creation
room joining
production player sessions
full multiplayer
PlayerView privacy filtering
reconnection
presence
matchmaking
accounts
deck persistence backend
rules engine
combat engine
automatic cost payment
automatic card effects
full card catalog
real card scraping
admin panel
chat
spectators
analytics
```

Do not implement them “while you're here”.

---

# 32. Deliverable

At completion I should be able to:

```bash
npm run dev
```

open:

```text
/dev/board
```

and interact with a visually convincing prototype of the Crónicas board.

I should be able to:

1. inspect cards;
2. draw a card;
3. drag a Character from Hand to Field;
4. reorder Characters;
5. play and attach a Relic;
6. leave a Relic unattached;
7. move a Verse to the Resolution Zone;
8. resolve that Verse to Graveyard;
9. draw the top Essence;
10. tap/untap cards;
11. modify Sanctuary HP;
12. modify a generic card counter;
13. observe clear 2.5D animations.

The implementation must use the real project domain architecture rather than disposable UI-only mock logic.

---

# 33. Completion report

When finished, report concisely:

### Implemented

What is now working.

### Architecture

Important decisions made.

### Files

Main files created/modified.

### Verification

Exact result of:

```text
lint
typecheck
tests
build
```

### Known limitations

Only actual remaining limitations of Mission 001.

### Next recommended milestone

Do not implement the next milestone yet.
