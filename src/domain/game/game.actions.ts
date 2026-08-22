import type { CardZone, GamePhase, PlayerId } from "./game.types";

export type GameAction =
  | { type: "DRAW_CARD"; playerId: PlayerId }
  | { type: "SHUFFLE_MAIN_DECK"; playerId: PlayerId }
  | { type: "DRAW_ESSENCE"; playerId: PlayerId }
  | { type: "PLAY_CHARACTER"; instanceId: string; playerId: PlayerId }
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
  | { type: "CHANGE_SANCTUARY_HP"; playerId: PlayerId; amount: number }
  | { type: "SET_SANCTUARY_HP"; playerId: PlayerId; value: number }
  | { type: "SET_PHASE"; phase: GamePhase }
  | { type: "END_TURN" };
