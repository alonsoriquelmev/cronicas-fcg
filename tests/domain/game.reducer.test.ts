import { describe, expect, it } from "vitest";
import { buildMockGameState, MOCK_IDS, mockCardDefinitionsById } from "@/data/mock-card-catalog";
import { applyGameAction } from "@/domain/game/game.reducer";
import { formatModifier, getCardsInZone, getCharacterDerivedStats, getTopCardInZone, getVisibleMarkers, sortHandForDisplay } from "@/domain/game/game.selectors";

describe("applyGameAction", () => {
  it("uses the most recent zoneOrder card as the Graveyard pile top", () => {
    const state = buildMockGameState();
    const first = state.cardInstances["local-hand-char"];
    const second = state.cardInstances["local-hand-relic"];
    first.zone = "GRAVEYARD";
    first.zoneOrder = 0;
    second.zone = "GRAVEYARD";
    second.zoneOrder = 1;
    expect(getTopCardInZone([second, first])?.instanceId).toBe(second.instanceId);
  });
  it("rejects a Relic played from Hand without an attachment", () => {
    expect(() => applyGameAction(buildMockGameState(), { type: "PLAY_RELIC", instanceId: "local-hand-relic", playerId: MOCK_IDS.local, attachedToInstanceId: null }, mockCardDefinitionsById)).toThrow();
  });
  it("draws the first ordered main deck card", () => { const next = applyGameAction(buildMockGameState(), { type: "DRAW_CARD", playerId: MOCK_IDS.local }, mockCardDefinitionsById); expect(next.cardInstances["local-main-1"].zone).toBe("HAND"); expect(getCardsInZone(next, "MAIN_DECK", MOCK_IDS.local)).toHaveLength(1); });
  it("untaps a card whenever it returns to hand", () => {
    const state = buildMockGameState();
    state.cardInstances["local-hand-char"] = { ...state.cardInstances["local-hand-char"], zone: "FIELD", tapped: true };
    const next = applyGameAction(state, { type: "MOVE_CARD", instanceId: "local-hand-char", toZone: "HAND", controllerId: MOCK_IDS.local });
    expect(next.cardInstances["local-hand-char"]).toMatchObject({ zone: "HAND", tapped: false });
  });
  it("draws essence from the top and preserves deck order", () => { const next = applyGameAction(buildMockGameState(), { type: "DRAW_ESSENCE", playerId: MOCK_IDS.local }, mockCardDefinitionsById); expect(next.cardInstances["local-essence-1"].zone).toBe("ESSENCE_ZONE"); expect(getCardsInZone(next, "ESSENCE_DECK", MOCK_IDS.local)[0].instanceId).toBe("local-essence-2"); });
  it("plays a character and attaches a relic", () => { let next = applyGameAction(buildMockGameState(), { type: "PLAY_CHARACTER", instanceId: "local-hand-char", playerId: MOCK_IDS.local }, mockCardDefinitionsById); next = applyGameAction(next, { type: "PLAY_RELIC", instanceId: "local-hand-relic", playerId: MOCK_IDS.local, attachedToInstanceId: "local-hand-char" }, mockCardDefinitionsById); expect(next.cardInstances["local-hand-char"].zone).toBe("FIELD"); expect(next.cardInstances["local-hand-relic"].attachedToInstanceId).toBe("local-hand-char"); });
  it("moves verse through resolution to graveyard", () => { let next = applyGameAction(buildMockGameState(), { type: "PLAY_VERSE", instanceId: "local-hand-verse", playerId: MOCK_IDS.local }, mockCardDefinitionsById); expect(next.cardInstances["local-hand-verse"].zone).toBe("VERSE_RESOLUTION"); next = applyGameAction(next, { type: "RESOLVE_VERSE", instanceId: "local-hand-verse", playerId: MOCK_IDS.local }, mockCardDefinitionsById); expect(next.cardInstances["local-hand-verse"].zone).toBe("GRAVEYARD"); });
  it("supports tap, counters, sanctuary hp and field reorder", () => { let next = applyGameAction(buildMockGameState(), { type: "TAP_CARD", instanceId: "opponent-field-char" }); expect(next.cardInstances["opponent-field-char"].tapped).toBe(true); next = applyGameAction(next, { type: "UNTAP_CARD", instanceId: "opponent-field-char" }); next = applyGameAction(next, { type: "CHANGE_CARD_COUNTER", instanceId: "opponent-field-char", amount: 2 }); next = applyGameAction(next, { type: "CHANGE_SANCTUARY_HP", playerId: MOCK_IDS.local, amount: -3 }); expect(next.cardInstances["opponent-field-char"].counter).toBe(2); expect(next.players[MOCK_IDS.local].sanctuaryHp).toBe(19); });
  it("sorts hand display by type without changing authoritative hand order", () => {
    const state = buildMockGameState();
    const hand = [state.cardInstances["local-hand-relic"], state.cardInstances["local-hand-char"], state.cardInstances["local-hand-verse"]];
    const sorted = sortHandForDisplay(hand, mockCardDefinitionsById);
    expect(sorted.map((card) => card.instanceId)).toEqual(["local-hand-char", "local-hand-verse", "local-hand-relic"]);
    expect(hand.map((card) => card.instanceId)).toEqual(["local-hand-relic", "local-hand-char", "local-hand-verse"]);
  });

  it("sorts cards of the same hand type by cost and then alphabetically", () => {
    const state = buildMockGameState();
    const alphaId = "test-char-alpha";
    const expensiveId = "test-char-expensive";
    const definitions = {
      ...mockCardDefinitionsById,
      [alphaId]: { ...mockCardDefinitionsById[MOCK_IDS.charA], id: alphaId, name: "Alba", cost: 2 },
      [expensiveId]: { ...mockCardDefinitionsById[MOCK_IDS.charA], id: expensiveId, name: "Bruma", cost: 5 },
    };
    const alpha = { ...state.cardInstances["local-hand-char"], instanceId: "hand-alpha", cardDefinitionId: alphaId, zoneOrder: 2 };
    const expensive = { ...state.cardInstances["local-hand-char"], instanceId: "hand-expensive", cardDefinitionId: expensiveId, zoneOrder: 0 };
    const base = { ...state.cardInstances["local-hand-char"], zoneOrder: 1 };
    expect(sortHandForDisplay([expensive, base, alpha], definitions).map((card) => card.instanceId)).toEqual(["hand-alpha", "local-hand-char", "hand-expensive"]);
  });

  it("derives character stats without mutating definitions", () => {
    const state = buildMockGameState();
    const character = state.cardInstances["local-hand-char"];
    const relicA = state.cardInstances["local-hand-relic"];
    const relicB = { ...relicA, instanceId: "local-field-relic-b", cardDefinitionId: MOCK_IDS.relicB };
    const originalCharacter = mockCardDefinitionsById[MOCK_IDS.charA];
    const originalRelic = mockCardDefinitionsById[MOCK_IDS.relicA];

    expect(getCharacterDerivedStats(character, [], mockCardDefinitionsById)).toEqual({ attack: 3, health: 4 });
    expect(getCharacterDerivedStats(character, [relicA], mockCardDefinitionsById)).toEqual({ attack: 5, health: 4 });
    expect(getCharacterDerivedStats(character, [relicB], mockCardDefinitionsById)).toEqual({ attack: 3, health: 6 });
    const zeroDefinitions = { ...mockCardDefinitionsById, [MOCK_IDS.relicA]: { ...originalRelic, attackModifier: 0, healthModifier: 0 } };
    expect(getCharacterDerivedStats(character, [relicA], zeroDefinitions)).toEqual({ attack: 3, health: 4 });
    expect(formatModifier(0)).toBe("+0");
    expect(formatModifier(-1)).toBe("-1");
    expect(formatModifier(null)).toBeNull();
    const negativeDefinitions = { ...mockCardDefinitionsById, [MOCK_IDS.relicB]: { ...mockCardDefinitionsById[MOCK_IDS.relicB], attackModifier: -1, healthModifier: 3 } };
    expect(getCharacterDerivedStats(character, [relicB], negativeDefinitions)).toEqual({ attack: 2, health: 7 });
    expect(getCharacterDerivedStats(character, [relicA, relicB], mockCardDefinitionsById)).toEqual({ attack: 5, health: 6 });
    expect(mockCardDefinitionsById[MOCK_IDS.charA]).toBe(originalCharacter);
    expect(mockCardDefinitionsById[MOCK_IDS.relicA]).toBe(originalRelic);
  });

  it("clamps derived Character stats at zero and includes approved manual modifiers", () => {
    const state = buildMockGameState();
    const character = { ...state.cardInstances["local-hand-char"], manualAttackModifier: -20, manualHealthModifier: -20 };
    const relic = state.cardInstances["local-hand-relic"];
    expect(getCharacterDerivedStats(character, [relic], mockCardDefinitionsById)).toEqual({ attack: 0, health: 0 });
  });

  it("moves cards through manual deck tools and applies an explicit shuffle order", () => {
    let state = buildMockGameState();
    state = applyGameAction(state, { type: "MOVE_HAND_CARD_TO_GRAVEYARD", instanceId: "local-hand-char", playerId: MOCK_IDS.local });
    expect(state.cardInstances["local-hand-char"].zone).toBe("GRAVEYARD");

    state = applyGameAction(state, { type: "SHUFFLE_CARD_INTO_MAIN_DECK", instanceId: "local-hand-char", playerId: MOCK_IDS.local, orderedInstanceIds: ["local-main-2", "local-hand-char", "local-main-1"] });
    expect(getCardsInZone(state, "MAIN_DECK", MOCK_IDS.local).map((card) => card.instanceId)).toEqual(["local-main-2", "local-hand-char", "local-main-1"]);
    expect(state.cardInstances["local-hand-char"].faceUp).toBe(false);

    state = applyGameAction(state, { type: "SEND_MAIN_DECK_TOP_TO_GRAVEYARD", playerId: MOCK_IDS.local });
    expect(state.cardInstances["local-main-2"].zone).toBe("GRAVEYARD");
  });

  it("keeps looked Main Deck cards private to a temporary ordered session and resolves selected cards", () => {
    let state = buildMockGameState();
    state = applyGameAction(state, { type: "LOOK_AT_MAIN_DECK", playerId: MOCK_IDS.local, count: 2 });
    expect(state.deckLooks?.[MOCK_IDS.local]?.orderedInstanceIds).toEqual(["local-main-1", "local-main-2"]);
    expect(state.cardInstances["local-main-1"].zone).toBe("DECK_LOOK");

    state = applyGameAction(state, { type: "REORDER_DECK_LOOK", playerId: MOCK_IDS.local, orderedInstanceIds: ["local-main-2", "local-main-1"] });
    state = applyGameAction(state, { type: "RESOLVE_DECK_LOOK", playerId: MOCK_IDS.local, instanceIds: ["local-main-2"], destination: "HAND" });
    expect(state.cardInstances["local-main-2"].zone).toBe("HAND");
    expect(state.deckLooks?.[MOCK_IDS.local]?.orderedInstanceIds).toEqual(["local-main-1"]);

    state = applyGameAction(state, { type: "RESOLVE_DECK_LOOK", playerId: MOCK_IDS.local, instanceIds: ["local-main-1"], destination: "BOTTOM" });
    expect(state.cardInstances["local-main-1"].zone).toBe("MAIN_DECK");
    expect(state.deckLooks?.[MOCK_IDS.local]).toBeUndefined();
  });

  it("searches the whole Main Deck and returns unselected cards in their original order", () => {
    let state = buildMockGameState();
    state = applyGameAction(state, { type: "SEARCH_MAIN_DECK", playerId: MOCK_IDS.local }, mockCardDefinitionsById);
    expect(state.deckLooks?.[MOCK_IDS.local]).toEqual({ orderedInstanceIds: ["local-main-1", "local-main-2"], mode: "SEARCH" });
    expect(state.cardInstances["local-main-1"].zone).toBe("DECK_LOOK");
    expect(state.cardInstances["local-main-2"].zone).toBe("DECK_LOOK");

    state = applyGameAction(state, { type: "RESOLVE_DECK_SEARCH", playerId: MOCK_IDS.local, instanceIds: ["local-main-2"], destination: "HAND" }, mockCardDefinitionsById);
    expect(state.cardInstances["local-main-2"].zone).toBe("HAND");
    expect(state.deckLooks?.[MOCK_IDS.local]?.orderedInstanceIds).toEqual(["local-main-1"]);

    state = applyGameAction(state, { type: "CLOSE_DECK_SEARCH", playerId: MOCK_IDS.local }, mockCardDefinitionsById);
    expect(state.deckLooks?.[MOCK_IDS.local]).toBeUndefined();
    expect(getCardsInZone(state, "MAIN_DECK", MOCK_IDS.local).map((card) => card.instanceId)).toEqual(["local-main-1"]);
    expect(state.cardInstances["local-main-1"].faceUp).toBe(false);
  });

  it("requires an approved virtual Essence change and never permits a negative count", () => {
    let state = buildMockGameState();
    state = applyGameAction(state, { type: "REQUEST_VIRTUAL_ESSENCE_CHANGE", proposalId: "ve-1", playerId: MOCK_IDS.local, amount: 2 });
    expect(state.players[MOCK_IDS.local].virtualEssenceCount).toBe(0);
    state = applyGameAction(state, { type: "APPROVE_VIRTUAL_ESSENCE_CHANGE", proposalId: "ve-1", playerId: MOCK_IDS.opponent, targetPlayerId: MOCK_IDS.local });
    expect(state.players[MOCK_IDS.local].virtualEssenceCount).toBe(2);
    expect(() => applyGameAction(state, { type: "REQUEST_VIRTUAL_ESSENCE_CHANGE", proposalId: "ve-2", playerId: MOCK_IDS.local, amount: -3 })).toThrow();
  });

  it("moves a card to the public Devastated zone and restores it without mutating its definition", () => {
    let state = buildMockGameState();
    state.cardInstances["local-hand-char"].zone = "FIELD";
    state = applyGameAction(state, { type: "DEVASTATE_CARD", instanceId: "local-hand-char", playerId: MOCK_IDS.local }, mockCardDefinitionsById);
    expect(state.cardInstances["local-hand-char"]).toMatchObject({ zone: "DEVASTATED", devastatedFromZone: "FIELD" });
    state = applyGameAction(state, { type: "REVERT_DEVASTATION", instanceId: "local-hand-char", playerId: MOCK_IDS.local, toZone: "FIELD" }, mockCardDefinitionsById);
    expect(state.cardInstances["local-hand-char"].zone).toBe("FIELD");
    expect(state.cardInstances["local-hand-char"]).not.toHaveProperty("devastatedFromZone");
  });

  it("allows a devastated card to return to Hand as a manual recovery path", () => {
    let state = buildMockGameState();
    state.cardInstances["local-hand-char"].zone = "FIELD";
    state = applyGameAction(state, { type: "DEVASTATE_CARD", instanceId: "local-hand-char", playerId: MOCK_IDS.local }, mockCardDefinitionsById);
    state = applyGameAction(state, { type: "REVERT_DEVASTATION", instanceId: "local-hand-char", playerId: MOCK_IDS.local, toZone: "HAND" }, mockCardDefinitionsById);
    expect(state.cardInstances["local-hand-char"].zone).toBe("HAND");
  });

  it("derives the visible Vestigio marker only from structured Graveyard keywords", () => {
    const state = buildMockGameState();
    state.cardInstances["local-hand-char"].zone = "GRAVEYARD";
    const definitions = { ...mockCardDefinitionsById, [MOCK_IDS.charA]: { ...mockCardDefinitionsById[MOCK_IDS.charA], keywords: ["Vestigio"] } };
    expect(getVisibleMarkers(state, MOCK_IDS.local, definitions)[0]).toMatchObject({ label: "Vestigio", value: 1 });
  });

  it("returns an Essence to the bottom of its deck", () => {
    const state = buildMockGameState();
    state.cardInstances["local-essence-1"].zone = "ESSENCE_ZONE";
    const next = applyGameAction(state, { type: "RETURN_ESSENCE_TO_DECK_BOTTOM", instanceId: "local-essence-1", playerId: MOCK_IDS.local });
    expect(getCardsInZone(next, "ESSENCE_DECK", MOCK_IDS.local).map((card) => card.instanceId)).toEqual(["local-essence-2", "local-essence-1"]);
    expect(next.cardInstances["local-essence-1"].faceUp).toBe(false);
  });

  it("orders Verses globally from left to right across both controllers", () => {
    let state = buildMockGameState();
    const rivalVerse = { ...state.cardInstances["local-hand-verse-2"], instanceId: "opponent-hand-verse", ownerId: MOCK_IDS.opponent, controllerId: MOCK_IDS.opponent };
    state.cardInstances[rivalVerse.instanceId] = rivalVerse;
    state = applyGameAction(state, { type: "PLAY_VERSE", instanceId: "local-hand-verse", playerId: MOCK_IDS.local }, mockCardDefinitionsById);
    state = applyGameAction(state, { type: "PLAY_VERSE", instanceId: rivalVerse.instanceId, playerId: MOCK_IDS.opponent }, mockCardDefinitionsById);
    expect(getCardsInZone(state, "VERSE_RESOLUTION").map((card) => card.instanceId)).toEqual(["local-hand-verse", rivalVerse.instanceId]);
  });

  it("applies a Character stat proposal only after approval", () => {
    let state = buildMockGameState();
    state.cardInstances["local-hand-char"].zone = "FIELD";
    state = applyGameAction(state, { type: "PROPOSE_CHARACTER_STAT_CHANGE", proposalId: "proposal-1", characterInstanceId: "local-hand-char", playerId: MOCK_IDS.local, attackDelta: 2, healthDelta: -1 });
    expect(state.cardInstances["local-hand-char"].manualAttackModifier).toBeUndefined();
    state = applyGameAction(state, { type: "APPROVE_CHARACTER_STAT_CHANGE", proposalId: "proposal-1", characterInstanceId: "local-hand-char", playerId: MOCK_IDS.opponent });
    expect(state.cardInstances["local-hand-char"]).toMatchObject({ manualAttackModifier: 2, manualHealthModifier: -1 });
    expect(state.pendingStatChanges?.["local-hand-char"]).toBeUndefined();
  });

  it("clears a pending Character stat proposal when the Character leaves Field", () => {
    let state = buildMockGameState();
    state.cardInstances["local-hand-char"].zone = "FIELD";
    state = applyGameAction(state, { type: "PROPOSE_CHARACTER_STAT_CHANGE", proposalId: "proposal-1", characterInstanceId: "local-hand-char", playerId: MOCK_IDS.local, attackDelta: 1, healthDelta: 0 });
    state = applyGameAction(state, { type: "MOVE_CARD", instanceId: "local-hand-char", toZone: "GRAVEYARD", controllerId: MOCK_IDS.local }, mockCardDefinitionsById);
    expect(state.pendingStatChanges?.["local-hand-char"]).toBeUndefined();
  });

  it("adds and removes reusable manual markers from a Field Character", () => {
    let state = buildMockGameState();
    state.cardInstances["local-hand-char"].zone = "FIELD";

    state = applyGameAction(
      state,
      { type: "ADD_CHARACTER_MARKER", characterInstanceId: "local-hand-char", markerId: "marker-1", marker: "IMBATIBLE" },
      mockCardDefinitionsById,
    );
    expect(state.characterMarkers?.["local-hand-char"]).toEqual([{ markerId: "marker-1", kind: "IMBATIBLE" }]);

    state = applyGameAction(
      state,
      { type: "REMOVE_CHARACTER_MARKER", characterInstanceId: "local-hand-char", markerId: "marker-1" },
      mockCardDefinitionsById,
    );
    expect(state.characterMarkers?.["local-hand-char"]).toEqual([]);
  });

  it("clears Character markers when the Character leaves Field", () => {
    let state = buildMockGameState();
    state.cardInstances["local-hand-char"].zone = "FIELD";
    state = applyGameAction(
      state,
      { type: "ADD_CHARACTER_MARKER", characterInstanceId: "local-hand-char", markerId: "marker-1", marker: "MITICA" },
      mockCardDefinitionsById,
    );

    state = applyGameAction(
      state,
      { type: "MOVE_CARD", instanceId: "local-hand-char", toZone: "GRAVEYARD", controllerId: MOCK_IDS.local },
      mockCardDefinitionsById,
    );
    expect(state.characterMarkers?.["local-hand-char"]).toBeUndefined();
  });

  it("plays a Character onto a loose Relic atomically", () => {
    const state = buildMockGameState();
    state.cardInstances["local-hand-relic"].zone = "FIELD";
    const next = applyGameAction(state, { type: "PLAY_CHARACTER_ATTACH_RELIC", characterInstanceId: "local-hand-char", relicInstanceId: "local-hand-relic", playerId: MOCK_IDS.local }, mockCardDefinitionsById);
    expect(next.cardInstances["local-hand-char"].zone).toBe("FIELD");
    expect(next.cardInstances["local-hand-relic"]).toMatchObject({ zone: "FIELD", attachedToInstanceId: "local-hand-char" });
  });

  it("moves a Character to Graveyard and releases every attached Relic atomically", () => {
    const state = buildMockGameState();
    const character = state.cardInstances["opponent-field-char"];
    character.controllerId = MOCK_IDS.local;
    const relicA = { ...state.cardInstances["local-hand-relic"], instanceId: "local-field-relic-a", zone: "FIELD" as const, attachedToInstanceId: character.instanceId, tapped: true, counter: 2 };
    const relicB = { ...relicA, instanceId: "local-field-relic-b", cardDefinitionId: MOCK_IDS.relicB, attachedToInstanceId: character.instanceId, tapped: false, counter: 4 };
    state.cardInstances[relicA.instanceId] = relicA;
    state.cardInstances[relicB.instanceId] = relicB;
    const next = applyGameAction(state, { type: "MOVE_CARD", instanceId: character.instanceId, toZone: "GRAVEYARD", controllerId: MOCK_IDS.local }, mockCardDefinitionsById);
    expect(next.cardInstances[character.instanceId].zone).toBe("GRAVEYARD");
    expect(next.cardInstances[relicA.instanceId]).toMatchObject({ zone: "FIELD", attachedToInstanceId: null, tapped: true, counter: 2 });
    expect(next.cardInstances[relicB.instanceId]).toMatchObject({ zone: "FIELD", attachedToInstanceId: null, tapped: false, counter: 4 });
  });
});
