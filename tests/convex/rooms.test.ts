import { describe, expect, it } from "vitest";
import { buildMockGameState, MOCK_IDS, mockCardDefinitionsById } from "@/data/mock-card-catalog";
import { materializeGameAction, playerView } from "@/../convex/rooms";
import { assertAuthorizedAction } from "@/../convex/roomAuthority";
import { createInitialState } from "@/../convex/gameSeed";
import { getCentralZoneOrder, getDeckClickAction, getDeckContextActions, getPublicCardContextActions } from "@/components/room/room.board.permissions";
import { getCharacterDerivedStats } from "@/domain/game/game.selectors";
import { applyGameAction } from "@/domain/game/game.reducer";
import type { CardInstance, GameState } from "@/domain/game/game.types";

describe("MISSION_002 multiplayer boundaries", () => {
  it("allows an owner action and rejects an opponent card", () => {
    const state = buildMockGameState();
    expect(() => assertAuthorizedAction(state, { type: "DRAW_CARD", playerId: MOCK_IDS.local }, MOCK_IDS.local)).not.toThrow();
    expect(() => assertAuthorizedAction(state, { type: "TAP_CARD", instanceId: "opponent-field-char" }, MOCK_IDS.local)).toThrow();
  });

  it("rejects opponent sanctuary, deck and attachment targets", () => {
    const state = buildMockGameState();
    expect(() => assertAuthorizedAction(state, { type: "CHANGE_SANCTUARY_HP", playerId: MOCK_IDS.opponent, amount: -1 }, MOCK_IDS.local)).toThrow();
    expect(() => assertAuthorizedAction(state, { type: "ATTACH_RELIC", relicInstanceId: "local-hand-relic", characterInstanceId: "opponent-field-char" }, MOCK_IDS.local)).toThrow();
  });

  it("exposes opponent Essence Zone cards but not the remaining Essence Deck", () => {
    const state = createInitialState("room-test", "A", "B", "A", "B");
    state.cardInstances["B-essence-1"].zone = "ESSENCE_ZONE";
    state.cardInstances["B-essence-1"].faceUp = true;
    const view = playerView(state, "A");
    const publicEssence = view.cardInstances.find((card) => card.instanceId === "B-essence-1");
    const hiddenEssenceDeck = view.cardInstances.find((card) => card.instanceId === "B-essence-2");
    expect(publicEssence).toHaveProperty("definition");
    expect(hiddenEssenceDeck).toBeUndefined();
    expect(view.hiddenCounts.B.ESSENCE_DECK).toBe(1);
  });

  it("allows only the owner to Tap and Untap Essence Zone cards", () => {
    const state = createInitialState("room-test", "A", "B", "A", "B");
    const ownEssence = state.cardInstances["A-essence-1"];
    ownEssence.zone = "ESSENCE_ZONE";
    const rivalEssence = state.cardInstances["B-essence-1"];
    rivalEssence.zone = "ESSENCE_ZONE";
    expect(getPublicCardContextActions({ ...ownEssence, definition: mockCardDefinitionsById[MOCK_IDS.essenceA] }, true)).toEqual(["INSPECT", "TAP", "RETURN_ESSENCE_TO_DECK_BOTTOM"]);
    ownEssence.tapped = true;
    expect(getPublicCardContextActions({ ...ownEssence, definition: mockCardDefinitionsById[MOCK_IDS.essenceA] }, true)).toEqual(["INSPECT", "UNTAP", "RETURN_ESSENCE_TO_DECK_BOTTOM"]);
    expect(getPublicCardContextActions({ ...rivalEssence, definition: mockCardDefinitionsById[MOCK_IDS.essenceB] })).toEqual(["INSPECT"]);
    expect(() => assertAuthorizedAction(state, { type: "TAP_CARD", instanceId: ownEssence.instanceId }, "A")).not.toThrow();
    const tapped = applyGameAction(state, { type: "TAP_CARD", instanceId: ownEssence.instanceId });
    expect(tapped.cardInstances[ownEssence.instanceId].tapped).toBe(true);
    expect(() => assertAuthorizedAction(tapped, { type: "UNTAP_CARD", instanceId: ownEssence.instanceId }, "A")).not.toThrow();
    const untapped = applyGameAction(tapped, { type: "UNTAP_CARD", instanceId: ownEssence.instanceId });
    expect(untapped.cardInstances[ownEssence.instanceId].tapped).toBe(false);
    expect(() => assertAuthorizedAction(state, { type: "TAP_CARD", instanceId: rivalEssence.instanceId }, "A")).toThrow();
    expect(() => assertAuthorizedAction(state, { type: "TAP_CARD", instanceId: "A-essence-2" }, "A")).toThrow();
    state.cardInstances[ownEssence.instanceId].cardDefinitionId = "mock-char-a";
    expect(() => assertAuthorizedAction(state, { type: "TAP_CARD", instanceId: ownEssence.instanceId }, "A")).toThrow();
  });

  it("publishes the tapped Essence state to the other player", () => {
    const state = createInitialState("room-test", "A", "B", "A", "B");
    state.cardInstances["A-essence-1"].zone = "ESSENCE_ZONE";
    const next = applyGameAction(state, { type: "TAP_CARD", instanceId: "A-essence-1" });
    const view = playerView(next, "B");
    expect(view.cardInstances.find((card) => card.instanceId === "A-essence-1")).toMatchObject({ zone: "ESSENCE_ZONE", tapped: true });
  });

  it("authorizes Character marker changes only for the controller and keeps them public", () => {
    let state: GameState = createInitialState("room-test", "A", "B", "A", "B");
    state.cardInstances["A-hand-char"].zone = "FIELD";
    const add = { type: "ADD_CHARACTER_MARKER" as const, characterInstanceId: "A-hand-char", markerId: "marker-1", marker: "IMBATIBLE" as const };

    expect(() => assertAuthorizedAction(state, add, "A")).not.toThrow();
    expect(() => assertAuthorizedAction(state, add, "B")).toThrow();
    state = applyGameAction(state, add, mockCardDefinitionsById);
    expect(playerView(state, "B").characterMarkers?.["A-hand-char"]).toEqual([{ markerId: "marker-1", kind: "IMBATIBLE" }]);

    const remove = { type: "REMOVE_CHARACTER_MARKER" as const, characterInstanceId: "A-hand-char", markerId: "marker-1" };
    expect(() => assertAuthorizedAction(state, remove, "B")).toThrow();
    expect(() => assertAuthorizedAction(state, remove, "A")).not.toThrow();
  });

  it("exposes the same current Sanctuary HP to both PlayerViews", () => {
    const state = createInitialState("room-test", "A", "B", "A", "B");
    state.players.A.sanctuaryHp = 17;
    expect(playerView(state, "A").players.A.sanctuaryHp).toBe(17);
    expect(playerView(state, "B").players.A.sanctuaryHp).toBe(17);
  });

  it("preserves public attachment relationships in the opponent view", () => {
    const state = createInitialState("room-test", "A", "B", "A", "B");
    state.cardInstances["B-hand-relic"].zone = "FIELD";
    state.cardInstances["B-hand-relic"].attachedToInstanceId = "B-field-char";
    const view = playerView(state, "A");
    const publicRelic = view.cardInstances.find((card) => card.instanceId === "B-hand-relic");
    expect(publicRelic).toMatchObject({ zone: "FIELD", attachedToInstanceId: "B-field-char" });
    expect(publicRelic).toHaveProperty("definition");
    const publicCharacter = view.cardInstances.find((card) => card.instanceId === "B-field-char");
    const definitions = Object.fromEntries(view.cardInstances.flatMap((card) => "definition" in card && card.definition ? [[card.cardDefinitionId, card.definition]] : []));
    expect(getCharacterDerivedStats(publicCharacter as CardInstance, [publicRelic as CardInstance], definitions as Record<string, import("@/domain/cards/card.types").CardDefinition>)).toEqual({ attack: 5, health: 4 });
  });

  it("keeps opponent hand and main deck identities private", () => {
    const view = playerView(createInitialState("room-test", "A", "B", "A", "B"), "A");
    const hidden = view.cardInstances.find((card) => card.instanceId === "B-field-char");
    const opponentHand = view.cardInstances.find((card) => card.instanceId === "B-hand-char");
    const opponentDeck = view.cardInstances.find((card) => card.instanceId === "B-main-1");
    expect(hidden && "definition" in hidden ? hidden.definition?.id : undefined).toBe("mock-char-a");
    expect(opponentHand).toBeUndefined();
    expect(opponentDeck).toBeUndefined();
    expect(view.hiddenCounts.B.HAND).toBe(2);
    expect(view.hiddenCounts.B.MAIN_DECK).toBe(2);
    expect(view.hiddenCounts.B.ESSENCE_DECK).toBe(2);
    expect(view.publicCounts.B.MAIN_DECK).toBe(2);
    expect(view.publicCounts.B.ESSENCE_DECK).toBe(2);
  });

  it("shows only explicitly revealed searched cards to the opponent", () => {
    let state: GameState = createInitialState("room-test", "A", "B", "A", "B");
    state = applyGameAction(state, { type: "SEARCH_MAIN_DECK", playerId: "B" }, mockCardDefinitionsById);
    const reveal = { type: "SET_DECK_SEARCH_REVEALED" as const, playerId: "B", instanceIds: ["B-main-1"], revealed: true };
    expect(() => assertAuthorizedAction(state, reveal, "B")).not.toThrow();
    expect(() => assertAuthorizedAction(state, reveal, "A")).toThrow();
    state = applyGameAction(state, reveal, mockCardDefinitionsById);

    const opponentView = playerView(state, "A");
    expect(opponentView.deckReveal).toEqual({ playerId: "B", instanceIds: ["B-main-1"] });
    expect(opponentView.cardInstances.find((card) => card.instanceId === "B-main-1")).toHaveProperty("definition");
    expect(opponentView.cardInstances.find((card) => card.instanceId === "B-main-2")).toBeUndefined();

    state = applyGameAction(state, { type: "RESOLVE_DECK_SEARCH", playerId: "B", instanceIds: ["B-main-1"], destination: "HAND" }, mockCardDefinitionsById);
    expect(playerView(state, "A").deckReveal).toBeNull();
  });

  it("publishes authorized deck counts for both players and reduces them after drawing", () => {
    const state = createInitialState("room-test", "A", "B", "A", "B");
    const own = playerView(state, "A");
    expect(own.hiddenCounts.A.MAIN_DECK).toBe(2);
    expect(own.hiddenCounts.A.ESSENCE_DECK).toBe(2);
    expect(own.hiddenCounts.B.MAIN_DECK).toBe(2);
    expect(own.hiddenCounts.B.ESSENCE_DECK).toBe(2);

    const afterDraw = applyGameAction(state, { type: "DRAW_CARD", playerId: "A" });
    expect(playerView(afterDraw, "A").hiddenCounts.A.MAIN_DECK).toBe(1);
  });

  it("projects public face-down cards as backs without revealing their definition", () => {
    const state = createInitialState("room-test", "A", "B", "A", "B");
    state.cardInstances["B-field-char"].faceUp = false;
    const card = playerView(state, "A").cardInstances.find((item) => item.instanceId === "B-field-char");
    expect(card).toMatchObject({ faceUp: false, cardDefinitionId: "", definition: null, hidden: true });
  });

  it("allows public inspection without editing and keeps deck actions owner-only", () => {
    const state = createInitialState("room-test", "A", "B", "A", "B");
    const publicCard = state.cardInstances["B-field-char"];
    expect(getPublicCardContextActions({ ...publicCard, definition: mockCardDefinitionsById[publicCard.cardDefinitionId] })).toEqual(["INSPECT"]);
    expect(getPublicCardContextActions({ ...publicCard, definition: mockCardDefinitionsById[publicCard.cardDefinitionId] }, true)).toEqual(["INSPECT", "TAP", "SEND_TO_GRAVEYARD", "RETURN_TO_HAND", "DEVASTATE", "MODIFY_CHARACTER_STATS"]);
    expect(getPublicCardContextActions({ ...state.cardInstances["B-hand-char"], definition: undefined })).toEqual([]);
    expect(getDeckContextActions("MAIN_DECK", false)).toEqual(["DRAW_CARD", "LOOK_MAIN_DECK", "SEARCH_MAIN_DECK", "SEND_TOP_TO_GRAVEYARD", "SHUFFLE_MAIN_DECK"]);
    expect(getDeckContextActions("ESSENCE_DECK", false)).toEqual(["DRAW_ESSENCE"]);
    expect(getDeckContextActions("MAIN_DECK", true)).toEqual([]);
    expect(getDeckContextActions("ESSENCE_DECK", true)).toEqual([]);
    expect(getDeckClickAction()).toBeNull();
  });

  it("authorizes own Character play and tap/untap but rejects rival manipulation", () => {
    const state = createInitialState("room-test", "A", "B", "A", "B");
    state.cardInstances["B-field-char"].ownerId = "A";
    state.cardInstances["B-field-char"].controllerId = "A";
    expect(() => assertAuthorizedAction(state, { type: "PLAY_CHARACTER", instanceId: "A-hand-char", playerId: "A" }, "A")).not.toThrow();
    expect(() => assertAuthorizedAction(state, { type: "PLAY_CHARACTER", instanceId: "B-hand-char", playerId: "A" }, "A")).toThrow();
    expect(() => assertAuthorizedAction(state, { type: "TAP_CARD", instanceId: "B-field-char" }, "A")).not.toThrow();
    expect(() => assertAuthorizedAction(state, { type: "UNTAP_CARD", instanceId: "B-field-char" }, "A")).not.toThrow();
    expect(() => assertAuthorizedAction(state, { type: "TAP_CARD", instanceId: "A-hand-char" }, "A")).toThrow();
    state.cardInstances["A-hand-relic"].zone = "FIELD";
    expect(() => assertAuthorizedAction(state, { type: "TAP_CARD", instanceId: "A-hand-relic" }, "A")).not.toThrow();
    state.cardInstances["B-hand-relic"].zone = "FIELD";
    expect(() => assertAuthorizedAction(state, { type: "UNTAP_CARD", instanceId: "B-hand-relic" }, "A")).toThrow();
  });

  it("derives central zone order from viewer perspective", () => {
    expect(getCentralZoneOrder(true)).toEqual(["ESSENCE_ZONE", "FIELD"]);
    expect(getCentralZoneOrder(false)).toEqual(["FIELD", "ESSENCE_ZONE"]);
  });

  it("rejects structurally invalid direct play and attachment actions", () => {
    const state = createInitialState("room-test", "A", "B", "A", "B");
    expect(() => assertAuthorizedAction(state, { type: "PLAY_CHARACTER", instanceId: "A-hand-relic", playerId: "A" }, "A")).toThrow();
    expect(() => assertAuthorizedAction(state, { type: "PLAY_RELIC", instanceId: "A-hand-relic", playerId: "A", attachedToInstanceId: "B-field-char" }, "A")).toThrow();
    expect(() => assertAuthorizedAction(state, { type: "PLAY_RELIC", instanceId: "A-hand-relic", playerId: "A", attachedToInstanceId: null }, "A")).toThrow();
    expect(() => assertAuthorizedAction(state, { type: "ATTACH_RELIC", relicInstanceId: "A-hand-relic", characterInstanceId: "B-field-char" }, "A")).toThrow();
    expect(() => assertAuthorizedAction(state, { type: "DETACH_RELIC", relicInstanceId: "A-hand-relic" }, "A")).toThrow();
    state.cardInstances["A-hand-relic"].zone = "FIELD";
    expect(() => assertAuthorizedAction(state, { type: "ATTACH_RELIC", relicInstanceId: "A-hand-relic", characterInstanceId: "missing-character" }, "A")).toThrow();
    expect(() => assertAuthorizedAction(state, { type: "ATTACH_RELIC", relicInstanceId: "A-hand-relic", characterInstanceId: "A-hand-char" }, "A")).toThrow();
    expect(() => assertAuthorizedAction(state, { type: "ATTACH_RELIC", relicInstanceId: "A-hand-char", characterInstanceId: "B-field-char" }, "A")).toThrow();
    state.cardInstances["A-hand-relic"].zone = "FIELD";
    expect(() => assertAuthorizedAction(state, { type: "TAP_CARD", instanceId: "A-hand-relic" }, "A")).not.toThrow();
    state.cardInstances["A-hand-char"].zone = "FIELD";
    expect(() => assertAuthorizedAction(state, { type: "PLAY_CHARACTER_ATTACH_RELIC", characterInstanceId: "A-hand-char", relicInstanceId: "A-hand-relic", playerId: "A" }, "A")).toThrow();
    state.cardInstances["A-hand-char"].zone = "HAND";
    expect(() => assertAuthorizedAction(state, { type: "PLAY_CHARACTER_ATTACH_RELIC", characterInstanceId: "A-hand-char", relicInstanceId: "A-hand-relic", playerId: "A" }, "A")).not.toThrow();
    expect(() => assertAuthorizedAction(state, { type: "MOVE_CARD", instanceId: "B-field-char", toZone: "GRAVEYARD", controllerId: "A" }, "A")).toThrow();
    expect(() => assertAuthorizedAction(state, { type: "MOVE_CARD", instanceId: "A-hand-char", toZone: "GRAVEYARD", controllerId: "A" }, "A")).toThrow();
  });

  it("authorizes own Verse resolution and rejects non-Verse cards there", () => {
    const state = createInitialState("room-test", "A", "B", "A", "B");
    state.cardInstances["A-hand-verse"].zone = "VERSE_RESOLUTION";
    expect(() => assertAuthorizedAction(state, { type: "RESOLVE_VERSE", instanceId: "A-hand-verse", playerId: "A" }, "A")).not.toThrow();
    expect(() => assertAuthorizedAction(state, { type: "PLAY_VERSE", instanceId: "A-hand-char", playerId: "A" }, "A")).toThrow();
  });

  it("supports manual Field and Graveyard movement while releasing attachments", () => {
    const state = createInitialState("room-test", "A", "B", "A", "B");
    const character = state.cardInstances["A-hand-char"];
    const relic = state.cardInstances["A-hand-relic"];
    character.zone = "FIELD";
    relic.zone = "FIELD";
    relic.attachedToInstanceId = character.instanceId;

    const toHand = applyGameAction(state, { type: "MOVE_CARD", instanceId: relic.instanceId, toZone: "HAND", controllerId: "A" });
    expect(toHand.cardInstances[relic.instanceId]).toMatchObject({ zone: "HAND", attachedToInstanceId: null });

    const toGraveyard = applyGameAction(state, { type: "MOVE_CARD", instanceId: character.instanceId, toZone: "GRAVEYARD", controllerId: "A" });
    expect(toGraveyard.cardInstances[character.instanceId].zone).toBe("GRAVEYARD");
    expect(toGraveyard.cardInstances[relic.instanceId]).toMatchObject({ zone: "FIELD", attachedToInstanceId: null });

    const backToField = applyGameAction(toGraveyard, { type: "MOVE_CARD", instanceId: character.instanceId, toZone: "FIELD", controllerId: "A" });
    expect(backToField.cardInstances[character.instanceId].zone).toBe("FIELD");
  });

  it("authorizes only own Field and Graveyard movement", () => {
    const state = createInitialState("room-test", "A", "B", "A", "B");
    state.cardInstances["A-hand-char"].zone = "GRAVEYARD";
    expect(() => assertAuthorizedAction(state, { type: "MOVE_CARD", instanceId: "A-hand-char", toZone: "HAND", controllerId: "A" }, "A")).not.toThrow();
    expect(() => assertAuthorizedAction(state, { type: "MOVE_CARD", instanceId: "A-hand-char", toZone: "FIELD", controllerId: "A" }, "A")).not.toThrow();
    expect(() => assertAuthorizedAction(state, { type: "MOVE_CARD", instanceId: "B-field-char", toZone: "HAND", controllerId: "A" }, "A")).toThrow();
    expect(() => assertAuthorizedAction(state, { type: "MOVE_CARD", instanceId: "B-field-char", toZone: "FIELD", controllerId: "A" }, "A")).toThrow();
  });

  it("returns a Verse from Graveyard to resolution instead of invisible Field", () => {
    const state = createInitialState("room-test", "A", "B", "A", "B");
    const verse = state.cardInstances["A-hand-verse"];
    verse.zone = "GRAVEYARD";

    expect(getPublicCardContextActions({ ...verse, definition: mockCardDefinitionsById[MOCK_IDS.verseA] }, true)).toEqual(["INSPECT", "RETURN_TO_HAND", "MOVE_TO_RESOLUTION", "SHUFFLE_INTO_MAIN_DECK", "DEVASTATE"]);
    expect(() => assertAuthorizedAction(state, { type: "MOVE_CARD", instanceId: verse.instanceId, toZone: "VERSE_RESOLUTION", controllerId: "A" }, "A")).not.toThrow();
    expect(() => assertAuthorizedAction(state, { type: "MOVE_CARD", instanceId: verse.instanceId, toZone: "FIELD", controllerId: "A" }, "A")).toThrow();
    const next = applyGameAction(state, { type: "MOVE_CARD", instanceId: verse.instanceId, toZone: "VERSE_RESOLUTION", controllerId: "A" });
    expect(next.cardInstances[verse.instanceId].zone).toBe("VERSE_RESOLUTION");
  });

  it("authorizes manual deck tools only for their owner and preserves deck privacy", () => {
    const state = createInitialState("room-test", "A", "B", "A", "B");
    expect(() => assertAuthorizedAction(state, { type: "SEND_MAIN_DECK_TOP_TO_GRAVEYARD", playerId: "A" }, "A")).not.toThrow();
    expect(() => assertAuthorizedAction(state, { type: "SHUFFLE_MAIN_DECK", playerId: "B" }, "A")).toThrow();
    expect(() => assertAuthorizedAction(state, { type: "MOVE_HAND_CARD_TO_GRAVEYARD", instanceId: "A-hand-char", playerId: "A" }, "A")).not.toThrow();
    expect(() => assertAuthorizedAction(state, { type: "MOVE_HAND_CARD_TO_GRAVEYARD", instanceId: "B-hand-char", playerId: "A" }, "A")).toThrow();
    state.cardInstances["A-hand-char"].zone = "GRAVEYARD";
    expect(() => assertAuthorizedAction(state, { type: "SHUFFLE_CARD_INTO_MAIN_DECK", instanceId: "A-hand-char", playerId: "A" }, "A")).not.toThrow();
    const materialized = materializeGameAction(state, { type: "SHUFFLE_CARD_INTO_MAIN_DECK", instanceId: "A-hand-char", playerId: "A" });
    expect(materialized.type === "SHUFFLE_CARD_INTO_MAIN_DECK" ? [...(materialized.orderedInstanceIds ?? [])].sort() : []).toEqual(["A-hand-char", "A-main-1", "A-main-2"].sort());
    expect(playerView(state, "B").cardInstances.some((card) => card.instanceId === "A-main-1")).toBe(false);
  });

  it("authorizes returning only an own played Essence to the bottom", () => {
    const state = createInitialState("room-test", "A", "B", "A", "B");
    state.cardInstances["A-essence-1"].zone = "ESSENCE_ZONE";
    state.cardInstances["B-essence-1"].zone = "ESSENCE_ZONE";
    expect(() => assertAuthorizedAction(state, { type: "RETURN_ESSENCE_TO_DECK_BOTTOM", instanceId: "A-essence-1", playerId: "A" }, "A")).not.toThrow();
    expect(() => assertAuthorizedAction(state, { type: "RETURN_ESSENCE_TO_DECK_BOTTOM", instanceId: "B-essence-1", playerId: "A" }, "A")).toThrow();
    expect(() => assertAuthorizedAction(state, { type: "RETURN_ESSENCE_TO_DECK_BOTTOM", instanceId: "A-essence-2", playerId: "A" }, "A")).toThrow();
  });

  it("requires the opponent to approve a pending Character stat proposal", () => {
    const state = createInitialState("room-test", "A", "B", "A", "B");
    state.cardInstances["A-hand-char"].zone = "FIELD";
    const proposal = { type: "PROPOSE_CHARACTER_STAT_CHANGE" as const, proposalId: "proposal-1", characterInstanceId: "A-hand-char", playerId: "A", attackDelta: 2, healthDelta: -1 };
    expect(() => assertAuthorizedAction(state, proposal, "A")).not.toThrow();
    expect(() => assertAuthorizedAction(state, { ...proposal, proposalId: "proposal-invalid", attackDelta: -99 }, "A")).toThrow();
    const pending = applyGameAction(state, proposal);
    expect(() => assertAuthorizedAction(pending, { type: "APPROVE_CHARACTER_STAT_CHANGE", proposalId: "proposal-1", characterInstanceId: "A-hand-char", playerId: "A" }, "A")).toThrow();
    expect(() => assertAuthorizedAction(pending, { type: "APPROVE_CHARACTER_STAT_CHANGE", proposalId: "proposal-1", characterInstanceId: "A-hand-char", playerId: "B" }, "B")).not.toThrow();
    const rivalView = playerView(pending, "B");
    expect(rivalView.pendingStatChanges["A-hand-char"]).toMatchObject({ proposerId: "A", attackDelta: 2, healthDelta: -1 });
  });

  it("keeps a looked deck private, validates its session, and materializes a shuffle resolution", () => {
    let state: GameState = createInitialState("room-test", "A", "B", "A", "B");
    const look = { type: "LOOK_AT_MAIN_DECK" as const, playerId: "A", count: 2 };
    expect(() => assertAuthorizedAction(state, look, "A")).not.toThrow();
    state = applyGameAction(state, look);
    expect(playerView(state, "A").deckLook?.orderedInstanceIds).toEqual(["A-main-1", "A-main-2"]);
    expect(playerView(state, "B").cardInstances.some((card) => card.instanceId === "A-main-1")).toBe(false);
    expect(() => assertAuthorizedAction(state, { type: "RESOLVE_DECK_LOOK", playerId: "A", instanceIds: ["B-main-1"], destination: "HAND" }, "A")).toThrow();
    const materialized = materializeGameAction(state, { type: "RESOLVE_DECK_LOOK", playerId: "A", instanceIds: ["A-main-1"], destination: "SHUFFLE" });
    expect(materialized.type === "RESOLVE_DECK_LOOK" ? materialized.orderedInstanceIds?.sort() : []).toEqual(["A-main-1"].sort());
  });

  it("requires rival approval for virtual Essence changes and exposes public Devastated cards", () => {
    let state: GameState = createInitialState("room-test", "A", "B", "A", "B");
    const proposal = { type: "REQUEST_VIRTUAL_ESSENCE_CHANGE" as const, proposalId: "virtual-1", playerId: "A", amount: 1 };
    expect(() => assertAuthorizedAction(state, proposal, "A")).not.toThrow();
    state = applyGameAction(state, proposal);
    expect(() => assertAuthorizedAction(state, { type: "APPROVE_VIRTUAL_ESSENCE_CHANGE", proposalId: "virtual-1", playerId: "A", targetPlayerId: "A" }, "A")).toThrow();
    expect(() => assertAuthorizedAction(state, { type: "APPROVE_VIRTUAL_ESSENCE_CHANGE", proposalId: "virtual-1", playerId: "B", targetPlayerId: "A" }, "B")).not.toThrow();

    state.cardInstances["A-hand-char"].zone = "FIELD";
    expect(() => assertAuthorizedAction(state, { type: "DEVASTATE_CARD", instanceId: "A-hand-char", playerId: "A" }, "A")).not.toThrow();
    const devastated = applyGameAction(state, { type: "DEVASTATE_CARD", instanceId: "A-hand-char", playerId: "A" });
    expect(playerView(devastated, "B").cardInstances.find((card) => card.instanceId === "A-hand-char")).toMatchObject({ zone: "DEVASTATED" });
    expect(() => assertAuthorizedAction(devastated, { type: "REVERT_DEVASTATION", instanceId: "A-hand-char", playerId: "B", toZone: "FIELD" }, "B")).toThrow();
    expect(() => assertAuthorizedAction(devastated, { type: "REVERT_DEVASTATION", instanceId: "A-hand-char", playerId: "A", toZone: "HAND" }, "A")).not.toThrow();
  });
});
