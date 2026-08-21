\
# Crónicas FCG Digital Playtesting Simulator — Architecture Specification

**Status:** Baseline architecture for MVP V0.1  
**Date:** 2026-08-20  
**Scope:** Technical architecture before repository initialization

---

# 1. Purpose

This document defines the technical architecture for the first playable version of the **Crónicas FCG Digital Playtesting Simulator**.

The architecture is optimized for:

1. rapid iteration with Codex;
2. authoritative 1v1 multiplayer;
3. real server-side privacy;
4. reconnection;
5. deterministic and serializable game actions;
6. future replay/analytics support;
7. high-quality 2.5D card interactions;
8. avoiding premature rules-engine complexity.

Core product principle:

> **The MVP knows the structure of Crónicas, but does not arbitrate Crónicas.**

Core architecture principle:

> **The server owns the game state. Each client owns a perspective of that state.**

---

# 2. Selected stack

## Frontend / Web Application

```text
Next.js
React
TypeScript
App Router
Tailwind CSS
```

Use the current stable/recommended Next.js setup at project initialization.

Desktop-first.

---

# 3. Hosting

Frontend deployment:

```text
Vercel
```

Responsibilities:

- Next.js application;
- routes;
- static assets;
- card images;
- web delivery;
- production previews.

The game realtime path should NOT depend on a long-running custom Next.js WebSocket server for MVP V0.1.

---

# 4. Realtime backend

Selected:

```text
Convex
```

Convex is responsible for:

- authoritative room state;
- authoritative GameState;
- multiplayer mutations;
- realtime subscriptions;
- reconnection state retrieval;
- player session validation;
- privacy filtering;
- GameAction log;
- room lifecycle persistence.

Clients communicate with Convex through its React client.

---

# 5. Why Convex for V0.1

The project requires:

```text
two browsers
+
shared authoritative state
+
private player information
+
rapid state propagation
+
reconnection
```

Convex fits this requirement without requiring the project to build and operate:

```text
custom WebSocket server
+
connection routing
+
durable realtime state
+
separate persistence layer
```

This reduces infrastructure work during the most iterative stage of the project.

---

# 6. Rejected initial alternatives

These alternatives are NOT forbidden permanently.

They are simply not the V0.1 baseline.

## Custom Socket.IO / WebSocket server

Not selected initially because it increases operational complexity:

```text
Next.js
+
WebSocket server
+
database
+
presence
+
reconnection logic
+
deployment strategy
```

Reconsider only if Convex becomes a technical limitation.

## Native Vercel WebSockets

Vercel WebSocket support is available but is still a newer deployment path and durable cross-connection state requires an additional persistence strategy.

Not necessary while Convex satisfies the product requirements more directly.

## Supabase Realtime

Technically viable.

Not selected because V0.1 benefits from having queries, mutations, storage and realtime behavior in one strongly integrated TypeScript-oriented backend.

## Neon as game-state backend

Neon remains a valid option for future relational/analytics workloads.

It is not selected as the primary realtime game-state engine in V0.1.

---

# 7. High-level architecture

```text
┌───────────────────────────────────────────────────────┐
│                       VERCEL                          │
│                                                       │
│                  Next.js / React                      │
│                                                       │
│  Home · Deck Builder · Lobby · Preparation · Board   │
│                                                       │
└───────────────────────┬───────────────────────────────┘
                        │
                        │ Convex React client
                        ▼
┌───────────────────────────────────────────────────────┐
│                       CONVEX                          │
│                                                       │
│  Rooms                                                │
│  Player Sessions                                      │
│  GameState                                            │
│  Mutations                                            │
│  PlayerView Queries                                   │
│  GameAction Log                                       │
│                                                       │
└───────────────────────────────────────────────────────┘

Browser A                                      Browser B
Player A                                       Player B
   │                                              │
   └──────────── reactive PlayerView ─────────────┘
```

---

# 8. Data ownership

Different data categories have different owners.

## Card catalog

V0.1 source:

```text
local structured data
+
local card assets
```

Suggested:

```text
src/data/cards.json
public/cards/
```

No database is required for released card definitions during V0.1.

---

# 9. Deck ownership

Decks belong initially to the browser.

Persistence:

```text
localStorage
```

The Deck Builder must access local persistence through a dedicated repository/service abstraction.

React components must not directly scatter `localStorage` calls throughout the UI.

Example concept:

```text
DeckRepository
  list()
  get(id)
  save(deck)
  remove(id)
```

This allows future migration to cloud decks.

---

# 10. Match ownership

Game rooms and active games belong to the backend.

Convex stores:

- room;
- seats;
- temporary player identity;
- preparation state;
- current GameState;
- action history;
- status;
- connection/presence metadata where needed.

---

# 11. No mandatory user accounts

V0.1 does not require authentication accounts.

Each seat uses an opaque temporary session credential.

Conceptually:

```text
roomCode
playerId
playerSessionToken
```

`roomCode` is shareable.

`playerSessionToken` is private.

Never treat possession of the room code alone as authority to control a seat.

---

# 12. Temporary player session

When creating or joining a room, the backend associates the seat with an opaque token.

Client stores the token locally so refresh can recover the seat.

Suggested storage:

```text
localStorage
```

The token must:

- be hard to guess;
- not appear in shareable URLs;
- not be displayed in UI;
- be required for private player queries/mutations.

A future account/auth system can replace this mechanism.

---

# 13. Room identity

Rooms use two identifiers:

```text
internalRoomId
publicRoomCode
```

`internalRoomId` is backend identity.

`publicRoomCode` is short and shareable.

Suggested code alphabet should avoid ambiguous characters when practical.

Example:

```text
K7M4QF
```

Do not use the public code as the database primary identity when avoidable.

---

# 14. Room lifecycle

Supported states:

```text
CREATED
WAITING_FOR_PLAYER
PREPARATION
IN_GAME
FINISHED
ABANDONED
```

Transitions must occur through backend mutations.

Clients do not set arbitrary room state directly.

---

# 15. Seats

A room has at most:

```text
PLAYER_1
PLAYER_2
```

Seat is NOT equivalent to starting player.

Maintain separately:

```text
seat
startingPlayerId
activePlayerId
```

---

# 16. GameState authority

There is exactly one authoritative current `GameState` per active game.

Conceptual direction:

```text
GameAction
   ↓
server validation
   ↓
applyGameAction()
   ↓
new GameState
   ↓
persist
   ↓
reactive PlayerViews
```

Clients must not directly persist modified GameState.

---

# 17. GameState model

The exact TypeScript shape may evolve, but must conceptually contain:

```text
gameId
roomId

status

revision
turnNumber
activePlayerId
startingPlayerId
phase

players

cardInstances

zone/order information

sanctuary state

preparation state where applicable
```

Avoid duplicating the same state in several structures unless necessary.

---

# 18. Revision

GameState contains a monotonically increasing:

```text
revision
```

Every accepted GameAction increments it.

Uses:

- debugging;
- stale-state detection;
- action ordering;
- animation sequencing;
- future replay support.

Do not use timestamps as the sole ordering mechanism.

---

# 19. CardDefinition

CardDefinition is immutable game content.

It must NOT contain:

- current zone;
- tapped state;
- counters;
- controller;
- current associations;
- temporary state.

Definitions come from the catalog.

See:

```text
docs/CRONICAS_DOMAIN.md
```

---

# 20. CardInstance

Every physical copy participating in a game receives an immutable:

```text
instanceId
```

Minimum conceptual state:

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

Never use array index as card identity.

---

# 21. Shared domain layer

The project must contain a pure TypeScript domain layer.

Suggested location:

```text
src/domain/
```

It must NOT import:

- React;
- DOM APIs;
- Motion;
- dnd-kit;
- Next.js UI APIs.

It should contain:

```text
types
actions
reducers/state transitions
selectors
permissions
visibility helpers
domain invariants
```

This layer should be importable by both UI and backend when runtime-compatible.

---

# 22. Suggested domain structure

```text
src/domain/
├── cards/
│   ├── card.types.ts
│   └── card.schema.ts
│
├── decks/
│   ├── deck.types.ts
│   └── deck.validation.ts
│
└── game/
    ├── game.types.ts
    ├── game.actions.ts
    ├── game.reducer.ts
    ├── game.permissions.ts
    ├── game.visibility.ts
    ├── game.selectors.ts
    └── game.constants.ts
```

Names may evolve, but responsibilities should remain separated.

---

# 23. GameAction

GameAction must be a serializable TypeScript discriminated union.

Example style:

```ts
type GameAction =
  | {
      type: "DRAW_CARD";
      playerId: string;
    }
  | {
      type: "TAP_CARD";
      instanceId: string;
    }
  | {
      type: "CHANGE_SANCTUARY_HP";
      playerId: string;
      amount: number;
    };
```

Do not include:

- functions;
- class instances;
- DOM objects;
- React references;
- unserializable values.

---

# 24. Action envelope

Network mutations should wrap domain actions in metadata.

Conceptual shape:

```text
GameActionEnvelope

clientActionId
roomId
actorPlayerId
action
```

The server resolves:

- current room;
- current player session;
- authority;
- current GameState.

Server metadata such as sequence and timestamp must be assigned server-side.

---

# 25. GameAction log

Accepted actions are stored as an append-only history.

Conceptual record:

```text
sequence
gameId
actorPlayerId
action
createdAt
inverseAction | null
```

The raw action log is backend/internal data.

Do not expose hidden information from raw actions to the opponent.

---

# 26. Undo architecture

Undo operates on the latest accepted global action.

For V0.1:

- requesting player must be the actor of the latest undoable action;
- no later action may exist;
- action must have a valid inverse.

Preferred design:

```text
applyGameAction()
→ nextState
→ inverseAction
```

Store the inverse with the action record when practical.

Do NOT reconstruct Undo from UI history.

---

# 27. Pure state transitions

Core transitions should be testable as pure functions when possible.

Concept:

```text
applyGameAction(
  state,
  action
) => nextState
```

Server-side authorization and session validation happen outside the pure reducer.

The reducer handles domain transitions.

This separation is mandatory.

---

# 28. Structural validation vs game-rule validation

Server validates STRUCTURE and AUTHORITY.

Examples that SHOULD be enforced:

- player cannot manipulate opponent-owned private cards;
- `DRAW_ESSENCE` takes only the top Essence;
- Essence Deck cannot be shuffled during game;
- Essence Deck cannot be reordered after preparation;
- player cannot occupy an opponent seat;
- invalid instance IDs are rejected;
- card cannot exist simultaneously in multiple zones;
- only permitted controller can change its Sanctuary HP.

Examples NOT enforced automatically in V0.1:

- enough Essence to pay cost;
- correct phase to play a card;
- legal target;
- combat legality;
- card-effect restrictions;
- timing windows.

---

# 29. Server permissions

Every mutation that changes game state must validate:

```text
session
room membership
seat
authority
room status
structural action legality
```

Do not trust UI disabling as security.

---

# 30. PlayerView

Clients do NOT subscribe to raw GameState.

They subscribe to a server-generated:

```text
PlayerView
```

Concept:

```text
GameState + viewerPlayerId
        ↓
buildPlayerView()
        ↓
safe client state
```

`buildPlayerView` must be server-side or otherwise execute in a trusted backend context.

---

# 31. Hidden card representation

When a card identity is private to the viewer, PlayerView should not include the real `cardId`.

Use a safe representation such as:

```text
HiddenCardView

instanceId? only if safe/necessary
faceUp = false
known = false
```

Be conservative.

Avoid leaking:

- name;
- cardId;
- type;
- faction;
- cost;
- image path;
- rules text

when the viewer should not know them.

---

# 32. Public zones

Public information may include:

- Field;
- Graveyard;
- Sanctuary;
- Essence Zone;
- Verse Resolution.

Each PlayerView may resolve their public CardDefinitions normally.

---

# 33. Private deck inspection

Opening the Main Deck is a private view.

Recommended architecture:

```text
query privateDeckInspection(room, token)
```

or equivalent.

Do not add hidden deck identities to the normal opponent PlayerView.

When the inspection overlay closes, no special game-state mutation is required unless a card was moved/reordered.

---

# 34. Preparation privacy

Each player configures Essence order privately.

Opponent PlayerView should know only:

```text
ready / not ready
```

not the ordered Essence identities.

When game begins, only Essences that enter the public Essence Zone become visible.

---

# 35. Realtime synchronization

Use Convex reactive queries for multiplayer state.

Each board client subscribes to its PlayerView.

Expected conceptual flow:

```text
Mutation accepted
      ↓
GameState updated
      ↓
PlayerView query invalidated
      ↓
both browsers receive new consistent views
```

Avoid building a second manual synchronization layer over Convex unless required.

---

# 36. Optimistic UI

Correctness comes first.

Optimistic updates MAY be added for highly frequent, low-risk actions such as:

- tap;
- untap;
- local reordering;
- Sanctuary counter;
- simple card movement.

They are not mandatory in the first implementation pass.

Never let optimistic UI become another authoritative state store.

On rejection:

```text
rollback
+
small error feedback
```

---

# 37. Presence and connection status

Presence is UX metadata, not game state.

A disconnect must never alter GameState.

V0.1 may implement simple presence via heartbeat / last-seen metadata.

Concept:

```text
lastSeenAt
connectionStatus derived by client/query
```

Presence is allowed to be eventually consistent.

Do not block gameplay state restoration on perfect presence tracking.

---

# 38. Reconnection

On page load for a room:

```text
read room code
+
recover playerSessionToken
+
request PlayerView
```

If token is valid:

```text
restore seat
restore board
restore private perspective
```

A browser refresh must not create a new seat.

---

# 39. Frontend state categories

Use three separate state categories.

## Authoritative multiplayer state

Owned by Convex:

```text
PlayerView
room
game
preparation
```

## Persistent local user state

Owned by browser storage:

```text
saved decks
display preferences if added
player session token
```

## Ephemeral UI state

Owned by React:

```text
selected card
hover
open modal
context menu
drag state
inspection overlay
animation state
```

Do not merge these categories.

---

# 40. Client state library

Do NOT introduce a global state library in the initial implementation unless necessary.

Preferred initial approach:

```text
Convex queries
+
React state
+
small Context/hooks where appropriate
```

If UI state becomes meaningfully difficult to manage, Zustand may be evaluated later.

Do not mirror Convex PlayerView into Zustand.

---

# 41. Drag and drop

Selected:

```text
dnd-kit
```

Use for:

- drag sensors;
- droppable detection;
- sortable areas;
- field reordering;
- Essence ordering during preparation;
- card movement semantics.

Suggested packages:

```text
@dnd-kit/core
@dnd-kit/sortable
@dnd-kit/utilities
```

---

# 42. Animation

Selected:

```text
Motion for React
```

Package:

```text
motion
```

Use:

```text
motion/react
```

Use Motion for:

- hover;
- lift;
- scale;
- tilt;
- layout transitions;
- AnimatePresence;
- springs;
- Sanctuary feedback;
- zone transitions;
- card inspection transitions.

---

# 43. Separation between dnd-kit and Motion

Avoid competing ownership of drag transforms.

Principle:

```text
dnd-kit
→ drag/drop semantics and hit testing

Motion
→ presentation and animation
```

For gameplay drag, dnd-kit should generally own drag state.

Use Motion around the drag lifecycle rather than simultaneously implementing a separate Motion `drag` gesture for the same card.

`DragOverlay` may be styled/animated using Motion where practical.

---

# 44. 2.5D visual implementation

Use:

- CSS transforms;
- `transform-origin`;
- perspective;
- GPU-friendly translate/scale/rotate;
- Motion layout animations;
- CSS shadows;
- restrained glow.

Do not introduce Three.js/WebGL in MVP V0.1.

---

# 45. CSS strategy

Selected:

```text
Tailwind CSS
+
CSS variables
+
small dedicated CSS modules/files where complex transforms require them
```

Avoid large inline style objects for the entire board.

Use CSS variables for design tokens such as:

```text
--card-width
--card-radius
--board-perspective
--zone-gap
--animation-fast
```

---

# 46. Component architecture

Suggested UI structure:

```text
src/components/
├── cards/
│   ├── Card.tsx
│   ├── CardBack.tsx
│   ├── CardPreview.tsx
│   └── CardCounter.tsx
│
├── board/
│   ├── GameBoard.tsx
│   ├── PlayerHalf.tsx
│   ├── CharacterField.tsx
│   ├── CharacterSlot.tsx
│   └── UnattachedRelics.tsx
│
├── zones/
│   ├── HandZone.tsx
│   ├── MainDeckZone.tsx
│   ├── EssenceDeckZone.tsx
│   ├── EssenceZone.tsx
│   ├── GraveyardZone.tsx
│   ├── SanctuaryZone.tsx
│   └── VerseResolutionZone.tsx
│
├── preparation/
├── lobby/
├── deck-builder/
└── ui/
```

Exact names may evolve.

Avoid single components containing the whole board.

---

# 47. Route architecture

Suggested App Router routes:

```text
/
├── deck-builder/
├── room/
│   └── [code]/
└── optional development routes
```

`/room/[code]` can render different room phases:

```text
WAITING_FOR_PLAYER
PREPARATION
IN_GAME
FINISHED
```

Prefer state-driven room rendering over unnecessary route hopping for every phase.

---

# 48. Server Components vs Client Components

Use Server Components for static/shell content where useful.

Interactive game surfaces will necessarily be Client Components.

Do not force the board into Server Components.

Suggested:

```text
route/layout
→ Server Component where practical

GameBoard
DeckBuilder interactions
Lobby realtime UI
→ Client Components
```

---

# 49. Convex project structure

Suggested:

```text
convex/
├── schema.ts
├── rooms.ts
├── players.ts
├── games.ts
├── gameActions.ts
├── playerViews.ts
└── presence.ts
```

Avoid creating one giant backend file.

---

# 50. Backend responsibilities

## rooms

- create room;
- join room;
- get room metadata;
- lifecycle transitions.

## players

- seat/session creation;
- validate player token;
- ready state.

## games

- initialize game;
- authoritative game document;
- finish/abandon.

## gameActions

- submit action;
- authorize;
- structurally validate;
- apply reducer;
- log action;
- Undo.

## playerViews

- build safe per-player state.

## presence

- optional heartbeat/last-seen behavior.

---

# 51. Suggested database entities

Conceptually:

```text
rooms
players
games
gameActions
```

Do not create separate database rows for every CardInstance unless evidence shows that is needed.

For a two-player TCG, storing active GameState as a cohesive document is preferred initially because:

- state is small;
- transitions are atomic;
- reads are naturally game-scoped;
- PlayerView generation is straightforward.

Normalize only when there is a demonstrated need.

---

# 52. Game document

Suggested:

```text
games
- roomId
- status
- revision
- gameState
- createdAt
- updatedAt
```

The exact Convex schema must use supported values/validators.

Do not store React-specific or class-based objects.

---

# 53. Action document

Suggested:

```text
gameActions
- gameId
- sequence
- actorPlayerId
- type
- payload
- inverseAction
- createdAt
```

Add indexes needed for:

```text
gameId + sequence
```

Raw action history is not automatically public.

---

# 54. Card data validation

Card catalog data should be validated at development/build boundary.

Recommended:

```text
Zod
```

for static JSON and application-domain validation where useful.

Convex server functions should also use Convex argument validators at backend boundaries.

Do not assume TypeScript types validate runtime data.

---

# 55. Card assets

Initial source:

```text
public/cards/
```

Use stable filenames based on card identity rather than visible display name where possible.

Example:

```text
public/cards/MK-ORD-001.webp
```

Catalog:

```text
image: "/cards/MK-ORD-001.webp"
```

Do not depend on remote official-site image URLs for gameplay.

---

# 56. Image variants

Preferred eventual asset strategy:

```text
board-sized optimized image
+
high-resolution inspection image
```

V0.1 may start with one source asset if necessary.

Do not block development waiting for full optimization.

---

# 57. Card back

Use one or more explicit shared card-back assets.

Do not generate card backs dynamically from hidden front cards.

Hidden client views should never require loading the real front image.

---

# 58. Deck model

Suggested conceptual type:

```text
DeckDefinition

id
name

mainDeck[]
arsenal[]
essenceDeck[]
sanctuaryCardId

createdAt
updatedAt
```

Use quantities or expanded lists consistently.

For ordered Essence Deck, ordering must be explicit.

---

# 59. Sending deck to room

When a player enters preparation, client sends a snapshot of the selected deck configuration to backend.

The backend creates game-owned CardInstances.

After game creation, changing the local saved deck must NOT mutate the ongoing match.

---

# 60. Game initialization

Backend should create unique CardInstances for all cards used in the match.

Concept:

```text
DeckDefinition
      ↓
createGame()
      ↓
CardInstance[]
```

A `CardDefinition` is never mutated.

---

# 61. Main Deck randomness

Randomization of an active multiplayer deck must not rely on a client-provided final random order.

When shuffle functionality is used, authoritative order should be produced/accepted by trusted backend logic.

Do not expose hidden shuffled order to the opponent.

---

# 62. Essence Deck ordering

Essence ordering is selected privately by its owner during PREPARATION.

Server stores the authoritative order after confirmation.

Opponent receives only:

```text
ready status
remaining count where appropriate
```

---

# 63. Hand sorting

Canonical hand contents are game state.

Visual hand order is derived by selector:

```text
sortHandForDisplay()
```

Do not mutate authoritative card history simply to render CHARACTER before VERSE before RELIC.

Display order and game-zone identity are separate.

This is important.

---

# 64. Field order

Field order IS meaningful UI/game-table state because players explicitly reorder their field.

Persist a stable `zoneOrder`.

Do not store pixel coordinates.

---

# 65. Reliquary attachment

Association is represented by relationship:

```text
relic.attachedToInstanceId
```

Do not embed Relic CardInstances inside Character objects.

When the character leaves field and rules do not say otherwise, the Relic can remain:

```text
zone = FIELD
attachedToInstanceId = null
```

---

# 66. Verse Resolution

Verse Resolution is explicit state.

A Verse CardInstance may have:

```text
zone = VERSE_RESOLUTION
```

The selected Prólogo/Epílogo should eventually belong to action/resolution state, not CardDefinition.

---

# 67. Animation architecture

Animation state is not persisted.

Correct direction:

```text
authoritative update
       ↓
PlayerView change
       ↓
UI transition
       ↓
animation
```

Do not wait for animation completion to commit authoritative game state.

---

# 68. Action-aware animation

Where state diff alone is insufficient, PlayerView may include a sanitized recent-event descriptor.

Concept:

```text
lastEvent
```

It must contain only information visible to that viewer.

Example opponent draw:

```text
type = DRAW_CARD
playerId = opponent
cardIdentity = hidden
```

Example own draw:

```text
type = DRAW_CARD
playerId = self
cardId = visible
```

Do not expose raw GameAction logs for animation.

---

# 69. Error architecture

Domain errors should be distinguishable from infrastructure errors.

Examples:

```text
UNAUTHORIZED_ACTION
INVALID_SESSION
ROOM_NOT_FOUND
STALE_ROOM
INVALID_STRUCTURAL_MOVE
ACTION_NOT_UNDOABLE
```

UI converts them to concise user-facing feedback.

Avoid leaking backend internals.

---

# 70. Logging

Development logging should include:

```text
roomId
gameId
revision
action type
actor
```

Do NOT log:

- full private hands;
- session tokens;
- hidden deck orders

unless explicitly required during local debugging and removed afterward.

---

# 71. Testing strategy

Testing is mandatory for the domain layer.

Selected stack:

```text
Vitest
React Testing Library
Playwright
```

---

# 72. Unit tests

Prioritize tests for:

```text
applyGameAction
visibility filtering
permissions
Essence Deck behavior
CardInstance movement
Reliquary attachment
Undo/inverse actions
hand display sorting
```

Tests should reference documented domain behavior.

---

# 73. Component tests

Use React Testing Library selectively for:

- Deck Builder interactions;
- card context actions;
- zone rendering;
- hidden/public rendering.

Do not attempt to unit-test every animation frame.

---

# 74. End-to-end tests

Playwright should cover critical two-player flows.

Minimum eventual V0.1 smoke flow:

```text
Browser A creates room
Browser B joins
both select decks
both prepare
game starts
A draws/moves card
B receives update
private hand remains hidden
refresh A
A reconnects
```

Use two browser contexts to validate privacy.

---

# 75. Animation testing

Animations should be tested primarily through:

- final state;
- interaction;
- reduced-motion compatibility where practical.

Avoid brittle timing assertions.

---

# 76. TypeScript

Use strict TypeScript.

Required intent:

```text
"strict": true
```

Avoid:

```text
any
```

unless there is a documented boundary reason.

Prefer discriminated unions and exhaustive switches.

---

# 77. Exhaustive action handling

GameAction reducer should fail compilation/tests when a new action is added but not handled.

Recommended:

```text
assertNever(action)
```

or equivalent exhaustive pattern.

---

# 78. Formatting and linting

Use the Next.js recommended ESLint baseline.

Formatting may use Prettier if added during initialization.

Do not add overlapping formatters/linters unnecessarily.

---

# 79. Required scripts

Project should expose at least:

```text
npm run dev
npm run build
npm run lint
npm run typecheck
npm run test
npm run test:e2e
```

Where a script is introduced, keep documentation synchronized.

---

# 80. Development environment

Baseline:

```text
Node.js >= 20.9
npm
```

Use the Node requirement of the selected current Next.js version at initialization if higher.

Commit lockfile.

---

# 81. Environment variables

Expected initial variables include Convex-generated configuration such as:

```text
NEXT_PUBLIC_CONVEX_URL
CONVEX_DEPLOYMENT
```

Exact values must follow current Convex tooling.

Never commit secrets.

Provide:

```text
.env.example
```

when custom variables are introduced.

---

# 82. Repository structure

Suggested baseline:

```text
/
├── AGENTS.md
├── docs/
│   ├── PRODUCT_SPEC.md
│   ├── MVP_SCOPE.md
│   ├── CRONICAS_DOMAIN.md
│   ├── CRONICAS_RULES.md
│   ├── RULES_CLARIFICATIONS.md
│   ├── UX_SPEC.md
│   └── ARCHITECTURE.md
│
├── public/
│   ├── cards/
│   └── ui/
│
├── src/
│   ├── app/
│   ├── components/
│   ├── data/
│   ├── domain/
│   ├── hooks/
│   ├── lib/
│   └── storage/
│
├── convex/
├── tests/
└── package.json
```

Do not create folders with no meaningful responsibility merely to match this proposal.

---

# 83. Import boundaries

Recommended direction:

```text
UI
 ↓
application hooks/services
 ↓
domain

backend
 ↓
domain
```

Domain must not depend upward on UI or backend framework details.

---

# 84. No rules engine package

Do NOT create:

```text
src/rules-engine/
```

during V0.1 unless a future task explicitly starts rules automation.

Do not preemptively create generic effect ASTs or target engines.

---

# 85. No microservices

V0.1 architecture is intentionally simple:

```text
Next.js
+
Convex
```

Do not split:

- room service;
- game service;
- deck service;
- websocket service

into independently deployed services.

---

# 86. No premature SQL layer

Do not add PostgreSQL/Neon solely because it may be useful later.

Future analytics can receive exported/replicated action data if required.

Architecture should evolve from observed needs.

---

# 87. Performance strategy

Most important performance goals:

- fast pointer response;
- low input latency;
- minimal global rerenders;
- efficient card image loading;
- stable board layout;
- targeted reactive subscriptions.

Do not optimize backend for thousands of simultaneous players before MVP validation.

---

# 88. React rendering

Split board into memoizable zone/card components when beneficial.

Avoid a single giant component where every hover rerenders the entire board.

Local hover/drag animation state should stay as close to the relevant UI component as possible.

---

# 89. Reduced motion

Where practical, honor:

```text
prefers-reduced-motion
```

Motion provides reduced-motion utilities.

Gameplay information must not depend exclusively on animation.

---

# 90. Security boundary

Treat browser as untrusted.

Server must validate:

- session;
- room;
- actor;
- card authority;
- structural transition.

Never expose an internal mutation that lets a client replace entire GameState.

Bad:

```text
setGameState(newState)
```

Good:

```text
submitGameAction(action)
```

---

# 91. Mutation boundary

Primary gameplay write API should conceptually resemble:

```text
submitGameAction({
  roomCode,
  playerSessionToken,
  clientActionId,
  action
})
```

Backend:

```text
validate
→ load
→ authorize
→ apply
→ persist
→ log
```

Avoid one backend mutation per UI component if actions can share this boundary.

Room/preparation lifecycle mutations may remain separate.

---

# 92. Idempotency

Each client gameplay action should include:

```text
clientActionId
```

as an opaque unique identifier.

Although backend infrastructure may already protect mutation retries, explicit action IDs help:

- debugging;
- future deduplication;
- client reconciliation;
- logs.

Do not use visible card IDs as action IDs.

---

# 93. Timestamps

Server owns authoritative timestamps.

Client timestamps may be used for local animations but not for action ordering.

---

# 94. Dates and analytics

Store machine timestamps consistently.

Formatting belongs to UI.

Do not design analytics schema in V0.1 beyond preserving action history.

---

# 95. Future migration path

The architecture should permit later addition of:

```text
user accounts
cloud decks
admin card management
testing-only cards
replay
analytics
spectators
matchmaking
rules engine
```

without forcing these features into current code.

---

# 96. Future relational analytics

If playtesting analytics become important, evaluate:

```text
PostgreSQL / Neon
```

for relational analytical storage.

Potential future flow:

```text
Convex game actions
      ↓
export / replication
      ↓
analytics database
```

Do not implement now.

---

# 97. Future full rules engine

When the product intentionally starts automation, preserve:

```text
GameAction
GameState
CardDefinition
CardInstance
```

and add explicit rule/effect layers.

Do not mutate the UI architecture into the rules engine.

---

# 98. Architecture decision record discipline

If a future task changes a major baseline such as:

- realtime provider;
- authoritative state model;
- storage model;
- drag library;
- action architecture;

update this document or create an ADR before silently diverging.

---

# 99. First implementation strategy

The first Codex implementation should NOT attempt the entire MVP in one pass.

Recommended build sequence:

## Milestone A — Foundation

```text
Next.js
Convex
domain types
card mock data
basic routes
tests
```

## Milestone B — Local visual board

```text
board layout
Card component
zones
dynamic Character slots
Relic attachments
Verse Resolution
Motion foundation
dnd-kit foundation
```

Use local/mock GameState first only as a development harness.

Do NOT turn this harness into the final authoritative architecture.

## Milestone C — Rooms + PlayerView

```text
create/join
temporary sessions
Convex room state
privacy
two-browser sync
```

## Milestone D — Authoritative GameAction

```text
submit action
server reducer
permissions
action log
Undo
```

## Milestone E — Preparation

```text
deck snapshot
Essence ordering
initial hand
mulligan
ready
```

## Milestone F — Polish

```text
animations
reconnection
errors
responsive desktop
E2E multiplayer flow
```

This sequence allows visual iteration early without sacrificing the final architecture.

---

# 100. First Codex rule

When implementing any milestone:

> Build the smallest vertical slice that can be executed and verified before expanding horizontally.

Example:

```text
one Card
→ one Hand
→ one Field
→ one drag action
→ one server mutation
→ reflected in second browser
```

is preferred over building 20 disconnected components before the multiplayer path works.

---

# 101. Definition of architectural success

This architecture is successful if:

1. two browser clients never own competing authoritative states;
2. hidden cards are not leaked to the opponent;
3. game transitions are expressed through GameAction;
4. domain logic is testable without React;
5. reconnecting reconstructs the board from backend state;
6. drag/animation code can change without modifying domain rules;
7. new rulings can remain manual without breaking the system;
8. future replay can use the action log;
9. future rules automation can extend rather than replace the domain model;
10. Codex can understand the project from repository documentation without reconstructing design intent from source code.

---

# 102. Final architecture baseline

```text
                 ┌────────────────────┐
                 │    Card Catalog    │
                 │ JSON + Local Assets│
                 └─────────┬──────────┘
                           │
                           ▼
┌───────────────────────────────────────────────────┐
│               NEXT.JS / REACT                    │
│                                                   │
│  Deck Builder     Lobby      Preparation         │
│                                                   │
│                   Game Board                      │
│                       │                           │
│        dnd-kit + Motion + Tailwind                │
└───────────────────────┬───────────────────────────┘
                        │
                 Convex React
                        │
                        ▼
┌───────────────────────────────────────────────────┐
│                    CONVEX                         │
│                                                   │
│ Room / Sessions                                   │
│      │                                            │
│      ▼                                            │
│ Authoritative GameState                           │
│      │                                            │
│      ├── submitGameAction                         │
│      ├── permissions                              │
│      ├── pure domain reducer                      │
│      └── GameAction log                           │
│                                                   │
│      ▼                                            │
│ buildPlayerView(viewer)                           │
└─────────────┬──────────────────────┬──────────────┘
              │                      │
              ▼                      ▼
        PLAYER A VIEW          PLAYER B VIEW
```

---

# 103. Final principle

> **State first. Actions second. Perspective third. Presentation fourth. Animation fifth.**

Every implementation decision should preserve that direction.
