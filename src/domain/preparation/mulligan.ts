import type { CardInstance, GameState } from "../game/game.types";
import { INITIAL_HAND_SIZE } from "./preparation";

const ordered = (state: GameState, zone: CardInstance["zone"], playerId: string) => Object.values(state.cardInstances)
  .filter((card) => card.zone === zone && card.controllerId === playerId)
  .sort((left, right) => left.zoneOrder - right.zoneOrder || left.instanceId.localeCompare(right.instanceId));

export function applyMulligan(state: GameState, playerId: string, selectedInstanceIds: string[]) {
  const next: GameState = { ...state, cardInstances: { ...state.cardInstances } };
  const hand = ordered(state, "HAND", playerId);
  const deck = ordered(state, "MAIN_DECK", playerId);
  const selected = new Set(selectedInstanceIds);
  if (selected.size !== selectedInstanceIds.length || selectedInstanceIds.some((id) => !hand.some((card) => card.instanceId === id))) throw new Error("Mulligan selection contains an invalid card");
  if (selectedInstanceIds.length > deck.length) throw new Error("Not enough cards to replace the selected hand");
  const returned = hand.filter((card) => selected.has(card.instanceId));
  const kept = hand.filter((card) => !selected.has(card.instanceId));
  const replacements = deck.slice(0, returned.length);
  const remainingDeck = deck.slice(returned.length).concat(returned);
  const finalHand = kept.concat(replacements);
  if (finalHand.length !== INITIAL_HAND_SIZE) throw new Error("Initial hand must contain five cards");
  finalHand.forEach((card, index) => { next.cardInstances[card.instanceId] = { ...card, zone: "HAND", zoneOrder: index, faceUp: true }; });
  remainingDeck.forEach((card, index) => { next.cardInstances[card.instanceId] = { ...card, zone: "MAIN_DECK", zoneOrder: index, faceUp: false }; });
  return { ...next, revision: state.revision + 1 };
}
