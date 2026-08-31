# MISSION 002 — Multiplayer Rooms + Authoritative Game State

## Goal

Turn the existing local board foundation into the first real **1v1 multiplayer vertical slice**.

At completion, two different browser contexts must be able to:

1. create/join the same private room;
2. occupy separate seats;
3. receive different safe `PlayerView`s;
4. manipulate only their own authorized game elements;
5. see accepted `GameAction`s synchronize in realtime through Convex;
6. refresh and recover their seat/session.

Keep mock cards and mock deck data.

Do **not** implement the full deck builder or full game preparation yet.

---

## Read first

1. `AGENTS.md`
2. Multiplayer/privacy sections of `docs/MVP_SCOPE.md`
3. Visibility/GameAction sections of `docs/CRONICAS_DOMAIN.md`
4. Multiplayer/state sections of `docs/ARCHITECTURE.md`
5. Relevant lobby/connection sections of `docs/UX_SPEC.md`

When working on Convex code, also read:

`convex/_generated/ai/guidelines.md`

Read other docs only if needed.

---

# 1. Preserve existing board work

Do NOT rebuild the board.

Reuse the existing:

- Card components;
- zones;
- board layout;
- animations;
- dnd-kit interactions;
- GameAction union;
- reducer;
- permission concepts;
- mock cards.

`/dev/board` may remain available as a local development harness.

Production multiplayer work should use separate room flow/routes.

---

# 2. Room route

Implement:

```text
/room/[code]
```

A room can render different states:

```text
WAITING_FOR_PLAYER
IN_GAME
FINISHED
ABANDONED
```

Do not create unnecessary routes for every room state.

---

# 3. Create room

Provide a simple entry point from `/` or an equivalent lightweight screen.

Required input:

```text
displayName
```

For this mission, both players may use a predefined/mock playable deck configuration.

Creating a room must:

1. create backend room state;
2. reserve PLAYER_1;
3. create a private temporary player session;
4. generate a short public room code;
5. navigate to `/room/[code]`;
6. display a shareable link/code.

No user account required.

---

# 4. Join room

A second browser opening `/room/[code]` must be able to:

1. enter `displayName`;
2. join as PLAYER_2;
3. receive its own private session credential;
4. enter the same game.

A third player must be rejected cleanly.

Do not use the room code alone as authorization to control a seat.

---

# 5. Temporary session

Implement opaque temporary player sessions.

Conceptually:

```text
playerId
playerSessionToken
seat
```

Requirements:

- token is private;
- token does not appear in shareable URL;
- token survives browser refresh;
- token is required for private queries/mutations;
- room code alone does not authorize game actions.

Store the local token using the browser persistence abstraction appropriate for V0.1.

Do not add authentication providers.

---

# 6. Convex authoritative state

Convex is the single source of truth for multiplayer state.

Create the minimal backend model needed for:

```text
rooms
players/sessions
games
gameActions
```

Follow `docs/ARCHITECTURE.md`.

Do not allow clients to submit arbitrary replacement GameState.

Bad:

```text
setGameState(...)
```

Preferred boundary:

```text
submitGameAction(...)
```

---

# 7. Game initialization

When PLAYER_2 joins, initialize a simple multiplayer GameState using the existing mock catalog.

Use a predefined mock configuration for each player.

The goal is multiplayer validation, not deck selection.

Create proper unique `CardInstance`s.

The game should begin in a simple playable state sufficient to exercise the existing board.

Do not implement full PREPARATION flow in this mission.

---

# 8. Game revision

Authoritative GameState must include a monotonically increasing:

```text
revision
```

Each accepted gameplay action increments it.

Do not use timestamps as the only ordering mechanism.

---

# 9. submitGameAction

Implement the primary gameplay mutation conceptually equivalent to:

```text
submitGameAction({
  roomCode,
  playerSessionToken,
  clientActionId,
  action
})
```

Backend responsibilities:

```text
validate session
→ resolve room/player
→ verify authority
→ load current GameState
→ structurally validate action
→ apply pure domain reducer
→ increment revision
→ persist
→ append GameAction log
```

Do not duplicate reducer logic inside React components.

---

# 10. Server-side authority

Enforce structural/permission rules server-side.

At minimum reject:

- actions from invalid sessions;
- actions for a different seat;
- editing opponent-controlled cards;
- changing opponent Sanctuary HP;
- drawing from opponent decks;
- moving opponent Graveyard cards;
- manipulating opponent Essence cards;
- manipulating hidden opponent cards.

Do not rely only on disabled UI.

---

# 11. Do not add rule arbitration

Continue NOT validating:

- cost payment;
- phase legality;
- combat legality;
- card effects;
- targets;
- timing windows.

Mission 002 adds multiplayer authority, not a rules engine.

---

# 12. PlayerView

Clients must NOT subscribe to raw authoritative GameState.

Implement server-generated safe views:

```text
GameState + viewer
        ↓
PlayerView
```

Each browser receives only information it is allowed to know.

---

# 13. Hidden opponent hand

Opponent hand must expose only safe information.

The opponent client may know:

```text
handCount
hidden card placeholders if required for rendering
```

It must NOT receive:

- real `cardId`;
- name;
- type;
- faction;
- cost;
- image;
- rules text

for cards that should remain hidden.

Do not merely hide these fields in CSS.

---

# 14. Hidden decks

Opponent Main Deck and Essence Deck must not expose card identities or order.

Public data may include:

```text
remaining count
```

Private order remains backend-only / owner-authorized.

---

# 15. Public zones

Both PlayerViews may expose full public identity for:

- Field;
- Graveyard;
- Sanctuary;
- Essence Zone;
- Verse Resolution.

Opponent public cards are inspectable but remain non-editable.

---

# 16. Board perspective

Each player must see themselves at the bottom.

The same authoritative GameState must render differently depending on viewer.

Do not persist "top/bottom player" in GameState.

Perspective is derived from viewer identity.

---

# 17. Realtime synchronization

Use Convex reactive queries.

Required demonstration:

Browser A performs an accepted action.

Browser B receives the updated PlayerView automatically.

No manual refresh.

Do not add a separate WebSocket synchronization layer.

---

# 18. Existing board actions

Wire the existing board interactions through backend `submitGameAction`.

At minimum support multiplayer synchronization for:

- `DRAW_CARD`
- `DRAW_ESSENCE`
- `PLAY_CHARACTER`
- `PLAY_RELIC`
- `PLAY_VERSE`
- `RESOLVE_VERSE`
- `MOVE_CARD`
- `REORDER_FIELD`
- `ATTACH_RELIC`
- `DETACH_RELIC`
- `TAP_CARD`
- `UNTAP_CARD`
- `FLIP_FACE_UP`
- `FLIP_FACE_DOWN`
- `CHANGE_CARD_COUNTER`
- `CHANGE_SANCTUARY_HP`
- `SET_SANCTUARY_HP`

If an existing sandbox-only interaction cannot yet be safely multiplayer-enabled, fail explicitly and report it rather than silently using local-only state.

---

# 19. Client action IDs

Each gameplay submission must include an opaque:

```text
clientActionId
```

Use it for logging/debugging and future deduplication.

Do not use card IDs as action IDs.

---

# 20. GameAction log

Persist accepted actions.

Minimum conceptual fields:

```text
gameId
sequence/revision
actorPlayerId
action
createdAt
clientActionId
```

Raw GameAction log is backend/internal.

Do not expose hidden information from raw actions to the opponent.

---

# 21. Reconnection

Refresh must preserve the player's seat.

Flow:

```text
open /room/[code]
→ recover local session token
→ validate token
→ fetch safe PlayerView
→ restore board
```

Do not create a new player on refresh.

---

# 22. Invalid/revoked local session

If a stored token is invalid:

- do not expose private state;
- show a clear join/recovery state;
- do not silently assign the wrong seat.

---

# 23. Connection status

Add lightweight UX feedback:

```text
Connected
Reconnecting
Disconnected
```

Keep it subtle.

A disconnect must never modify GameState.

Do not build complex presence infrastructure yet.

---

# 24. Room completion

Add simple actions for:

```text
FINISH GAME
ABANDON GAME
```

They may remain manual.

Do not automatically determine the winner.

When a room is finished/abandoned, both clients must receive the updated room state.

---

# 25. Undo

Do NOT expand Undo into negotiation yet.

If the existing Undo implementation is not already suitable for authoritative multiplayer, it may remain disabled on `/room/[code]` for this mission.

Do not implement unsafe local-only Undo against server state.

Report this clearly if disabled.

---

# 26. Optimistic UI

Optional.

Correctness is more important than optimistic interaction in this mission.

If adding optimistic updates:

- do not create a second authoritative store;
- rollback safely on rejection.

It is acceptable for the first multiplayer pass to wait briefly for Convex confirmation if interaction remains usable.

---

# 27. Development diagnostics

A collapsible DEV panel is acceptable showing:

```text
room code
playerId
seat
revision
last action type
connection state
```

Never display:

- player session token;
- opponent private hand;
- hidden deck order.

---

# 28. Tests — domain/backend

Add/update tests covering:

- valid session can act;
- invalid session is rejected;
- PLAYER_1 cannot edit PLAYER_2 cards;
- player cannot change opponent Sanctuary HP;
- player cannot draw from opponent deck;
- revision increments on accepted actions;
- accepted action is logged;
- PlayerView hides opponent hand identity;
- PlayerView hides opponent deck identity/order;
- public zones expose expected card identity.

Use the testing approach compatible with current Convex guidelines.

---

# 29. E2E

Configure Playwright now.

Create a two-browser-context multiplayer smoke test.

Minimum flow:

```text
Context A creates room
Context B joins
game initializes
A performs one public action
B observes it
A draws a card
B sees hand count change but not identity
B cannot edit A card
A refreshes
A recovers same seat/state
```

The E2E test must validate privacy, not only rendering.

---

# 30. Keep mock data

Do not import official card images/data yet.

Do not build Deck Builder yet.

Mission 002 should stay focused on proving multiplayer architecture.

---

# 31. Out of scope

Do not implement:

- official card catalog import;
- full deck builder;
- full preparation flow;
- Essence pre-game ordering UI;
- mulligan;
- accounts/auth providers;
- matchmaking;
- chat;
- spectators;
- ranked;
- rules engine;
- automatic costs;
- automatic effects;
- combat automation;
- analytics dashboards.

---

# 32. Acceptance criteria

Using two browser contexts, I must be able to verify:

1. A creates a private room;
2. B joins through link/code;
3. a third player cannot join;
4. each user sees themselves at the bottom;
5. actions from A update B in realtime;
6. actions from B update A in realtime;
7. opponent cards remain read-only;
8. A cannot change B Sanctuary HP;
9. own Main Deck click draws server-authoritatively;
10. opponent only sees hidden hand/count;
11. Essence draw synchronizes;
12. Field/Relic/Verse actions synchronize;
13. refresh restores the same seat;
14. raw opponent hand identity is not present in its PlayerView;
15. room can be finished or abandoned manually.

---

# 33. Required checks

Run and fix:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npm run test:e2e
```

Do not claim Mission 002 complete if required checks fail.

Final report: maximum 15 lines, following `AGENTS.md`.
