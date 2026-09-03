import type { CardDefinition } from "../domain/cards/card.types";
import type { CardInstance, GameState } from "../domain/game/game.types";
import testCards from "./cards/generated/test-cards.json";
import { parseCardCatalog } from "./cards/schema";

export const MOCK_IDS = {
  local: "PLAYER_LOCAL", opponent: "PLAYER_OPPONENT", charA: "mock-char-a", charB: "mock-char-b", relicA: "mock-relic-a", relicB: "mock-relic-b", verseA: "mock-verse-a", verseB: "mock-verse-b", essenceA: "mock-essence-a", essenceB: "mock-essence-b", sanctuary: "mock-sanctuary",
};

// Compatibility facade for the sandbox/tests. These cards are intentionally
// kept outside the published catalog used by preparation and rooms.
const testCardCatalog = parseCardCatalog(testCards) as CardDefinition[];
export const mockCardCatalog: CardDefinition[] = testCardCatalog.filter((definition) => definition.id.startsWith("mock-"));
export const mockCardDefinitionsById = Object.fromEntries(mockCardCatalog.map((card) => [card.id, card])) as Record<string, CardDefinition>;

const instance = (instanceId: string, cardDefinitionId: string, ownerId: string, zone: CardInstance["zone"], zoneOrder: number, controllerId = ownerId, attachedToInstanceId: string | null = null): CardInstance => ({ instanceId, cardDefinitionId, ownerId, controllerId, zone, zoneOrder, tapped: false, faceUp: zone !== "MAIN_DECK" && zone !== "ESSENCE_DECK", attachedToInstanceId, counter: 0 });

export function buildMockGameState(): GameState {
  const { local, opponent } = MOCK_IDS;
  const list = [
    instance("local-main-1", MOCK_IDS.charB, local, "MAIN_DECK", 0), instance("local-main-2", MOCK_IDS.relicB, local, "MAIN_DECK", 1), instance("local-hand-char", MOCK_IDS.charA, local, "HAND", 0), instance("local-hand-relic", MOCK_IDS.relicA, local, "HAND", 1), instance("local-hand-verse", MOCK_IDS.verseA, local, "HAND", 2), instance("local-hand-verse-2", MOCK_IDS.verseB, local, "HAND", 3), instance("local-essence-1", MOCK_IDS.essenceA, local, "ESSENCE_DECK", 0), instance("local-essence-2", MOCK_IDS.essenceB, local, "ESSENCE_DECK", 1), instance("local-sanctuary", MOCK_IDS.sanctuary, local, "SANCTUARY", 0), instance("opponent-main-1", MOCK_IDS.charB, opponent, "MAIN_DECK", 0), instance("opponent-essence-1", MOCK_IDS.essenceB, opponent, "ESSENCE_DECK", 0), instance("opponent-field-char", MOCK_IDS.charA, opponent, "FIELD", 0), instance("opponent-sanctuary", MOCK_IDS.sanctuary, opponent, "SANCTUARY", 0),
  ];
  return { gameId: "game-mission-001", roomId: "room-sandbox", revision: 0, turnNumber: 1, activePlayerId: local, startingPlayerId: local, phase: "ALBA", phaseProgress: { turnNumber: 1, playerId: local, essenceDrawn: false, mainCardDrawn: false }, players: { [local]: { playerId: local, displayName: "Tu", sanctuaryHp: 22, virtualEssenceCount: 0 }, [opponent]: { playerId: opponent, displayName: "Oponente", sanctuaryHp: 22, virtualEssenceCount: 0 } }, cardInstances: Object.fromEntries(list.map((card) => [card.instanceId, card])) };
}
