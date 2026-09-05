import type { CardDefinition } from "../cards/card.types";
import type { GameAction } from "./game.actions";
import type { CardInstance, GameState } from "./game.types";
import { isCharacterMarkerKind } from "./character-markers";
import { getCurrentTurnPhaseProgress, isOpeningTurn } from "./phase-rules";

const copy = (state: GameState): GameState => ({
  ...state,
  players: { ...state.players },
  cardInstances: { ...state.cardInstances },
  deckLooks: Object.fromEntries(Object.entries(state.deckLooks ?? {}).map(([playerId, look]) => [playerId, { ...look, orderedInstanceIds: [...look.orderedInstanceIds], revealedInstanceIds: [...(look.revealedInstanceIds ?? [])] }])),
  pendingStatChanges: { ...(state.pendingStatChanges ?? {}) },
  pendingVirtualEssenceChanges: { ...(state.pendingVirtualEssenceChanges ?? {}) },
  characterMarkers: Object.fromEntries(Object.entries(state.characterMarkers ?? {}).map(([characterInstanceId, markers]) => [characterInstanceId, markers.map((marker) => ({ ...marker }))])),
  phaseProgress: state.phaseProgress ? { ...state.phaseProgress } : undefined,
});
const cards = (state: GameState, zone: CardInstance["zone"], ownerId?: string) => Object.values(state.cardInstances).filter((c) => c.zone === zone && (!ownerId || c.controllerId === ownerId)).sort((a, b) => a.zoneOrder - b.zoneOrder);
const nextOrder = (state: GameState, zone: CardInstance["zone"], ownerId?: string) => cards(state, zone, ownerId).reduce((max, card) => Math.max(max, card.zoneOrder), -1) + 1;

function requireCard(state: GameState, instanceId: string) {
  const card = state.cardInstances[instanceId];
  if (!card) throw new Error(`Carta inexistente: ${instanceId}`);
  return card;
}

function move(state: GameState, instanceId: string, zone: CardInstance["zone"], controllerId?: string, attachedToInstanceId?: string | null) {
  const card = requireCard(state, instanceId);
  const nextController = controllerId ?? card.controllerId;
  const orderedByController = zone === "VERSE_RESOLUTION" ? undefined : nextController;
  state.cardInstances[instanceId] = { ...card, zone, controllerId: nextController, zoneOrder: nextOrder(state, zone, orderedByController), tapped: zone === "FIELD" || zone === "ESSENCE_ZONE" ? card.tapped : false, faceUp: zone !== "MAIN_DECK" && zone !== "ESSENCE_DECK", attachedToInstanceId: zone === "FIELD" ? (attachedToInstanceId === undefined ? card.attachedToInstanceId : attachedToInstanceId) : null, manualAttackModifier: zone === "FIELD" ? card.manualAttackModifier : 0, manualHealthModifier: zone === "FIELD" ? card.manualHealthModifier : 0 };
  if (zone !== "FIELD" && state.pendingStatChanges?.[instanceId]) delete state.pendingStatChanges[instanceId];
  if (zone !== "FIELD" && state.characterMarkers?.[instanceId]) delete state.characterMarkers[instanceId];
  if (zone !== "FIELD" && card.zone === "FIELD") {
    for (const relic of Object.values(state.cardInstances)) if (relic.attachedToInstanceId === instanceId) state.cardInstances[relic.instanceId] = { ...relic, attachedToInstanceId: null };
  }
}

function applyDeckOrder(state: GameState, playerId: string, orderedInstanceIds: string[] | undefined) {
  const currentIds = cards(state, "MAIN_DECK", playerId).map((card) => card.instanceId).sort();
  const orderedIds = [...(orderedInstanceIds ?? [])];
  if (orderedIds.length !== currentIds.length || [...orderedIds].sort().some((id, index) => id !== currentIds[index])) throw new Error("El orden de barajado no coincide con el Mazo Principal");
  orderedIds.forEach((instanceId, zoneOrder) => {
    const card = requireCard(state, instanceId);
    state.cardInstances[instanceId] = { ...card, zone: "MAIN_DECK", zoneOrder, faceUp: false, attachedToInstanceId: null };
  });
}

function assertNoDeckLook(state: GameState, playerId: string) {
  if (state.deckLooks?.[playerId]) throw new Error("Resuelve primero las cartas que estas mirando");
}

function deckLook(state: GameState, playerId: string) {
  const look = state.deckLooks?.[playerId];
  if (!look) throw new Error("No hay cartas del Mazo Principal en revision");
  return look;
}

function removeDeckLook(state: GameState, playerId: string, instanceIds: string[]) {
  const look = deckLook(state, playerId);
  const selected = new Set(instanceIds);
  const remaining = look.orderedInstanceIds.filter((instanceId) => !selected.has(instanceId));
  if (remaining.length === 0) delete state.deckLooks?.[playerId];
  else state.deckLooks![playerId] = { orderedInstanceIds: remaining };
}

function returnLookedCardsToDeck(state: GameState, playerId: string, instanceIds: string[], destination: "TOP" | "BOTTOM") {
  const currentDeckIds = cards(state, "MAIN_DECK", playerId).map((card) => card.instanceId);
  const orderedIds = destination === "TOP"
    ? [...instanceIds, ...currentDeckIds]
    : [...currentDeckIds, ...instanceIds];
  instanceIds.forEach((instanceId) => {
    const card = requireCard(state, instanceId);
    state.cardInstances[instanceId] = { ...card, zone: "MAIN_DECK", faceUp: false, attachedToInstanceId: null };
  });
  orderedIds.forEach((instanceId, zoneOrder) => {
    const card = requireCard(state, instanceId);
    state.cardInstances[instanceId] = { ...card, zone: "MAIN_DECK", zoneOrder, faceUp: false, attachedToInstanceId: null };
  });
}

function assertType(definitions: Record<string, CardDefinition> | undefined, state: GameState, instanceId: string, type: CardDefinition["type"]) {
  const definition = definitions?.[requireCard(state, instanceId).cardDefinitionId];
  if (definition && definition.type !== type) throw new Error(`Se esperaba ${type}`);
}

export function applyGameAction(state: GameState, action: GameAction, definitions?: Record<string, CardDefinition>): GameState {
  const next = copy(state);
  switch (action.type) {
    case "DRAW_CARD": {
      assertNoDeckLook(next, action.playerId);
      if (next.phase === "AMANECER" && isOpeningTurn(next, action.playerId)) throw new Error("El jugador inicial no roba durante su primer Amanecer");
      const card = cards(next, "MAIN_DECK", action.playerId)[0];
      if (card) {
        move(next, card.instanceId, "HAND", action.playerId);
        if (next.activePlayerId === action.playerId && next.phase === "AMANECER") next.phaseProgress = { ...getCurrentTurnPhaseProgress(next), mainCardDrawn: true };
      }
      break;
    }
    case "LOOK_AT_MAIN_DECK": {
      assertNoDeckLook(next, action.playerId);
      const deck = cards(next, "MAIN_DECK", action.playerId);
      if (!Number.isInteger(action.count) || action.count < 1 || action.count > deck.length) throw new Error("La cantidad a mirar no es valida");
      const looked = deck.slice(0, action.count);
      looked.forEach((card, zoneOrder) => {
        next.cardInstances[card.instanceId] = { ...card, zone: "DECK_LOOK", zoneOrder, faceUp: true, attachedToInstanceId: null };
      });
      next.deckLooks![action.playerId] = { orderedInstanceIds: looked.map((card) => card.instanceId), mode: "LOOK" };
      break;
    }
    case "SEARCH_MAIN_DECK": {
      assertNoDeckLook(next, action.playerId);
      const deck = cards(next, "MAIN_DECK", action.playerId);
      deck.forEach((card) => {
        next.cardInstances[card.instanceId] = { ...card, zone: "DECK_LOOK", faceUp: true, attachedToInstanceId: null };
      });
      next.deckLooks![action.playerId] = { orderedInstanceIds: deck.map((card) => card.instanceId), mode: "SEARCH", revealedInstanceIds: [] };
      break;
    }
    case "REORDER_DECK_LOOK": {
      const look = deckLook(next, action.playerId);
      const expected = [...look.orderedInstanceIds].sort();
      const received = [...action.orderedInstanceIds].sort();
      if (expected.length !== received.length || expected.some((instanceId, index) => instanceId !== received[index])) throw new Error("El orden de las cartas revisadas no coincide");
      action.orderedInstanceIds.forEach((instanceId, zoneOrder) => {
        const card = requireCard(next, instanceId);
        next.cardInstances[instanceId] = { ...card, zoneOrder };
      });
      next.deckLooks![action.playerId] = { orderedInstanceIds: [...action.orderedInstanceIds], mode: look.mode ?? "LOOK", revealedInstanceIds: [...(look.revealedInstanceIds ?? [])] };
      break;
    }
    case "SET_DECK_SEARCH_REVEALED": {
      const look = deckLook(next, action.playerId);
      if (look.mode !== "SEARCH") throw new Error("No hay una busqueda activa del Mazo Principal");
      const requested = new Set(action.instanceIds);
      if (requested.size === 0 || action.instanceIds.length !== requested.size || action.instanceIds.some((instanceId) => !look.orderedInstanceIds.includes(instanceId))) throw new Error("La seleccion no pertenece a la busqueda");
      const current = new Set(look.revealedInstanceIds ?? []);
      action.instanceIds.forEach((instanceId) => action.revealed ? current.add(instanceId) : current.delete(instanceId));
      next.deckLooks![action.playerId] = { ...look, revealedInstanceIds: look.orderedInstanceIds.filter((instanceId) => current.has(instanceId)) };
      break;
    }
    case "RESOLVE_DECK_LOOK": {
      const look = deckLook(next, action.playerId);
      const requested = new Set(action.instanceIds);
      if (requested.size === 0 || action.instanceIds.length !== requested.size || action.instanceIds.some((instanceId) => !look.orderedInstanceIds.includes(instanceId))) throw new Error("La seleccion no pertenece a las cartas revisadas");
      const selected = look.orderedInstanceIds.filter((instanceId) => requested.has(instanceId));
      if (action.destination === "TOP" || action.destination === "BOTTOM") {
        returnLookedCardsToDeck(next, action.playerId, selected, action.destination);
      } else if (action.destination === "SHUFFLE") {
        const deckIds = cards(next, "MAIN_DECK", action.playerId).map((card) => card.instanceId);
        selected.forEach((instanceId) => {
          const card = requireCard(next, instanceId);
          next.cardInstances[instanceId] = { ...card, zone: "MAIN_DECK", faceUp: false, attachedToInstanceId: null };
        });
        applyDeckOrder(next, action.playerId, action.orderedInstanceIds ?? [...deckIds, ...selected]);
      } else {
        const destination = action.destination === "HAND" ? "HAND" : "GRAVEYARD";
        selected.forEach((instanceId) => move(next, instanceId, destination, action.playerId));
      }
      removeDeckLook(next, action.playerId, selected);
      break;
    }
    case "RESOLVE_DECK_SEARCH": {
      const look = deckLook(next, action.playerId);
      if (look.mode !== "SEARCH") throw new Error("No hay una busqueda activa del Mazo Principal");
      const requested = new Set(action.instanceIds);
      if (requested.size === 0 || action.instanceIds.length !== requested.size || action.instanceIds.some((instanceId) => !look.orderedInstanceIds.includes(instanceId))) throw new Error("La seleccion no pertenece a la busqueda");
      if (action.destination === "FIELD") {
        action.instanceIds.forEach((instanceId) => {
          const definition = definitions?.[requireCard(next, instanceId).cardDefinitionId];
          if (definition && definition.type !== "CHARACTER" && definition.type !== "RELIC") throw new Error("Solo Personajes y Reliquias pueden ir al Campo");
        });
      }
      action.instanceIds.forEach((instanceId) => move(next, instanceId, action.destination, action.playerId, null));
      next.deckLooks![action.playerId] = { orderedInstanceIds: look.orderedInstanceIds.filter((instanceId) => !requested.has(instanceId)), mode: "SEARCH", revealedInstanceIds: (look.revealedInstanceIds ?? []).filter((instanceId) => !requested.has(instanceId)) };
      break;
    }
    case "CLOSE_DECK_SEARCH": {
      const look = deckLook(next, action.playerId);
      if (look.mode !== "SEARCH") throw new Error("No hay una busqueda activa del Mazo Principal");
      const remaining = look.orderedInstanceIds
        .map((instanceId) => requireCard(next, instanceId))
        .sort((a, b) => a.zoneOrder - b.zoneOrder || a.instanceId.localeCompare(b.instanceId));
      remaining.forEach((card, zoneOrder) => {
        next.cardInstances[card.instanceId] = { ...card, zone: "MAIN_DECK", zoneOrder, faceUp: false, attachedToInstanceId: null };
      });
      delete next.deckLooks?.[action.playerId];
      break;
    }
    case "SHUFFLE_MAIN_DECK": assertNoDeckLook(next, action.playerId); applyDeckOrder(next, action.playerId, action.orderedInstanceIds); break;
    case "SEND_MAIN_DECK_TOP_TO_GRAVEYARD": {
      assertNoDeckLook(next, action.playerId);
      const card = cards(next, "MAIN_DECK", action.playerId)[0];
      if (card) move(next, card.instanceId, "GRAVEYARD", action.playerId);
      break;
    }
    case "MOVE_HAND_CARD_TO_GRAVEYARD": move(next, action.instanceId, "GRAVEYARD", action.playerId); break;
    case "SHUFFLE_CARD_INTO_MAIN_DECK": {
      assertNoDeckLook(next, action.playerId);
      move(next, action.instanceId, "MAIN_DECK", action.playerId);
      applyDeckOrder(next, action.playerId, action.orderedInstanceIds);
      break;
    }
    case "DRAW_ESSENCE": {
      const card = cards(next, "ESSENCE_DECK", action.playerId)[0];
      if (card) {
        move(next, card.instanceId, "ESSENCE_ZONE", action.playerId);
        if (next.activePlayerId === action.playerId && next.phase === "ALBA") next.phaseProgress = { ...getCurrentTurnPhaseProgress(next), essenceDrawn: true };
      }
      break;
    }
    case "RETURN_ESSENCE_TO_DECK_BOTTOM": move(next, action.instanceId, "ESSENCE_DECK", action.playerId); break;
    case "PLAY_CHARACTER": if (next.phase !== "MEDIODIA") throw new Error("Personajes y Reliquias solo pueden jugarse durante MEDIODIA"); assertType(definitions, next, action.instanceId, "CHARACTER"); move(next, action.instanceId, "FIELD", action.playerId, null); break;
    case "PLAY_CHARACTER_ATTACH_RELIC": if (next.phase !== "MEDIODIA") throw new Error("Personajes y Reliquias solo pueden jugarse durante MEDIODIA"); assertType(definitions, next, action.characterInstanceId, "CHARACTER"); assertType(definitions, next, action.relicInstanceId, "RELIC"); move(next, action.characterInstanceId, "FIELD", action.playerId, null); { const relic = requireCard(next, action.relicInstanceId); if (relic.zone !== "FIELD" || relic.attachedToInstanceId !== null) throw new Error("La Reliquia debe estar suelta en el campo"); next.cardInstances[relic.instanceId] = { ...relic, attachedToInstanceId: action.characterInstanceId }; } break;
    case "PLAY_RELIC": if (next.phase !== "MEDIODIA") throw new Error("Personajes y Reliquias solo pueden jugarse durante MEDIODIA"); assertType(definitions, next, action.instanceId, "RELIC"); if (action.attachedToInstanceId === null) throw new Error("Una Reliquia debe jugarse equipada a un Personaje"); move(next, action.instanceId, "FIELD", action.playerId, action.attachedToInstanceId); break;
    case "PLAY_VERSE": assertType(definitions, next, action.instanceId, "VERSE"); move(next, action.instanceId, "VERSE_RESOLUTION", action.playerId); break;
    case "RESOLVE_VERSE": requireCard(next, action.instanceId); move(next, action.instanceId, "GRAVEYARD", action.playerId); break;
    case "MOVE_CARD": move(next, action.instanceId, action.toZone, action.controllerId, action.attachedToInstanceId); break;
    case "REORDER_FIELD": action.orderedInstanceIds.forEach((id, index) => { const card = requireCard(next, id); next.cardInstances[id] = { ...card, zoneOrder: index }; }); break;
    case "ATTACH_RELIC": { const relic = requireCard(next, action.relicInstanceId); const character = requireCard(next, action.characterInstanceId); if (relic.zone !== "FIELD" || character.zone !== "FIELD") throw new Error("Ambas cartas deben estar en el campo"); next.cardInstances[relic.instanceId] = { ...relic, attachedToInstanceId: character.instanceId }; break; }
    case "DETACH_RELIC": { const relic = requireCard(next, action.relicInstanceId); next.cardInstances[relic.instanceId] = { ...relic, attachedToInstanceId: null }; break; }
    case "TAP_CARD": { if (next.phase === "ALBA") throw new Error("No se puede tapear durante ALBA"); const card = requireCard(next, action.instanceId); next.cardInstances[card.instanceId] = { ...card, tapped: true }; break; }
    case "UNTAP_CARD": { const card = requireCard(next, action.instanceId); next.cardInstances[card.instanceId] = { ...card, tapped: false }; break; }
    case "UNTAP_ALL_ESSENCES": Object.values(next.cardInstances).forEach((card) => { if (card.controllerId === action.playerId && card.zone === "ESSENCE_ZONE" && card.tapped) next.cardInstances[card.instanceId] = { ...card, tapped: false }; }); break;
    case "FLIP_FACE_UP": { const card = requireCard(next, action.instanceId); next.cardInstances[card.instanceId] = { ...card, faceUp: true }; break; }
    case "FLIP_FACE_DOWN": { const card = requireCard(next, action.instanceId); next.cardInstances[card.instanceId] = { ...card, faceUp: false }; break; }
    case "CHANGE_CARD_COUNTER": { const card = requireCard(next, action.instanceId); next.cardInstances[card.instanceId] = { ...card, counter: card.counter + action.amount }; break; }
    case "REQUEST_VIRTUAL_ESSENCE_CHANGE": {
      if (!Number.isInteger(action.amount) || action.amount === 0) throw new Error("El cambio de Esencias Virtuales no es valido");
      const player = next.players[action.playerId];
      if (!player || (player.virtualEssenceCount ?? 0) + action.amount < 0) throw new Error("Las Esencias Virtuales no pueden ser negativas");
      if (next.pendingVirtualEssenceChanges?.[action.playerId]) throw new Error("Ya existe una solicitud de Esencias Virtuales pendiente");
      next.pendingVirtualEssenceChanges![action.playerId] = { proposalId: action.proposalId, playerId: action.playerId, amount: action.amount };
      break;
    }
    case "CONSUME_VIRTUAL_ESSENCE": {
      if (!Number.isInteger(action.amount) || action.amount < 1) throw new Error("La cantidad de Esencias Virtuales a consumir no es valida");
      const player = next.players[action.playerId];
      if (!player || next.pendingVirtualEssenceChanges?.[action.playerId] || (player.virtualEssenceCount ?? 0) < action.amount) throw new Error("No hay suficientes Esencias Virtuales para consumir");
      next.players[action.playerId] = { ...player, virtualEssenceCount: (player.virtualEssenceCount ?? 0) - action.amount };
      break;
    }
    case "APPROVE_VIRTUAL_ESSENCE_CHANGE": {
      const proposal = next.pendingVirtualEssenceChanges?.[action.targetPlayerId];
      const player = next.players[action.targetPlayerId];
      if (!proposal || proposal.proposalId !== action.proposalId || !player || (player.virtualEssenceCount ?? 0) + proposal.amount < 0) throw new Error("La solicitud de Esencias Virtuales ya no esta disponible");
      next.players[action.targetPlayerId] = { ...player, virtualEssenceCount: (player.virtualEssenceCount ?? 0) + proposal.amount };
      delete next.pendingVirtualEssenceChanges![action.targetPlayerId];
      break;
    }
    case "REJECT_VIRTUAL_ESSENCE_CHANGE": {
      const proposal = next.pendingVirtualEssenceChanges?.[action.targetPlayerId];
      if (!proposal || proposal.proposalId !== action.proposalId) throw new Error("La solicitud de Esencias Virtuales ya no esta disponible");
      delete next.pendingVirtualEssenceChanges![action.targetPlayerId];
      break;
    }
    case "PROPOSE_CHARACTER_STAT_CHANGE": {
      next.pendingStatChanges![action.characterInstanceId] = { proposalId: action.proposalId, characterInstanceId: action.characterInstanceId, proposerId: action.playerId, attackDelta: action.attackDelta, healthDelta: action.healthDelta };
      break;
    }
    case "APPROVE_CHARACTER_STAT_CHANGE": {
      const proposal = next.pendingStatChanges?.[action.characterInstanceId];
      if (!proposal || proposal.proposalId !== action.proposalId) throw new Error("La propuesta de ATQ/PV ya no esta disponible");
      const card = requireCard(next, action.characterInstanceId);
      next.cardInstances[card.instanceId] = { ...card, manualAttackModifier: (card.manualAttackModifier ?? 0) + proposal.attackDelta, manualHealthModifier: (card.manualHealthModifier ?? 0) + proposal.healthDelta };
      delete next.pendingStatChanges![action.characterInstanceId];
      break;
    }
    case "REJECT_CHARACTER_STAT_CHANGE": {
      const proposal = next.pendingStatChanges?.[action.characterInstanceId];
      if (!proposal || proposal.proposalId !== action.proposalId) throw new Error("La propuesta de ATQ/PV ya no esta disponible");
      delete next.pendingStatChanges![action.characterInstanceId];
      break;
    }
    case "CHANGE_SANCTUARY_HP": { const player = next.players[action.playerId]; if (player) next.players[action.playerId] = { ...player, sanctuaryHp: player.sanctuaryHp + action.amount }; break; }
    case "SET_SANCTUARY_HP": { const player = next.players[action.playerId]; if (player) next.players[action.playerId] = { ...player, sanctuaryHp: action.value }; break; }
    case "DEVASTATE_CARD": {
      const card = requireCard(next, action.instanceId);
      if (card.zone !== "FIELD" && card.zone !== "GRAVEYARD") throw new Error("Solo se pueden devastar cartas del Campo o Cementerio");
      next.cardInstances[card.instanceId] = { ...card, zone: "DEVASTATED", zoneOrder: nextOrder(next, "DEVASTATED", card.controllerId), tapped: false, faceUp: true, attachedToInstanceId: null, manualAttackModifier: 0, manualHealthModifier: 0, devastatedFromZone: card.zone, devastatedFromAttachedToInstanceId: card.attachedToInstanceId };
      if (card.zone === "FIELD") {
        for (const relic of Object.values(next.cardInstances)) if (relic.attachedToInstanceId === card.instanceId) next.cardInstances[relic.instanceId] = { ...relic, attachedToInstanceId: null };
      }
      if (next.pendingStatChanges?.[card.instanceId]) delete next.pendingStatChanges[card.instanceId];
      if (next.characterMarkers?.[card.instanceId]) delete next.characterMarkers[card.instanceId];
      break;
    }
    case "REVERT_DEVASTATION": {
      const card = requireCard(next, action.instanceId);
      if (card.zone !== "DEVASTATED") throw new Error("La carta no esta devastada");
      if (action.toZone === "FIELD") {
        const definition = definitions?.[card.cardDefinitionId];
        if (definition && definition.type !== "CHARACTER" && definition.type !== "RELIC") throw new Error("Solo Personajes o Reliquias pueden volver al Campo");
      }
      const rest = { ...card };
      delete rest.devastatedFromZone;
      delete rest.devastatedFromAttachedToInstanceId;
      const restoredAttachment = action.toZone === "FIELD" && card.devastatedFromAttachedToInstanceId && next.cardInstances[card.devastatedFromAttachedToInstanceId]?.zone === "FIELD"
        ? card.devastatedFromAttachedToInstanceId
        : null;
      next.cardInstances[card.instanceId] = { ...rest, zone: action.toZone, zoneOrder: nextOrder(next, action.toZone, card.controllerId), tapped: false, faceUp: true, attachedToInstanceId: restoredAttachment };
      break;
    }
    case "ADD_CHARACTER_MARKER": {
      const character = requireCard(next, action.characterInstanceId);
      assertType(definitions, next, character.instanceId, "CHARACTER");
      if (character.zone !== "FIELD" || !isCharacterMarkerKind(action.marker) || !action.markerId) throw new Error("Marcador de Personaje invalido");
      const markers = next.characterMarkers?.[character.instanceId] ?? [];
      if (markers.some((marker) => marker.markerId === action.markerId)) throw new Error("El marcador ya existe");
      next.characterMarkers![character.instanceId] = [...markers, { markerId: action.markerId, kind: action.marker }];
      break;
    }
    case "REMOVE_CHARACTER_MARKER": {
      const character = requireCard(next, action.characterInstanceId);
      assertType(definitions, next, character.instanceId, "CHARACTER");
      if (character.zone !== "FIELD") throw new Error("El Personaje no esta en Campo");
      const markers = next.characterMarkers?.[character.instanceId] ?? [];
      if (!markers.some((marker) => marker.markerId === action.markerId)) throw new Error("El marcador no existe");
      next.characterMarkers![character.instanceId] = markers.filter((marker) => marker.markerId !== action.markerId);
      break;
    }
    case "SET_PHASE": next.phase = action.phase; break;
    case "END_TURN": {
      const ids = Object.keys(next.players);
      const index = ids.indexOf(next.activePlayerId);
      next.activePlayerId = ids[(index + 1) % ids.length] ?? next.activePlayerId;
      next.turnNumber += 1;
      next.phase = "ALBA";
      next.phaseProgress = { turnNumber: next.turnNumber, playerId: next.activePlayerId, essenceDrawn: false, mainCardDrawn: false };
      break;
    }
  }
  return { ...next, revision: state.revision + 1 };
}
