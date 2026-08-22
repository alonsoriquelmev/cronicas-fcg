import type { CardDefinition } from "@/domain/cards/card.types";
import type { CardInstance, GameState } from "@/domain/game/game.types";

export const MOCK_IDS = {
  local: "PLAYER_LOCAL", opponent: "PLAYER_OPPONENT", charA: "mock-char-a", charB: "mock-char-b", relicA: "mock-relic-a", relicB: "mock-relic-b", verseA: "mock-verse-a", verseB: "mock-verse-b", essenceA: "mock-essence-a", essenceB: "mock-essence-b", sanctuary: "mock-sanctuary",
};

const base = <T extends CardDefinition["type"]>(id: string, name: string, type: T): Omit<CardDefinition, "type"> & { type: T } => ({ id, name, type, factionId: "TEST", subtype: "Prototipo", image: { board: null, detail: null }, setId: "MISSION_001", collectorNumber: id, rarity: "TEST", status: "TESTING" });

export const mockCardCatalog: CardDefinition[] = [
  { ...base(MOCK_IDS.charA, "Vigía del Alba", "CHARACTER"), cost: 2, attack: 3, health: 4, rulesText: "Carta de prueba para el campo." },
  { ...base(MOCK_IDS.charB, "Guardiana del Río", "CHARACTER"), cost: 3, attack: 2, health: 5, rulesText: "Ordena manualmente la formación." },
  { ...base(MOCK_IDS.relicA, "Lanza de Bronce", "RELIC"), cost: 2, attackModifier: 2, healthModifier: null, rulesText: "Puede unirse a un personaje." },
  { ...base(MOCK_IDS.relicB, "Manto del Eco", "RELIC"), cost: 1, attackModifier: null, healthModifier: 2, rulesText: "Reliquia de prueba independiente." },
  { ...base(MOCK_IDS.verseA, "Canto Inicial", "VERSE"), cost: 2, prologueText: "El primer verso entra en resolución.", epilogueText: "Resuelto manualmente." },
  { ...base(MOCK_IDS.verseB, "Última Estrofa", "VERSE"), cost: 4, prologueText: "Una escena espera su lectura.", epilogueText: "La mesa registra el cierre." },
  { ...base(MOCK_IDS.essenceA, "Esencia Solar", "ESSENCE"), rulesText: "Recurso de prueba." },
  { ...base(MOCK_IDS.essenceB, "Esencia Umbral", "ESSENCE"), rulesText: "Recurso de prueba." },
  { ...base(MOCK_IDS.sanctuary, "Santuario de Prueba", "SANCTUARY"), health: 22, rulesText: "PV editable manualmente." },
];

export const mockCardDefinitionsById = Object.fromEntries(mockCardCatalog.map((definition) => [definition.id, definition])) as Record<string, CardDefinition>;

const instance = (instanceId: string, cardDefinitionId: string, ownerId: string, zone: CardInstance["zone"], zoneOrder: number, controllerId = ownerId, attachedToInstanceId: string | null = null): CardInstance => ({ instanceId, cardDefinitionId, ownerId, controllerId, zone, zoneOrder, tapped: false, faceUp: zone !== "MAIN_DECK" && zone !== "ESSENCE_DECK", attachedToInstanceId, counter: 0 });

export function buildMockGameState(): GameState {
  const { local, opponent } = MOCK_IDS;
  const list = [
    instance("local-main-1", MOCK_IDS.charB, local, "MAIN_DECK", 0), instance("local-main-2", MOCK_IDS.relicB, local, "MAIN_DECK", 1), instance("local-hand-char", MOCK_IDS.charA, local, "HAND", 0), instance("local-hand-relic", MOCK_IDS.relicA, local, "HAND", 1), instance("local-hand-verse", MOCK_IDS.verseA, local, "HAND", 2), instance("local-hand-verse-2", MOCK_IDS.verseB, local, "HAND", 3), instance("local-essence-1", MOCK_IDS.essenceA, local, "ESSENCE_DECK", 0), instance("local-essence-2", MOCK_IDS.essenceB, local, "ESSENCE_DECK", 1), instance("local-sanctuary", MOCK_IDS.sanctuary, local, "SANCTUARY", 0), instance("opponent-main-1", MOCK_IDS.charB, opponent, "MAIN_DECK", 0), instance("opponent-essence-1", MOCK_IDS.essenceB, opponent, "ESSENCE_DECK", 0), instance("opponent-field-char", MOCK_IDS.charA, opponent, "FIELD", 0), instance("opponent-sanctuary", MOCK_IDS.sanctuary, opponent, "SANCTUARY", 0),
  ];
  return { gameId: "game-mission-001", roomId: "room-sandbox", revision: 0, turnNumber: 1, activePlayerId: local, startingPlayerId: local, phase: "ALBA", players: { [local]: { playerId: local, displayName: "Tú", sanctuaryHp: 22 }, [opponent]: { playerId: opponent, displayName: "Oponente", sanctuaryHp: 22 } }, cardInstances: Object.fromEntries(list.map((card) => [card.instanceId, card])) };
}
