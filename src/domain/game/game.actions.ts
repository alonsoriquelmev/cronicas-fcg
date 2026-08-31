import type { CardZone, GamePhase, PlayerId } from "./game.types";
import type { CharacterMarkerKind } from "./character-markers";

export type GameAction =
  | { type: "DRAW_CARD"; playerId: PlayerId }
  | { type: "LOOK_AT_MAIN_DECK"; playerId: PlayerId; count: number }
  | { type: "REORDER_DECK_LOOK"; playerId: PlayerId; orderedInstanceIds: string[] }
  | { type: "RESOLVE_DECK_LOOK"; playerId: PlayerId; instanceIds: string[]; destination: "HAND" | "GRAVEYARD" | "TOP" | "BOTTOM" | "SHUFFLE"; orderedInstanceIds?: string[] }
  | { type: "SHUFFLE_MAIN_DECK"; playerId: PlayerId; orderedInstanceIds?: string[] }
  | { type: "SEND_MAIN_DECK_TOP_TO_GRAVEYARD"; playerId: PlayerId }
  | { type: "MOVE_HAND_CARD_TO_GRAVEYARD"; instanceId: string; playerId: PlayerId }
  | { type: "SHUFFLE_CARD_INTO_MAIN_DECK"; instanceId: string; playerId: PlayerId; orderedInstanceIds?: string[] }
  | { type: "DRAW_ESSENCE"; playerId: PlayerId }
  | { type: "RETURN_ESSENCE_TO_DECK_BOTTOM"; instanceId: string; playerId: PlayerId }
  | { type: "PLAY_CHARACTER"; instanceId: string; playerId: PlayerId }
  | { type: "PLAY_CHARACTER_ATTACH_RELIC"; characterInstanceId: string; relicInstanceId: string; playerId: PlayerId }
  | { type: "PLAY_RELIC"; instanceId: string; playerId: PlayerId; attachedToInstanceId: string | null }
  | { type: "PLAY_VERSE"; instanceId: string; playerId: PlayerId }
  | { type: "RESOLVE_VERSE"; instanceId: string; playerId: PlayerId }
  | { type: "MOVE_CARD"; instanceId: string; toZone: CardZone; controllerId?: PlayerId; attachedToInstanceId?: string | null }
  | { type: "REORDER_FIELD"; playerId: PlayerId; orderedInstanceIds: string[] }
  | { type: "ATTACH_RELIC"; relicInstanceId: string; characterInstanceId: string }
  | { type: "DETACH_RELIC"; relicInstanceId: string }
  | { type: "TAP_CARD"; instanceId: string }
  | { type: "UNTAP_CARD"; instanceId: string }
  | { type: "FLIP_FACE_UP"; instanceId: string }
  | { type: "FLIP_FACE_DOWN"; instanceId: string }
  | { type: "CHANGE_CARD_COUNTER"; instanceId: string; amount: number }
  | { type: "REQUEST_VIRTUAL_ESSENCE_CHANGE"; proposalId: string; playerId: PlayerId; amount: number }
  | { type: "APPROVE_VIRTUAL_ESSENCE_CHANGE"; proposalId: string; playerId: PlayerId; targetPlayerId: PlayerId }
  | { type: "REJECT_VIRTUAL_ESSENCE_CHANGE"; proposalId: string; playerId: PlayerId; targetPlayerId: PlayerId }
  | { type: "PROPOSE_CHARACTER_STAT_CHANGE"; proposalId: string; characterInstanceId: string; playerId: PlayerId; attackDelta: number; healthDelta: number }
  | { type: "APPROVE_CHARACTER_STAT_CHANGE"; proposalId: string; characterInstanceId: string; playerId: PlayerId }
  | { type: "REJECT_CHARACTER_STAT_CHANGE"; proposalId: string; characterInstanceId: string; playerId: PlayerId }
  | { type: "CHANGE_SANCTUARY_HP"; playerId: PlayerId; amount: number }
  | { type: "SET_SANCTUARY_HP"; playerId: PlayerId; value: number }
  | { type: "DEVASTATE_CARD"; instanceId: string; playerId: PlayerId }
  | { type: "REVERT_DEVASTATION"; instanceId: string; playerId: PlayerId; toZone: "HAND" | "FIELD" | "GRAVEYARD" }
  | { type: "ADD_CHARACTER_MARKER"; characterInstanceId: string; markerId: string; marker: CharacterMarkerKind }
  | { type: "REMOVE_CHARACTER_MARKER"; characterInstanceId: string; markerId: string }
  | { type: "SET_PHASE"; phase: GamePhase }
  | { type: "END_TURN" };
