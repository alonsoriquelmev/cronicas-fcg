import type { GameAction } from "../src/domain/game/game.actions";
import type { CardDefinition } from "../src/domain/cards/card.types";
import { definitions } from "./gameSeed";
import { isCharacterMarkerKind } from "../src/domain/game/character-markers";
import { getPhaseBlockers, isOpeningTurn, phaseBlockerError } from "../src/domain/game/phase-rules";

const allowed = new Set(["DRAW_CARD", "LOOK_AT_MAIN_DECK", "SEARCH_MAIN_DECK", "REORDER_DECK_LOOK", "RESOLVE_DECK_LOOK", "SET_DECK_SEARCH_REVEALED", "RESOLVE_DECK_SEARCH", "CLOSE_DECK_SEARCH", "SHUFFLE_MAIN_DECK", "SEND_MAIN_DECK_TOP_TO_GRAVEYARD", "MOVE_HAND_CARD_TO_GRAVEYARD", "SHUFFLE_CARD_INTO_MAIN_DECK", "DRAW_ESSENCE", "RETURN_ESSENCE_TO_DECK_BOTTOM", "PLAY_CHARACTER", "PLAY_CHARACTER_ATTACH_RELIC", "PLAY_RELIC", "PLAY_VERSE", "RESOLVE_VERSE", "MOVE_CARD", "REORDER_FIELD", "ATTACH_RELIC", "DETACH_RELIC", "TAP_CARD", "UNTAP_CARD", "UNTAP_ALL_ESSENCES", "FLIP_FACE_UP", "FLIP_FACE_DOWN", "CHANGE_CARD_COUNTER", "REQUEST_VIRTUAL_ESSENCE_CHANGE", "CONSUME_VIRTUAL_ESSENCE", "APPROVE_VIRTUAL_ESSENCE_CHANGE", "REJECT_VIRTUAL_ESSENCE_CHANGE", "PROPOSE_CHARACTER_STAT_CHANGE", "APPROVE_CHARACTER_STAT_CHANGE", "REJECT_CHARACTER_STAT_CHANGE", "CHANGE_SANCTUARY_HP", "SET_SANCTUARY_HP", "DEVASTATE_CARD", "REVERT_DEVASTATION", "ADD_CHARACTER_MARKER", "REMOVE_CHARACTER_MARKER", "SET_PHASE", "END_TURN"]);
const ownPlayerAction = new Set(["DRAW_CARD", "LOOK_AT_MAIN_DECK", "SEARCH_MAIN_DECK", "REORDER_DECK_LOOK", "RESOLVE_DECK_LOOK", "SET_DECK_SEARCH_REVEALED", "RESOLVE_DECK_SEARCH", "CLOSE_DECK_SEARCH", "SHUFFLE_MAIN_DECK", "SEND_MAIN_DECK_TOP_TO_GRAVEYARD", "MOVE_HAND_CARD_TO_GRAVEYARD", "SHUFFLE_CARD_INTO_MAIN_DECK", "DRAW_ESSENCE", "RETURN_ESSENCE_TO_DECK_BOTTOM", "UNTAP_ALL_ESSENCES", "REQUEST_VIRTUAL_ESSENCE_CHANGE", "CONSUME_VIRTUAL_ESSENCE", "APPROVE_VIRTUAL_ESSENCE_CHANGE", "REJECT_VIRTUAL_ESSENCE_CHANGE", "PROPOSE_CHARACTER_STAT_CHANGE", "APPROVE_CHARACTER_STAT_CHANGE", "REJECT_CHARACTER_STAT_CHANGE", "CHANGE_SANCTUARY_HP", "SET_SANCTUARY_HP", "DEVASTATE_CARD", "REVERT_DEVASTATION"]);

type AuthorityState = {
  cardInstances: Record<string, { ownerId: string; controllerId: string; zone: string; cardDefinitionId: string; attachedToInstanceId: string | null; tapped: boolean; manualAttackModifier?: number; manualHealthModifier?: number }>;
  players: Record<string, { virtualEssenceCount?: number }>;
  deckLooks?: Record<string, { orderedInstanceIds: string[]; mode?: "LOOK" | "SEARCH"; revealedInstanceIds?: string[] }>;
  pendingStatChanges?: Record<string, { proposalId: string; characterInstanceId: string; proposerId: string; attackDelta: number; healthDelta: number }>;
  pendingVirtualEssenceChanges?: Record<string, { proposalId: string; playerId: string; amount: number }>;
  characterMarkers?: Record<string, { markerId: string; kind: string }[]>;
  activePlayerId: string;
  startingPlayerId: string;
  turnNumber: number;
  phase: string;
  phaseProgress?: { turnNumber: number; playerId: string; essenceDrawn: boolean; mainCardDrawn: boolean };
};

function characterStats(state: AuthorityState, characterInstanceId: string) {
  const catalog = definitions as unknown as Record<string, CardDefinition>;
  const character = state.cardInstances[characterInstanceId];
  const definition = character ? catalog[character.cardDefinitionId] : undefined;
  if (!character || !definition || definition.type !== "CHARACTER") return null;
  let attack = definition.attack + (character.manualAttackModifier ?? 0);
  let health = definition.health + (character.manualHealthModifier ?? 0);
  for (const relic of Object.values(state.cardInstances)) {
    if (relic.zone !== "FIELD" || relic.attachedToInstanceId !== characterInstanceId) continue;
    const relicDefinition = catalog[relic.cardDefinitionId];
    if (relicDefinition?.type !== "RELIC") continue;
    attack += relicDefinition.attackModifier ?? 0;
    health += relicDefinition.healthModifier ?? 0;
  }
  return { attack: Math.max(0, attack), health: Math.max(0, health) };
}

export function assertAuthorizedAction(state: AuthorityState, action: GameAction, actorId: string) {
  const input = action as unknown as Record<string, unknown>;
  if (!allowed.has(String(input.type))) throw new Error("Action type is not supported");
  if (ownPlayerAction.has(String(input.type)) && input.playerId !== actorId) throw new Error("Player action targets another seat");
  const approvalAction = input.type === "APPROVE_CHARACTER_STAT_CHANGE" || input.type === "REJECT_CHARACTER_STAT_CHANGE";
  const instanceIds = ["instanceId", "relicInstanceId", "characterInstanceId", "attachedToInstanceId"].filter((key) => !(approvalAction && key === "characterInstanceId")).map((key) => input[key]).filter((value): value is string => typeof value === "string");
  for (const instanceId of instanceIds) {
    const card = state.cardInstances[instanceId];
    if (!card || (card.ownerId !== actorId && card.controllerId !== actorId)) throw new Error("Card is not controlled by this player");
  }
  const card = state.cardInstances[String(input.instanceId)];
  const deckLookAction = input.type === "LOOK_AT_MAIN_DECK" || input.type === "SEARCH_MAIN_DECK" || input.type === "REORDER_DECK_LOOK" || input.type === "RESOLVE_DECK_LOOK" || input.type === "SET_DECK_SEARCH_REVEALED" || input.type === "RESOLVE_DECK_SEARCH" || input.type === "CLOSE_DECK_SEARCH";
  const deckActionsBlockedByLook = input.type === "DRAW_CARD" || input.type === "SEARCH_MAIN_DECK" || input.type === "SHUFFLE_MAIN_DECK" || input.type === "SEND_MAIN_DECK_TOP_TO_GRAVEYARD" || input.type === "SHUFFLE_CARD_INTO_MAIN_DECK";
  if (deckActionsBlockedByLook && state.deckLooks?.[actorId]) throw new Error("Resolve the active deck look first");
  if (input.type === "DRAW_CARD" && state.phase === "AMANECER" && isOpeningTurn(state, actorId)) throw new Error("El jugador inicial no roba durante su primer Amanecer");
  if (deckLookAction && input.playerId !== actorId) throw new Error("Deck look targets another seat");
  if (input.type === "LOOK_AT_MAIN_DECK") {
    const count = Number(input.count);
    const deckCount = Object.values(state.cardInstances).filter((candidate) => candidate.controllerId === actorId && candidate.zone === "MAIN_DECK").length;
    if (state.deckLooks?.[actorId] || !Number.isInteger(count) || count < 1 || count > deckCount) throw new Error("Invalid deck look count");
  }
  if (input.type === "SEARCH_MAIN_DECK") {
    const deckCount = Object.values(state.cardInstances).filter((candidate) => candidate.controllerId === actorId && candidate.zone === "MAIN_DECK").length;
    if (state.deckLooks?.[actorId] || deckCount < 1) throw new Error("Invalid main deck search");
  }
  if (input.type === "REORDER_DECK_LOOK") {
    const look = state.deckLooks?.[actorId];
    const ordered = input.orderedInstanceIds;
    if (!look || (look.mode ?? "LOOK") !== "LOOK" || !Array.isArray(ordered) || ordered.length !== look.orderedInstanceIds.length || [...ordered].sort().some((id, index) => id !== [...look.orderedInstanceIds].sort()[index])) throw new Error("Deck look order is invalid");
  }
  if (input.type === "RESOLVE_DECK_LOOK") {
    const look = state.deckLooks?.[actorId];
    const ids = input.instanceIds;
    const destinations = new Set(["HAND", "GRAVEYARD", "TOP", "BOTTOM", "SHUFFLE"]);
    if (!look || (look.mode ?? "LOOK") !== "LOOK" || !Array.isArray(ids) || ids.length === 0 || new Set(ids).size !== ids.length || ids.some((id) => !look.orderedInstanceIds.includes(id)) || !destinations.has(String(input.destination))) throw new Error("Deck look resolution is invalid");
  }
  if (input.type === "SET_DECK_SEARCH_REVEALED") {
    const look = state.deckLooks?.[actorId];
    const ids = input.instanceIds;
    if (!look || look.mode !== "SEARCH" || !Array.isArray(ids) || ids.length === 0 || new Set(ids).size !== ids.length || ids.some((id) => !look.orderedInstanceIds.includes(id)) || typeof input.revealed !== "boolean") throw new Error("Deck search reveal is invalid");
  }
  if (input.type === "RESOLVE_DECK_SEARCH") {
    const look = state.deckLooks?.[actorId];
    const ids = input.instanceIds;
    if (!look || look.mode !== "SEARCH" || !Array.isArray(ids) || ids.length === 0 || new Set(ids).size !== ids.length || ids.some((id) => !look.orderedInstanceIds.includes(id)) || !["HAND", "GRAVEYARD", "FIELD"].includes(String(input.destination))) throw new Error("Deck search resolution is invalid");
    if (input.destination === "FIELD" && ids.some((id) => !["CHARACTER", "RELIC"].includes(definitions[state.cardInstances[String(id)]?.cardDefinitionId as keyof typeof definitions]?.type ?? ""))) throw new Error("Only Characters and Relics can move to Field");
  }
  if (input.type === "CLOSE_DECK_SEARCH" && (!state.deckLooks?.[actorId] || state.deckLooks[actorId].mode !== "SEARCH")) {
    throw new Error("Deck search is not active");
  }
  if (input.controllerId !== undefined && input.controllerId !== actorId) throw new Error("Cannot change card controller");
  if (input.type === "MOVE_CARD" && (card?.zone === "ESSENCE_ZONE" || card?.zone === "SANCTUARY" || input.toZone === "ESSENCE_ZONE" || input.toZone === "ESSENCE_DECK")) throw new Error("This card movement is restricted");
  if (input.type === "MOVE_CARD" && card?.zone === "HAND" && input.toZone === "FIELD") throw new Error("Cards in hand must use their typed play action");
  if (input.type === "MOVE_CARD" && card && !((card.zone === "FIELD" && (input.toZone === "HAND" || input.toZone === "GRAVEYARD")) || (card.zone === "GRAVEYARD" && (input.toZone === "HAND" || input.toZone === "FIELD" || input.toZone === "VERSE_RESOLUTION")))) throw new Error("Unsupported card movement");
  if (input.type === "MOVE_CARD" && card?.zone === "GRAVEYARD" && input.toZone === "VERSE_RESOLUTION" && definitions[card.cardDefinitionId as keyof typeof definitions]?.type !== "VERSE") throw new Error("Only Verses can return to resolution");
  if (input.type === "MOVE_CARD" && card?.zone === "GRAVEYARD" && input.toZone === "FIELD" && !["CHARACTER", "RELIC"].includes(definitions[card.cardDefinitionId as keyof typeof definitions]?.type ?? "")) throw new Error("Only Characters and Relics can move to Field");
  if (input.type === "MOVE_HAND_CARD_TO_GRAVEYARD" && card?.zone !== "HAND") throw new Error("Only a card in Hand can move to Graveyard");
  if (input.type === "SHUFFLE_CARD_INTO_MAIN_DECK" && card && card.zone !== "HAND" && card.zone !== "GRAVEYARD") throw new Error("Only a card in Hand or Graveyard can be shuffled into Main Deck");
  if (input.type === "RETURN_ESSENCE_TO_DECK_BOTTOM" && (card?.zone !== "ESSENCE_ZONE" || definitions[card.cardDefinitionId as keyof typeof definitions]?.type !== "ESSENCE")) throw new Error("Expected an Essence in Essence Zone");
  if ((input.type === "TAP_CARD" || input.type === "UNTAP_CARD") && ["HAND", "MAIN_DECK", "ESSENCE_DECK", "GRAVEYARD", "SANCTUARY"].includes(card?.zone ?? "")) throw new Error("Cards in this zone cannot be tapped");
  if (input.type === "TAP_CARD" && state.phase === "ALBA") throw new Error("No se puede tapear durante ALBA");
  if ((input.type === "TAP_CARD" || input.type === "UNTAP_CARD") && card?.zone === "ESSENCE_ZONE" && definitions[card.cardDefinitionId as keyof typeof definitions]?.type !== "ESSENCE") throw new Error("Only Essence cards can be tapped in Essence Zone");
  if ((input.type === "PLAY_CHARACTER" || input.type === "PLAY_RELIC" || input.type === "PLAY_VERSE") && card?.zone !== "HAND") throw new Error("Card must be in hand");
  if ((input.type === "PLAY_CHARACTER" || input.type === "PLAY_RELIC" || input.type === "PLAY_VERSE") && input.playerId !== actorId) throw new Error("Play action targets another seat");
  if ((input.type === "PLAY_CHARACTER" || input.type === "PLAY_CHARACTER_ATTACH_RELIC" || input.type === "PLAY_RELIC") && state.phase !== "MEDIODIA") throw new Error("Personajes y Reliquias solo pueden jugarse durante MEDIODIA");
  if (input.type === "PLAY_CHARACTER" && card && definitions[card.cardDefinitionId as keyof typeof definitions]?.type !== "CHARACTER") throw new Error("Expected a Character");
  if (input.type === "PLAY_RELIC" && card && definitions[card.cardDefinitionId as keyof typeof definitions]?.type !== "RELIC") throw new Error("Expected a Relic");
  if (input.type === "PLAY_VERSE" && card && definitions[card.cardDefinitionId as keyof typeof definitions]?.type !== "VERSE") throw new Error("Expected a Verse");
  if (input.type === "PLAY_CHARACTER_ATTACH_RELIC") {
    if (input.playerId !== actorId) throw new Error("Play action targets another seat");
    const character = state.cardInstances[String(input.characterInstanceId)];
    const relic = state.cardInstances[String(input.relicInstanceId)];
    if (!character || character.zone !== "HAND" || character.controllerId !== actorId || definitions[character.cardDefinitionId as keyof typeof definitions]?.type !== "CHARACTER") throw new Error("Expected an own Character in hand");
    if (!relic || relic.zone !== "FIELD" || relic.attachedToInstanceId !== null || relic.controllerId !== actorId || definitions[relic.cardDefinitionId as keyof typeof definitions]?.type !== "RELIC") throw new Error("Expected an own loose Relic in field");
  }
  if (input.type === "RESOLVE_VERSE" && (card?.zone !== "VERSE_RESOLUTION" || definitions[card.cardDefinitionId as keyof typeof definitions]?.type !== "VERSE")) throw new Error("Expected a Verse in resolution");
  if (input.type === "PLAY_RELIC" && input.attachedToInstanceId === null) throw new Error("A Relic must be played attached to a Character");
  if (input.type === "PLAY_RELIC" && input.attachedToInstanceId !== null) {
    const character = state.cardInstances[String(input.attachedToInstanceId)];
    if (!character || character.zone !== "FIELD" || character.controllerId !== actorId || definitions[character.cardDefinitionId as keyof typeof definitions]?.type !== "CHARACTER") throw new Error("Relic attachment target is invalid");
  }
  if (input.type === "REORDER_FIELD" && (!Array.isArray(input.orderedInstanceIds) || input.orderedInstanceIds.some((id) => typeof id !== "string" || state.cardInstances[id]?.controllerId !== actorId))) throw new Error("Field order contains an unauthorized card");
  if (card?.zone === "ESSENCE_ZONE" && input.type !== "TAP_CARD" && input.type !== "UNTAP_CARD" && input.type !== "FLIP_FACE_UP" && input.type !== "FLIP_FACE_DOWN" && input.type !== "RETURN_ESSENCE_TO_DECK_BOTTOM") throw new Error("Essence cards only support state changes");
  if (input.type === "ATTACH_RELIC") {
    const relic = state.cardInstances[String(input.relicInstanceId)];
    const character = state.cardInstances[String(input.characterInstanceId)];
    if (relic?.zone !== "FIELD" || relic.attachedToInstanceId !== null || definitions[relic.cardDefinitionId as keyof typeof definitions]?.type !== "RELIC" || character?.zone !== "FIELD" || character.controllerId !== actorId || definitions[character.cardDefinitionId as keyof typeof definitions]?.type !== "CHARACTER") throw new Error("Cards must be an unattached relic and an own character on field");
  }
  if (input.type === "DETACH_RELIC") {
    const relic = state.cardInstances[String(input.relicInstanceId)];
    if (relic?.zone !== "FIELD" || relic.attachedToInstanceId === null || definitions[relic.cardDefinitionId as keyof typeof definitions]?.type !== "RELIC") throw new Error("Relic is not attached");
  }
  if (input.type === "PROPOSE_CHARACTER_STAT_CHANGE") {
    const character = state.cardInstances[String(input.characterInstanceId)];
    if (!character || character.zone !== "FIELD" || character.controllerId !== actorId || definitions[character.cardDefinitionId as keyof typeof definitions]?.type !== "CHARACTER") throw new Error("Expected an own Character in Field");
    if (state.pendingStatChanges?.[String(input.characterInstanceId)]) throw new Error("This Character already has a pending stat proposal");
    if (typeof input.proposalId !== "string" || input.proposalId.length < 1 || !Number.isInteger(input.attackDelta) || !Number.isInteger(input.healthDelta) || Math.abs(Number(input.attackDelta)) > 99 || Math.abs(Number(input.healthDelta)) > 99 || input.attackDelta === 0 && input.healthDelta === 0) throw new Error("Invalid ATQ/PV proposal");
    const stats = characterStats(state, String(input.characterInstanceId));
    if (!stats || stats.attack + Number(input.attackDelta) < 0 || stats.health + Number(input.healthDelta) < 0) throw new Error("Character stats cannot be lower than zero");
  }
  if (input.type === "REQUEST_VIRTUAL_ESSENCE_CHANGE") {
    const player = state.players[actorId];
    if (!player || state.pendingVirtualEssenceChanges?.[actorId] || typeof input.proposalId !== "string" || input.proposalId.length < 1 || !Number.isInteger(input.amount) || input.amount === 0 || (player.virtualEssenceCount ?? 0) + Number(input.amount) < 0) throw new Error("Invalid virtual Essence proposal");
  }
  if (input.type === "CONSUME_VIRTUAL_ESSENCE") {
    const player = state.players[actorId];
    const amount = Number(input.amount);
    if (!player || state.pendingVirtualEssenceChanges?.[actorId] || !Number.isInteger(amount) || amount < 1 || (player.virtualEssenceCount ?? 0) < amount) throw new Error("Invalid virtual Essence consumption");
  }
  const virtualEssenceApproval = input.type === "APPROVE_VIRTUAL_ESSENCE_CHANGE" || input.type === "REJECT_VIRTUAL_ESSENCE_CHANGE";
  if (virtualEssenceApproval) {
    const targetPlayerId = String(input.targetPlayerId);
    const proposal = state.pendingVirtualEssenceChanges?.[targetPlayerId];
    const target = state.players[targetPlayerId];
    if (!proposal || proposal.proposalId !== input.proposalId || !target || targetPlayerId === actorId || !state.players[actorId]) throw new Error("Virtual Essence proposal is not available");
    if (input.type === "APPROVE_VIRTUAL_ESSENCE_CHANGE" && (target.virtualEssenceCount ?? 0) + proposal.amount < 0) throw new Error("Virtual Essence cannot become negative");
  }
  if (input.type === "DEVASTATE_CARD" && (!card || !["FIELD", "GRAVEYARD"].includes(card.zone))) throw new Error("Only a controlled card in Field or Graveyard can be devastated");
  if (input.type === "REVERT_DEVASTATION") {
    if (!card || card.zone !== "DEVASTATED" || (input.toZone !== "FIELD" && input.toZone !== "GRAVEYARD" && input.toZone !== "HAND")) throw new Error("Invalid devastated card restoration");
    const definition = definitions[card.cardDefinitionId as keyof typeof definitions];
    if (input.toZone === "FIELD" && definition && definition.type !== "CHARACTER" && definition.type !== "RELIC") throw new Error("Only Characters and Relics can return to Field");
  }
  if (input.type === "ADD_CHARACTER_MARKER") {
    const character = state.cardInstances[String(input.characterInstanceId)];
    const markerId = String(input.markerId ?? "");
    if (!character || character.zone !== "FIELD" || character.controllerId !== actorId || definitions[character.cardDefinitionId as keyof typeof definitions]?.type !== "CHARACTER" || !isCharacterMarkerKind(input.marker) || markerId.length < 1 || markerId.length > 128 || state.characterMarkers?.[String(input.characterInstanceId)]?.some((marker) => marker.markerId === markerId)) throw new Error("Invalid Character marker");
  }
  if (input.type === "REMOVE_CHARACTER_MARKER") {
    const character = state.cardInstances[String(input.characterInstanceId)];
    const markerId = String(input.markerId ?? "");
    if (!character || character.zone !== "FIELD" || character.controllerId !== actorId || definitions[character.cardDefinitionId as keyof typeof definitions]?.type !== "CHARACTER" || !state.characterMarkers?.[String(input.characterInstanceId)]?.some((marker) => marker.markerId === markerId)) throw new Error("Character marker is not available");
  }
  if (approvalAction) {
    const characterInstanceId = String(input.characterInstanceId);
    const proposal = state.pendingStatChanges?.[characterInstanceId];
    const character = state.cardInstances[characterInstanceId];
    if (!proposal || proposal.proposalId !== input.proposalId) throw new Error("Stat proposal is not available");
    if (!character || character.zone !== "FIELD" || definitions[character.cardDefinitionId as keyof typeof definitions]?.type !== "CHARACTER") throw new Error("Stat proposal target is invalid");
    if (proposal.proposerId === actorId || !state.players[actorId]) throw new Error("Only the opponent can answer this proposal");
    const stats = characterStats(state, characterInstanceId);
    if (input.type === "APPROVE_CHARACTER_STAT_CHANGE" && (!stats || stats.attack + proposal.attackDelta < 0 || stats.health + proposal.healthDelta < 0)) throw new Error("Character stats cannot be lower than zero");
  }
  if (input.type === "SET_PHASE") {
    if (state.activePlayerId !== actorId) throw new Error("Only the active player can advance the phase");
    const phases = ["ALBA", "AMANECER", "MEDIODIA", "ANOCHECER"];
    const currentIndex = phases.indexOf(String(state.phase));
    if (currentIndex < 0 || input.phase !== phases[currentIndex + 1]) throw new Error("Invalid phase transition");
    const blockers = getPhaseBlockers(state as Parameters<typeof getPhaseBlockers>[0], actorId, input.phase as Parameters<typeof getPhaseBlockers>[2]);
    if (blockers.length > 0) throw new Error(phaseBlockerError(blockers));
  }
  if (input.type === "END_TURN") {
    if (state.activePlayerId !== actorId) throw new Error("Only the active player can end the turn");
    if (state.phase !== "ANOCHECER") throw new Error("The turn can only end during ANOCHECER");
  }
  return definitions;
}
