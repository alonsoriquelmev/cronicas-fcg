import { describe, expect, it } from "vitest";
import { buildMockGameState, MOCK_IDS, mockCardDefinitionsById } from "@/data/mock-card-catalog";
import { DROP_TARGET_IDS, dropActionForTarget, parseDropTarget } from "@/domain/game/drop-targets";

describe("semantic field drag and drop matrix", () => {
  it("plays Characters into generic Field slots but rejects loose Relics from Hand", () => {
    const state = buildMockGameState();
    const character = state.cardInstances["local-hand-char"];
    const relic = state.cardInstances["local-hand-relic"];
    const empty = { type: "FIELD_SLOT", slotId: "empty" } as const;
    expect(dropActionForTarget(character, empty, MOCK_IDS.local, mockCardDefinitionsById, state.cardInstances)).toEqual({ type: "PLAY_CHARACTER", instanceId: character.instanceId, playerId: MOCK_IDS.local });
    expect(dropActionForTarget(relic, empty, MOCK_IDS.local, mockCardDefinitionsById, state.cardInstances)).toBeNull();
    expect(dropActionForTarget(character, "FIELD", MOCK_IDS.local, mockCardDefinitionsById, state.cardInstances)).toEqual({ type: "PLAY_CHARACTER", instanceId: character.instanceId, playerId: MOCK_IDS.local });
    expect(dropActionForTarget(relic, "FIELD", MOCK_IDS.local, mockCardDefinitionsById, state.cardInstances)).toBeNull();
  });

  it("plays a Character onto a loose Relic slot as one composite action", () => {
    const state = buildMockGameState();
    const relic = state.cardInstances["local-hand-relic"];
    relic.zone = "FIELD";
    relic.attachedToInstanceId = null;
    const character = state.cardInstances["local-hand-char"];
    expect(dropActionForTarget(character, { type: "FIELD_SLOT", slotId: relic.instanceId }, MOCK_IDS.local, mockCardDefinitionsById, state.cardInstances)).toEqual({ type: "PLAY_CHARACTER_ATTACH_RELIC", characterInstanceId: character.instanceId, relicInstanceId: relic.instanceId, playerId: MOCK_IDS.local });
  });

  it("attaches loose Relics and detaches attached Relics", () => {
    const state = buildMockGameState();
    const character = state.cardInstances["opponent-field-char"];
    character.controllerId = MOCK_IDS.local;
    const relic = state.cardInstances["local-hand-relic"];
    relic.zone = "FIELD";
    relic.attachedToInstanceId = null;
    expect(dropActionForTarget(relic, { type: "CHARACTER_SLOT", characterInstanceId: character.instanceId }, MOCK_IDS.local, mockCardDefinitionsById, state.cardInstances)).toEqual({ type: "ATTACH_RELIC", relicInstanceId: relic.instanceId, characterInstanceId: character.instanceId });
    relic.attachedToInstanceId = character.instanceId;
    expect(dropActionForTarget(relic, "FIELD", MOCK_IDS.local, mockCardDefinitionsById, state.cardInstances)).toEqual({ type: "DETACH_RELIC", relicInstanceId: relic.instanceId });
  });

  it("accepts Verse only in Verse Resolution", () => {
    const state = buildMockGameState();
    const verse = state.cardInstances["local-hand-verse"];
    expect(dropActionForTarget(verse, "VERSE_RESOLUTION", MOCK_IDS.local, mockCardDefinitionsById, state.cardInstances)).toEqual({ type: "PLAY_VERSE", instanceId: verse.instanceId, playerId: MOCK_IDS.local });
    expect(dropActionForTarget(state.cardInstances["local-hand-char"], "VERSE_RESOLUTION", MOCK_IDS.local, mockCardDefinitionsById, state.cardInstances)).toBeNull();
    expect(dropActionForTarget(state.cardInstances["local-hand-relic"], "VERSE_RESOLUTION", MOCK_IDS.local, mockCardDefinitionsById, state.cardInstances)).toBeNull();
  });

  it("maps Field cards to Graveyard and rejects rival ownership", () => {
    const state = buildMockGameState();
    expect(dropActionForTarget(state.cardInstances["opponent-field-char"], "GRAVEYARD", MOCK_IDS.local, mockCardDefinitionsById, state.cardInstances)).toBeNull();
    const looseRelic = state.cardInstances["local-hand-relic"];
    looseRelic.zone = "FIELD";
    expect(dropActionForTarget(looseRelic, "GRAVEYARD", MOCK_IDS.local, mockCardDefinitionsById, state.cardInstances)).toEqual({ type: "MOVE_CARD", instanceId: looseRelic.instanceId, toZone: "GRAVEYARD", controllerId: MOCK_IDS.local });
  });

  it("parses generic Field slots and never exposes the old Unattached target", () => {
    expect(parseDropTarget(DROP_TARGET_IDS.fieldSlot("relic-1"))).toEqual({ type: "FIELD_SLOT", slotId: "relic-1" });
    expect(parseDropTarget(DROP_TARGET_IDS.characterSlot("character-1"))).toEqual({ type: "CHARACTER_SLOT", characterInstanceId: "character-1" });
    expect(parseDropTarget("UNATTACHED_RELICS")).toBeNull();
  });
});
