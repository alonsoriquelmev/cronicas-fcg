import type { GameState } from "../src/domain/game/game.types";
import { cardDefinitionsById as officialDefinitions } from "../src/data/cards/catalog";
import { mockCardDefinitionsById } from "../src/data/mock-card-catalog";
import { defaultEssenceDeck, type PlayerLoadout } from "../src/domain/preparation/preparation";

const definitions = { ...mockCardDefinitionsById, ...officialDefinitions };
export { definitions };

type Zone = "MAIN_DECK" | "ESSENCE_DECK" | "HAND" | "FIELD" | "ESSENCE_ZONE" | "SANCTUARY" | "GRAVEYARD" | "VERSE_RESOLUTION";
type Card = { instanceId: string; cardDefinitionId: string; ownerId: string; controllerId: string; zone: Zone; zoneOrder: number; tapped: boolean; faceUp: boolean; attachedToInstanceId: string | null; counter: number };
const card = (instanceId: string, definitionId: string, playerId: string, zone: Zone, order: number, faceUp = true): Card => ({ instanceId, cardDefinitionId: definitionId, ownerId: playerId, controllerId: playerId, zone, zoneOrder: order, tapped: false, faceUp, attachedToInstanceId: null, counter: 0 });

export function createInitialState(roomId: string, playerOneId: string, playerTwoId: string, playerOneName: string, playerTwoName: string): GameState {
  const cards: Card[] = [
    card(`${playerOneId}-main-1`, "mock-char-b", playerOneId, "MAIN_DECK", 0, false), card(`${playerOneId}-main-2`, "mock-relic-b", playerOneId, "MAIN_DECK", 1, false),
    card(`${playerOneId}-hand-char`, "mock-char-a", playerOneId, "HAND", 0), card(`${playerOneId}-hand-relic`, "mock-relic-a", playerOneId, "HAND", 1), card(`${playerOneId}-hand-verse`, "mock-verse-a", playerOneId, "HAND", 2),
    card(`${playerOneId}-essence-1`, "mock-essence-a", playerOneId, "ESSENCE_DECK", 0, false), card(`${playerOneId}-essence-2`, "mock-essence-b", playerOneId, "ESSENCE_DECK", 1, false), card(`${playerOneId}-sanctuary`, "mock-sanctuary", playerOneId, "SANCTUARY", 0),
    card(`${playerTwoId}-main-1`, "mock-char-b", playerTwoId, "MAIN_DECK", 0, false), card(`${playerTwoId}-main-2`, "mock-relic-b", playerTwoId, "MAIN_DECK", 1, false), card(`${playerTwoId}-hand-char`, "mock-char-a", playerTwoId, "HAND", 0), card(`${playerTwoId}-hand-relic`, "mock-relic-a", playerTwoId, "HAND", 1),
    card(`${playerTwoId}-essence-1`, "mock-essence-b", playerTwoId, "ESSENCE_DECK", 0, false), card(`${playerTwoId}-essence-2`, "mock-essence-a", playerTwoId, "ESSENCE_DECK", 1, false), card(`${playerTwoId}-field-char`, "mock-char-a", playerTwoId, "FIELD", 0), card(`${playerTwoId}-sanctuary`, "mock-sanctuary", playerTwoId, "SANCTUARY", 0),
  ];
  return { gameId: `game-${roomId}`, roomId, revision: 0, turnNumber: 1, activePlayerId: playerOneId, startingPlayerId: playerOneId, phase: "ALBA" as const, phaseProgress: { turnNumber: 1, playerId: playerOneId, essenceDrawn: false, mainCardDrawn: false }, players: { [playerOneId]: { playerId: playerOneId, displayName: playerOneName, sanctuaryHp: 22, virtualEssenceCount: 0 }, [playerTwoId]: { playerId: playerTwoId, displayName: playerTwoName, sanctuaryHp: 22, virtualEssenceCount: 0 } }, cardInstances: Object.fromEntries(cards.map((item) => [item.instanceId, item])) };
}

function shuffle<T>(items: T[], random: () => number) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

export function createPreparedGameState(roomId: string, players: { playerId: string; displayName: string }[], loadouts: Record<string, PlayerLoadout>, essenceOrders: Record<string, string[]>, startingPlayerId: string, random: () => number = Math.random): GameState {
  const cards: Card[] = [];
  const gamePlayers: GameState["players"] = {};
  for (const player of players) {
    const loadout = loadouts[player.playerId];
    const mainDeck = shuffle(loadout.mainDeck, random);
    mainDeck.forEach((cardDefinitionId, index) => cards.push(card(`${player.playerId}-main-${index}`, cardDefinitionId, player.playerId, index < 5 ? "HAND" : "MAIN_DECK", index < 5 ? index : index - 5, index < 5)));
    (essenceOrders[player.playerId] ?? loadout.essenceDeck ?? defaultEssenceDeck(Object.values(definitions), loadout.faction)).forEach((cardDefinitionId, index) => cards.push(card(`${player.playerId}-essence-${index}`, cardDefinitionId, player.playerId, "ESSENCE_DECK", index, false)));
    cards.push(card(`${player.playerId}-sanctuary`, loadout.sanctuary, player.playerId, "SANCTUARY", 0));
    const sanctuary = definitions[loadout.sanctuary];
    gamePlayers[player.playerId] = { playerId: player.playerId, displayName: player.displayName, sanctuaryHp: sanctuary && "health" in sanctuary ? sanctuary.health : 0, virtualEssenceCount: 0 };
  }
  return { gameId: `game-${roomId}`, roomId, revision: 0, turnNumber: 1, activePlayerId: startingPlayerId, startingPlayerId, phase: "ALBA", phaseProgress: { turnNumber: 1, playerId: startingPlayerId, essenceDrawn: false, mainCardDrawn: false }, players: gamePlayers, cardInstances: Object.fromEntries(cards.map((item) => [item.instanceId, item])) };
}
