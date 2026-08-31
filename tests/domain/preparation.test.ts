import { describe, expect, it } from "vitest";
import { mockCardCatalog } from "@/data/mock-card-catalog";
import { cardCatalog } from "@/data/cards/catalog";
import { ESSENCE_DECK_SIZE, MAIN_DECK_SIZE, MAX_COPIES_PER_CARD, defaultEssenceDeck, essenceDefinitions, mainDeckDefinitions, sanctuaryDefinitions, validateEssenceOrder, validateLoadout } from "@/domain/preparation/preparation";

const catalog = Object.fromEntries(mockCardCatalog.map((definition) => [definition.id, definition]));
const mainIds = mainDeckDefinitions(mockCardCatalog, "TEST").map((definition) => definition.id);
const essenceIds = essenceDefinitions(mockCardCatalog, "TEST").map((definition) => definition.id);
const sanctuaryId = sanctuaryDefinitions(mockCardCatalog, "TEST")[0].id;
const validMainDeck = Array.from({ length: MAIN_DECK_SIZE }, (_, index) => mainIds[index % mainIds.length]);
const validLoadout = () => ({ faction: "TEST", mainDeck: [...validMainDeck], sanctuary: sanctuaryId, essenceDeck: Array.from({ length: ESSENCE_DECK_SIZE }, (_, index) => essenceIds[index % essenceIds.length]) });

describe("MISSION_003 deck preparation rules", () => {
  it.each([34, 36])("rejects a main deck with %i cards", (size) => {
    const loadout = validLoadout();
    loadout.mainDeck = Array.from({ length: size }, (_, index) => mainIds[index % mainIds.length]);
    expect(validateLoadout(loadout, catalog)).toMatchObject({ ok: false });
  });

  it("accepts three copies and rejects a fourth", () => {
    const loadout = validLoadout();
    loadout.mainDeck = Array.from({ length: MAIN_DECK_SIZE }, (_, index) => mainIds[index % mainIds.length]);
    expect(loadout.mainDeck.filter((id) => id === mainIds[0])).toHaveLength(MAX_COPIES_PER_CARD);
    expect(validateLoadout(loadout, catalog)).toMatchObject({ ok: true });
    loadout.mainDeck[3] = mainIds[0];
    expect(validateLoadout(loadout, catalog)).toMatchObject({ ok: false });
  });

  it("rejects an ineligible faction card and keeps Sanctuary outside the main deck", () => {
    const loadout = validLoadout();
    loadout.mainDeck[0] = sanctuaryId;
    expect(validateLoadout(loadout, catalog)).toMatchObject({ ok: false });
    expect(mainDeckDefinitions(mockCardCatalog, "MISSING")).toEqual([]);
  });

  it("requires an eligible Sanctuary and sources availability from the catalog", () => {
    const loadout = validLoadout();
    loadout.sanctuary = mainIds[0];
    expect(validateLoadout(loadout, catalog)).toMatchObject({ ok: false });
    expect(mainIds).toContain("mock-char-c");
    expect(mainIds).toContain("mock-verse-d");
  });

  it("provides ten mock Essence cards and validates starter/second special positions", () => {
    expect(defaultEssenceDeck(mockCardCatalog, "TEST")).toHaveLength(ESSENCE_DECK_SIZE);
    const starterOrder = ["mock-essence-b", "mock-essence-a", "mock-essence-b", "mock-essence-a", "mock-essence-b", "mock-essence-a", "mock-essence-b", "mock-essence-a", "mock-essence-b", "mock-essence-b"];
    const secondOrder = ["mock-essence-a", "mock-essence-b", "mock-essence-a", "mock-essence-b", "mock-essence-a", "mock-essence-b", "mock-essence-a", "mock-essence-b", "mock-essence-b", "mock-essence-b"];
    expect(validateEssenceOrder(starterOrder, catalog, true)).toMatchObject({ ok: true });
    expect(validateEssenceOrder(secondOrder, catalog, false)).toMatchObject({ ok: true });
    expect(validateEssenceOrder(starterOrder, catalog, false)).toMatchObject({ ok: false });
  });

  it("builds and accepts a playable Caos loadout from the shared catalog", () => {
    const caosCatalog = Object.fromEntries(cardCatalog.map((definition) => [definition.id, definition]));
    const caosMainIds = mainDeckDefinitions(cardCatalog, "CAOS").map((definition) => definition.id);
    const caosLoadout = {
      faction: "CAOS",
      mainDeck: Array.from({ length: MAIN_DECK_SIZE }, (_, index) => caosMainIds[index % caosMainIds.length]),
      sanctuary: sanctuaryDefinitions(cardCatalog, "CAOS")[0].id,
      essenceDeck: defaultEssenceDeck(cardCatalog, "CAOS"),
    };

    expect(caosMainIds).toHaveLength(14);
    expect(caosLoadout.essenceDeck).toHaveLength(ESSENCE_DECK_SIZE);
    expect(validateLoadout(caosLoadout, caosCatalog)).toMatchObject({ ok: true });
  });

  it("builds and accepts a playable Errantes loadout from the shared catalog", () => {
    const errantesCatalog = Object.fromEntries(cardCatalog.map((definition) => [definition.id, definition]));
    const errantesMainIds = mainDeckDefinitions(cardCatalog, "ERRANTES").map((definition) => definition.id);
    const errantesLoadout = {
      faction: "ERRANTES",
      mainDeck: Array.from({ length: MAIN_DECK_SIZE }, (_, index) => errantesMainIds[index % errantesMainIds.length]),
      sanctuary: sanctuaryDefinitions(cardCatalog, "ERRANTES")[0].id,
      essenceDeck: defaultEssenceDeck(cardCatalog, "ERRANTES"),
    };

    expect(errantesMainIds).toHaveLength(14);
    expect(errantesLoadout.essenceDeck).toHaveLength(ESSENCE_DECK_SIZE);
    expect(validateLoadout(errantesLoadout, errantesCatalog)).toMatchObject({ ok: true });
  });
});
