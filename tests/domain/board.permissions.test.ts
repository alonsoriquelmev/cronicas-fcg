import { describe, expect, it } from "vitest";
import { buildMockGameState, MOCK_IDS, mockCardDefinitionsById } from "@/data/mock-card-catalog";
import { canMoveFromGraveyardTo, canTapCard, getContextActions } from "@/components/board/board.permissions";

describe("board interaction permissions", () => {
  it("keeps hand cards from tap actions", () => expect(canTapCard(buildMockGameState().cardInstances["local-hand-char"], MOCK_IDS.local)).toBe(false));
  it("makes opponent cards inspect-only", () => expect(getContextActions(buildMockGameState().cardInstances["opponent-field-char"], MOCK_IDS.local)).toEqual(["INSPECT"]));
  it("does not expose generic counters for character, essence or sanctuary cards", () => {
    const state = buildMockGameState();
    const essence = state.cardInstances["local-essence-1"];
    const sanctuary = state.cardInstances["local-sanctuary"];
    const character = state.cardInstances["opponent-field-char"];
    expect(getContextActions(character, MOCK_IDS.opponent, mockCardDefinitionsById[character.cardDefinitionId])).not.toContain("COUNTER");
    expect(getContextActions(essence, MOCK_IDS.local, mockCardDefinitionsById[essence.cardDefinitionId])).not.toContain("COUNTER");
    expect(getContextActions(sanctuary, MOCK_IDS.local, mockCardDefinitionsById[sanctuary.cardDefinitionId])).not.toContain("COUNTER");
    expect(getContextActions(state.cardInstances["opponent-field-char"], MOCK_IDS.local, mockCardDefinitionsById[MOCK_IDS.charA])).toEqual(["INSPECT"]);
  });
  it("allows only the local graveyard to return cards", () => {
    const state = buildMockGameState();
    state.cardInstances["local-hand-char"].zone = "GRAVEYARD";
    state.cardInstances["opponent-field-char"].zone = "GRAVEYARD";
    expect(canMoveFromGraveyardTo(state.cardInstances["local-hand-char"], "HAND", MOCK_IDS.local)).toBe(true);
    expect(canMoveFromGraveyardTo(state.cardInstances["opponent-field-char"], "FIELD", MOCK_IDS.local)).toBe(false);
  });
});
