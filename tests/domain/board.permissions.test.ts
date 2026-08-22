import { describe, expect, it } from "vitest";
import { buildMockGameState, MOCK_IDS } from "@/data/mock-card-catalog";
import { canMoveFromGraveyardTo, canTapCard, getContextActions } from "@/components/board/board.permissions";

describe("board interaction permissions", () => {
  it("keeps hand cards from tap actions", () => expect(canTapCard(buildMockGameState().cardInstances["local-hand-char"], MOCK_IDS.local)).toBe(false));
  it("makes opponent cards inspect-only", () => expect(getContextActions(buildMockGameState().cardInstances["opponent-field-char"], MOCK_IDS.local)).toEqual(["INSPECT"]));
  it("allows only the local graveyard to return cards", () => {
    const state = buildMockGameState();
    state.cardInstances["local-hand-char"].zone = "GRAVEYARD";
    state.cardInstances["opponent-field-char"].zone = "GRAVEYARD";
    expect(canMoveFromGraveyardTo(state.cardInstances["local-hand-char"], "HAND", MOCK_IDS.local)).toBe(true);
    expect(canMoveFromGraveyardTo(state.cardInstances["opponent-field-char"], "FIELD", MOCK_IDS.local)).toBe(false);
  });
});
