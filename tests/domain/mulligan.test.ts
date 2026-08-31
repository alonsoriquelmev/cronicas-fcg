import { describe, expect, it } from "vitest";
import { buildMockGameState, MOCK_IDS, mockCardDefinitionsById } from "@/data/mock-card-catalog";
import { applyMulligan } from "@/domain/preparation/mulligan";
import { getCardsInZone } from "@/domain/game/game.selectors";

describe("MISSION_003 mulligan", () => {
  it.each([2, 3])("returns the selected %i cards to the deck and keeps a hand of five", (count) => {
    const state = buildMockGameState();
    state.cardInstances["local-main-1"].zone = "MAIN_DECK";
    state.cardInstances["local-main-1"].zoneOrder = 0;
    const extraCards = Array.from({ length: 1 }, (_, index) => ({ ...state.cardInstances["local-hand-char"], instanceId: `mulligan-hand-${index}`, cardDefinitionId: index % 2 === 0 ? MOCK_IDS.charA : MOCK_IDS.relicA, zone: "HAND" as const, zoneOrder: index + 4 }));
    for (const card of extraCards) state.cardInstances[card.instanceId] = card;
    state.cardInstances["local-main-3"] = { ...state.cardInstances["local-main-1"], instanceId: "local-main-3", zoneOrder: 2 };
    const hand = getCardsInZone(state, "HAND", MOCK_IDS.local);
    const selected = hand.slice(0, count).map((card) => card.instanceId);
    const next = applyMulligan(state, MOCK_IDS.local, selected);
    expect(getCardsInZone(next, "HAND", MOCK_IDS.local)).toHaveLength(5);
    expect(getCardsInZone(next, "MAIN_DECK", MOCK_IDS.local).at(-count)?.instanceId).toBe(selected[0]);
    expect(getCardsInZone(next, "MAIN_DECK", MOCK_IDS.local).slice(-count).map((card) => card.instanceId)).toEqual(selected);
    expect(Object.values(next.cardInstances).filter((card) => card.ownerId === MOCK_IDS.local && card.zone === "HAND").every((card) => mockCardDefinitionsById[card.cardDefinitionId])).toBe(true);
  });

  it("does not accept cards outside the owner's hand", () => {
    const state = buildMockGameState();
    expect(() => applyMulligan(state, MOCK_IDS.local, ["opponent-field-char"])).toThrow();
  });
});
