import type { CardDefinition } from "../cards/card.types";
import type { GameAction } from "./game.actions";
import type { CardInstance, GameState } from "./game.types";

const copy = (state: GameState): GameState => ({ ...state, players: { ...state.players }, cardInstances: { ...state.cardInstances } });
const cards = (state: GameState, zone: CardInstance["zone"], ownerId?: string) => Object.values(state.cardInstances).filter((c) => c.zone === zone && (!ownerId || c.controllerId === ownerId)).sort((a, b) => a.zoneOrder - b.zoneOrder);
const nextOrder = (state: GameState, zone: CardInstance["zone"], ownerId: string) => cards(state, zone, ownerId).reduce((max, card) => Math.max(max, card.zoneOrder), -1) + 1;

function requireCard(state: GameState, instanceId: string) {
  const card = state.cardInstances[instanceId];
  if (!card) throw new Error(`Carta inexistente: ${instanceId}`);
  return card;
}

function move(state: GameState, instanceId: string, zone: CardInstance["zone"], controllerId?: string, attachedToInstanceId?: string | null) {
  const card = requireCard(state, instanceId);
  const nextController = controllerId ?? card.controllerId;
  state.cardInstances[instanceId] = { ...card, zone, controllerId: nextController, zoneOrder: nextOrder(state, zone, nextController), faceUp: true, attachedToInstanceId: zone === "FIELD" ? (attachedToInstanceId === undefined ? card.attachedToInstanceId : attachedToInstanceId) : null };
  if (zone !== "FIELD" && card.zone === "FIELD") {
    for (const relic of Object.values(state.cardInstances)) if (relic.attachedToInstanceId === instanceId) state.cardInstances[relic.instanceId] = { ...relic, attachedToInstanceId: null };
  }
}

function assertType(definitions: Record<string, CardDefinition> | undefined, state: GameState, instanceId: string, type: CardDefinition["type"]) {
  const definition = definitions?.[requireCard(state, instanceId).cardDefinitionId];
  if (definition && definition.type !== type) throw new Error(`Se esperaba ${type}`);
}

export function applyGameAction(state: GameState, action: GameAction, definitions?: Record<string, CardDefinition>): GameState {
  const next = copy(state);
  switch (action.type) {
    case "DRAW_CARD": {
      const card = cards(next, "MAIN_DECK", action.playerId)[0];
      if (card) move(next, card.instanceId, "HAND", action.playerId);
      break;
    }
    case "DRAW_ESSENCE": {
      const card = cards(next, "ESSENCE_DECK", action.playerId)[0];
      if (card) move(next, card.instanceId, "ESSENCE_ZONE", action.playerId);
      break;
    }
    case "PLAY_CHARACTER": assertType(definitions, next, action.instanceId, "CHARACTER"); move(next, action.instanceId, "FIELD", action.playerId, null); break;
    case "PLAY_RELIC": assertType(definitions, next, action.instanceId, "RELIC"); move(next, action.instanceId, "FIELD", action.playerId, action.attachedToInstanceId); break;
    case "PLAY_VERSE": assertType(definitions, next, action.instanceId, "VERSE"); move(next, action.instanceId, "VERSE_RESOLUTION", action.playerId); break;
    case "RESOLVE_VERSE": requireCard(next, action.instanceId); move(next, action.instanceId, "GRAVEYARD", action.playerId); break;
    case "MOVE_CARD": move(next, action.instanceId, action.toZone, action.controllerId, action.attachedToInstanceId); break;
    case "REORDER_FIELD": action.orderedInstanceIds.forEach((id, index) => { const card = requireCard(next, id); next.cardInstances[id] = { ...card, zoneOrder: index }; }); break;
    case "ATTACH_RELIC": { const relic = requireCard(next, action.relicInstanceId); const character = requireCard(next, action.characterInstanceId); if (relic.zone !== "FIELD" || character.zone !== "FIELD") throw new Error("Ambas cartas deben estar en el campo"); next.cardInstances[relic.instanceId] = { ...relic, attachedToInstanceId: character.instanceId }; break; }
    case "DETACH_RELIC": { const relic = requireCard(next, action.relicInstanceId); next.cardInstances[relic.instanceId] = { ...relic, attachedToInstanceId: null }; break; }
    case "TAP_CARD": { const card = requireCard(next, action.instanceId); next.cardInstances[card.instanceId] = { ...card, tapped: true }; break; }
    case "UNTAP_CARD": { const card = requireCard(next, action.instanceId); next.cardInstances[card.instanceId] = { ...card, tapped: false }; break; }
    case "FLIP_FACE_UP": { const card = requireCard(next, action.instanceId); next.cardInstances[card.instanceId] = { ...card, faceUp: true }; break; }
    case "FLIP_FACE_DOWN": { const card = requireCard(next, action.instanceId); next.cardInstances[card.instanceId] = { ...card, faceUp: false }; break; }
    case "CHANGE_CARD_COUNTER": { const card = requireCard(next, action.instanceId); next.cardInstances[card.instanceId] = { ...card, counter: card.counter + action.amount }; break; }
    case "CHANGE_SANCTUARY_HP": { const player = next.players[action.playerId]; if (player) next.players[action.playerId] = { ...player, sanctuaryHp: player.sanctuaryHp + action.amount }; break; }
    case "SET_SANCTUARY_HP": { const player = next.players[action.playerId]; if (player) next.players[action.playerId] = { ...player, sanctuaryHp: action.value }; break; }
    case "SET_PHASE": next.phase = action.phase; break;
    case "END_TURN": { const ids = Object.keys(next.players); const index = ids.indexOf(next.activePlayerId); next.activePlayerId = ids[(index + 1) % ids.length] ?? next.activePlayerId; next.turnNumber += 1; break; }
    case "SHUFFLE_MAIN_DECK": throw new Error("Shuffle is intentionally manual in Mission 001");
  }
  return { ...next, revision: state.revision + 1 };
}
