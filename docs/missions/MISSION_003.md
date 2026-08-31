# MISSION 003 — Deck Selection + Pre-Game Preparation Flow

## Goal
Replace the current artificial multiplayer game seed with the first real pre-game preparation flow for the MVP.

Players do NOT own card collections. Every player has access to all cards available for the selected faction.

Required sequence:

```text
CREATE / JOIN ROOM
→ CHOOSE FACTION
→ BUILD DECK
→ CHOOSE SANCTUARY
→ SUBMIT LOADOUT
→ BOTH LOADOUTS READY
→ DETERMINE STARTING PLAYER
→ PRIVATE ESSENCE ORDERING
→ INITIAL DRAW
→ MULLIGAN / KEEP
→ READY
→ IN_GAME
```

Keep the current mock catalog/assets. Do NOT import official card data/images yet.

## Read first
1. `AGENTS.md`
2. `docs/MVP_SCOPE.md`
3. Deck/preparation sections of `docs/CRONICAS_DOMAIN.md`
4. Multiplayer/state sections of `docs/ARCHITECTURE.md`
5. Preparation/deck UX sections of `docs/UX_SPEC.md`
6. `convex/_generated/ai/guidelines.md`
7. Current Mission 002 room implementation

Do not rebuild working multiplayer architecture.

## 1. Preserve Mission 002
Keep private rooms, opaque sessions, Convex authoritative state, PlayerView privacy, realtime sync, reconnect/refresh, board perspective and existing GameActions.

Mission 003 changes how a match is prepared and initialized, not the multiplayer architecture.

## 2. No player inventory
Do not implement card ownership, unlocks, purchases, booster packs, collection progression or account inventory.

After selecting a faction, the player has access to every deck-building card in the current catalog that is eligible for that faction.

## 3. Preparation states
Represent preparation explicitly with serializable authoritative stages equivalent to:

```text
WAITING_FOR_PLAYER
DECK_SELECTION
STARTING_PLAYER
ESSENCE_ORDERING
INITIAL_DRAW
MULLIGAN
READY_TO_START
IN_GAME
FINISHED
ABANDONED
```

Names may follow existing conventions. Do not infer shared preparation stage only from UI state.

## 4. Faction selection
Each player selects one faction before building their match deck.

Available Cards must be filtered using structured catalog metadata.

For mock data, extend faction metadata minimally as needed. Do not infer faction legality from card text.

Changing faction must clear/invalidate cards no longer eligible.

## 5. Deck Builder MVP
Create a functional preparation deck builder with:

```text
AVAILABLE CARDS | DECK
```

Available Cards:
- selected faction only;
- card name/type/basic metadata;
- add copies.

Deck:
- selected cards;
- quantity per card;
- increment/decrement;
- total `N / 35`.

Prioritize function over final polish.

## 6. Main Deck rules
Enforce authoritatively:

```text
Main Deck = exactly 35 cards
maximum 3 copies per card
```

Reject submission when:
- total != 35;
- any quantity > 3;
- card is not eligible for selected faction.

Do not add other competitive legality unless already explicitly documented and required.

## 7. Quantities
Adding:

```text
0 → 1 → 2 → 3
```

At 3, further addition is disabled.

Removing:

```text
3 → 2 → 1 → 0
```

At 0 remove it from the deck list.

## 8. Sanctuary selection
Sanctuary is selected separately and does NOT count toward 35.

Player must select exactly one eligible Sanctuary.

Store it in the submitted loadout. At match start instantiate it directly in SANCTUARY so it appears in the fixed board position.

Never place Sanctuary in Hand/Main Deck.

## 9. Essence Deck
Essences are separate from Main Deck and do not count toward 35.

Use the current structured/mock Essence catalog/configuration. Extend mock data minimally if needed; do not invent official cards.

## 10. Loadout snapshot
Submit a structured loadout to Convex:

```text
PlayerLoadout {
  faction
  mainDeck
  sanctuary
  essenceDeck
}
```

Convex validates it. After submission, localStorage is not authoritative match data.

## 11. Loadout privacy
Before the match, opponent must NOT receive:
- Main Deck identities/order;
- private Essence identities/order;
- other private loadout details.

Public status may include displayName, faction if intended public, loadout submitted, ready state.

## 12. Optional local presets
Optional only if cheap: localStorage presets with save/load/rename/delete.

These are deck presets, not card ownership. Multiplayer flow must work without them.

## 13. Both loadouts required
Do not determine starting player until both valid loadouts are submitted.

An early player waits without receiving opponent private deck contents.

## 14. Determine starting player
After both loadouts are valid, choose starting player server-side fairly and exactly once.

Persist the result. Both clients see who starts. Refresh must not reroll.

## 15. Essence ordering only after starter
Required:

```text
both loadouts
→ starting player determined
→ Essence ordering unlocked
```

## 16. Starting-position Essence rule
Essence ordering/configuration may depend on whether a player starts or goes second.

Use an explicit documented rule if available.

If the exact rule is unclear:
1. implement ordering UI/data model;
2. isolate the rule behind a policy/helper/config;
3. do not fabricate legality;
4. report the unresolved rule.

## 17. Private Essence ordering
Each player privately reorders their own Essence Deck.

Requirements:
- own cards visible;
- drag/reorder;
- deterministic final order;
- confirm;
- opponent cannot see identities/order;
- confirmed order stored authoritatively;
- lock after confirmation unless preparation is explicitly reset.

## 18. Both Essence orders required
Do not proceed until both confirm.

Opponent sees only status such as `Ordenando Esencias...` / `Listo`.

## 19. Main Deck order
When initializing match, shuffle Main Deck server-side.

Do not trust client order. Persist authoritative order and keep opponent order hidden through PlayerView.

## 20. CardInstances
Create unique CardInstances for every copy in:
- Main Deck;
- Essence Deck;
- Sanctuary.

Never reuse definition IDs as instance IDs.

## 21. Sanctuary initialization
Selected Sanctuary:
- instantiated once;
- owned by correct player;
- starts in SANCTUARY;
- appears in fixed board position;
- uses configured starting HP/state from current domain/mock definition.

## 22. Initial draw
After both Essence orders are confirmed and Main Decks initialized/shuffled, draw the initial hand server-side.

Expected target: 5 cards.

If explicit project documentation says otherwise, follow it and report the discrepancy.

## 23. Initial hand privacy
Owner receives identities. Opponent receives only hidden-hand representation/count through existing PlayerView.

## 24. Mulligan
Implement a private mulligan/KEEP stage.

If exact Crónicas mulligan behavior is explicitly documented, implement it.

If not:
- implement UI/state boundary;
- do not invent replacement/shuffle behavior;
- isolate the missing policy;
- report it.

Opponent sees only decision/confirmation status, never selected cards.

## 25. Mulligan confirmation
Once confirmed, lock the player's decision and persist it through refresh.

Do not enter IN_GAME until both players complete this stage.

## 26. READY → IN_GAME
After both complete mulligan, converge authoritatively:

```text
READY_TO_START → IN_GAME
```

Resulting GameState must contain:
- player ownership;
- starting player;
- shuffled Main Decks;
- initial Hands;
- ordered Essence Decks;
- selected Sanctuaries;
- empty Field;
- empty Graveyards;
- empty Verse Resolution;
- revision.

Then render the existing multiplayer board.

## 27. Remove artificial seed
Normal `/room/[code]` must no longer use Mission 002 automatic mock game initialization.

Mock fixtures may remain for `/dev/board` and tests.

## 28. Reconnection during preparation
Refresh/reconnect must recover session, seat, room, preparation stage and own submitted/confirmed state at every preparation stage.

Never expose private opponent data during recovery.

## 29. Viewer-relative UI
Use viewer-relative labels where useful:

```text
TÚ
RIVAL
COMIENZAS
JUEGAS SEGUNDO
```

Do not assume PLAYER_1 is local.

## 30. Backend authority
Convex must reject at minimum:
- invalid session;
- loadout for another seat;
- Main Deck != 35;
- >3 copies;
- ineligible faction card;
- invalid Sanctuary;
- malformed Essence configuration;
- preparation action for another player;
- action in invalid preparation stage.

Frontend validation is UX only.

## 31. Atomic transitions
Protect shared transitions against simultaneous actions:

```text
second loadout → determine starter exactly once
second Essence confirmation → initialize/draw exactly once
second mulligan confirmation → start game exactly once
```

Do not allow duplicate initialization.

## 32. Development UX
Show clear:
- preparation progress;
- deck count;
- copy count;
- validation errors;
- waiting state;
- starter result;
- Essence confirmation;
- mulligan confirmation.

Do not redesign gameplay board.

## 33. DEV diagnostics
May show non-sensitive:
- room state;
- preparation stage;
- seat;
- loadout submitted;
- Essence confirmed;
- mulligan confirmed;
- starting player.

Never show session token or opponent private deck/order/selections.

## 34. No Arsenal / Side Deck yet
Do not build competitive Arsenal/Side Deck workflow in this mission.

Preserve existing compatible domain fields if present.

## 35. Tests — deck builder/domain
Test:
- 35 accepted;
- 34 rejected;
- 36 rejected;
- 3 copies accepted;
- 4 rejected;
- invalid faction card rejected;
- Sanctuary excluded from 35;
- valid Sanctuary required;
- availability comes from faction/catalog, not inventory.

## 36. Tests — preparation/backend
Test:
- one loadout does not advance;
- both loadouts determine starter exactly once;
- starter persists;
- Essence ordering blocked before starter;
- own Essence order accepted;
- opponent Essence order private;
- both Essence confirmations advance;
- Main Deck initialized from loadout;
- unique CardInstance IDs;
- Sanctuary instantiated correctly;
- initial draw server-side;
- own hand visible;
- opponent hand hidden;
- invalid-stage actions rejected;
- preparation survives refresh.

## 37. Tests — resulting game
Verify IN_GAME:
- Main Deck remaining count reflects initial draw;
- Hand contains initial cards;
- Essence Deck retains confirmed order;
- Sanctuary in SANCTUARY;
- Field empty;
- Graveyard empty;
- Verse Resolution empty;
- starter preserved;
- PlayerView privacy holds;
- normal gameplay actions still work.

## 38. E2E
Extend Playwright with two contexts:

```text
A creates room
B joins
A/B choose faction
A/B build and submit valid 35-card deck + Sanctuary
starter appears identically
A/B privately order Essences
both confirm
initial Hands appear privately
A/B complete KEEP/mulligan
room enters IN_GAME
each sees own Sanctuary and Hand
opponent Hand identity stays hidden
perform one gameplay action
verify realtime sync
```

A DEV/test-only helper may auto-fill a valid mock deck for test speed. Do not weaken production validation.

## 39. Out of scope
Do NOT implement:
- official card images/catalog;
- player inventory/collection;
- economy/boosters;
- accounts;
- cloud deck library;
- competitive sideboarding;
- Bo3;
- matchmaking;
- spectators;
- chat;
- rules engine;
- automatic card-text effects;
- combat automation;
- ranking.

## 40. Acceptance criteria
Using two browser contexts:

1. both enter same room;
2. each selects faction;
3. available cards come from faction catalog;
4. each constructs exactly 35 Main Deck cards;
5. max 3 copies enforced;
6. each selects one Sanctuary separately;
7. invalid loadouts cannot submit;
8. both submissions determine starter;
9. starter result matches on both clients;
10. Essence ordering only starts afterward;
11. each privately orders own Essences;
12. opponent Essence order remains hidden;
13. Main Deck server-shuffled;
14. initial hand server-drawn;
15. owner sees own cards;
16. opponent sees hidden hand/count only;
17. mulligan/KEEP stage exists and is private;
18. both confirmations enter IN_GAME;
19. Sanctuary appears in fixed board position;
20. Mission 002 gameplay still works;
21. refresh during preparation preserves progress;
22. refresh during game preserves state.

## 41. Rule uncertainty policy
Crónicas is new and some rules may be incompletely documented.

If a gameplay-specific rule required by this mission is unclear:

DO NOT GUESS.

Instead:
1. isolate it behind a small policy/helper/configuration boundary;
2. implement surrounding architecture;
3. do not fabricate legality;
4. report the exact unresolved rule.

Structural software rules explicitly defined in this mission are authoritative for the MVP.

## 42. Required checks
Run and fix:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npm run test:e2e
```

Do not claim Mission 003 complete if required checks fail.

Final report: maximum 15 lines following `AGENTS.md`, explicitly mentioning any unresolved Crónicas rule.
