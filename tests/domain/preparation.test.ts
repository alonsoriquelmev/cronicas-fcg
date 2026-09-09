import { describe, expect, it } from "vitest";
import { mockCardCatalog } from "@/data/mock-card-catalog";
import { cardCatalog } from "@/data/cards/catalog";
import {
  ESSENCE_DECK_SIZE,
  MAIN_DECK_SIZE,
  MAX_COPIES_PER_CARD,
  defaultEssenceDeck,
  essenceDefinitions,
  mainDeckDefinitions,
  sanctuaryDefinitions,
  validateEssenceOrder,
  validateLoadout,
  type CatalogEntry,
} from "@/domain/preparation/preparation";

const catalog = Object.fromEntries(
  mockCardCatalog.map((definition) => [definition.id, definition]),
);
const mainIds = mainDeckDefinitions(mockCardCatalog, "TEST").map(
  (definition) => definition.id,
);
const essenceIds = essenceDefinitions(mockCardCatalog, "TEST").map(
  (definition) => definition.id,
);
const sanctuaryId = sanctuaryDefinitions(mockCardCatalog, "TEST")[0].id;
const validMainDeck = Array.from(
  { length: MAIN_DECK_SIZE },
  (_, index) => mainIds[index % mainIds.length],
);
const validLoadout = () => ({
  faction: "TEST",
  mainDeck: [...validMainDeck],
  arsenal: [],
  sanctuary: sanctuaryId,
  essenceDeck: defaultEssenceDeck(mockCardCatalog, "TEST"),
});

describe("MISSION_003 deck preparation rules", () => {
  it.each([34, 36])("rejects a main deck with %i cards", (size) => {
    const loadout = validLoadout();
    loadout.mainDeck = Array.from(
      { length: size },
      (_, index) => mainIds[index % mainIds.length],
    );
    expect(validateLoadout(loadout, catalog)).toMatchObject({ ok: false });
  });

  it("accepts three copies and rejects a fourth", () => {
    const loadout = validLoadout();
    loadout.mainDeck = Array.from(
      { length: MAIN_DECK_SIZE },
      (_, index) => mainIds[index % mainIds.length],
    );
    expect(loadout.mainDeck.filter((id) => id === mainIds[0])).toHaveLength(
      MAX_COPIES_PER_CARD,
    );
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
    expect(defaultEssenceDeck(mockCardCatalog, "TEST")).toHaveLength(
      ESSENCE_DECK_SIZE,
    );
    const starterOrder = [
      "mock-essence-b",
      "mock-essence-a",
      "mock-essence-b",
      "mock-essence-a",
      "mock-essence-b",
      "mock-essence-a",
      "mock-essence-b",
      "mock-essence-a",
      "mock-essence-b",
      "mock-essence-b",
    ];
    const secondOrder = [
      "mock-essence-a",
      "mock-essence-b",
      "mock-essence-a",
      "mock-essence-b",
      "mock-essence-a",
      "mock-essence-b",
      "mock-essence-a",
      "mock-essence-b",
      "mock-essence-b",
      "mock-essence-b",
    ];
    expect(validateEssenceOrder(starterOrder, catalog, true)).toMatchObject({
      ok: true,
    });
    expect(validateEssenceOrder(secondOrder, catalog, false)).toMatchObject({
      ok: true,
    });
    expect(validateEssenceOrder(starterOrder, catalog, false)).toMatchObject({
      ok: false,
    });
  });

  it("builds and accepts a playable Caos loadout from the shared catalog", () => {
    const caosCatalog = Object.fromEntries(
      cardCatalog.map((definition) => [definition.id, definition]),
    );
    const caosMainIds = mainDeckDefinitions(cardCatalog, "CAOS").map(
      (definition) => definition.id,
    );
    const caosLoadout = {
      faction: "CAOS",
      mainDeck: Array.from(
        { length: MAIN_DECK_SIZE },
        (_, index) => caosMainIds[index % caosMainIds.length],
      ),
      sanctuary: sanctuaryDefinitions(cardCatalog, "CAOS")[0].id,
      essenceDeck: defaultEssenceDeck(cardCatalog, "CAOS"),
    };

    expect(caosMainIds).toHaveLength(14);
    expect(caosLoadout.essenceDeck).toHaveLength(ESSENCE_DECK_SIZE);
    expect(validateLoadout(caosLoadout, caosCatalog)).toMatchObject({
      ok: true,
    });
  });

  it("builds and accepts a playable Errantes loadout from the shared catalog", () => {
    const errantesCatalog = Object.fromEntries(
      cardCatalog.map((definition) => [definition.id, definition]),
    );
    const errantesMainIds = mainDeckDefinitions(cardCatalog, "ERRANTES").map(
      (definition) => definition.id,
    );
    const errantesLoadout = {
      faction: "ERRANTES",
      mainDeck: Array.from(
        { length: MAIN_DECK_SIZE },
        (_, index) => errantesMainIds[index % errantesMainIds.length],
      ),
      sanctuary: sanctuaryDefinitions(cardCatalog, "ERRANTES")[0].id,
      essenceDeck: defaultEssenceDeck(cardCatalog, "ERRANTES"),
    };

    expect(errantesMainIds).toHaveLength(14);
    expect(errantesLoadout.essenceDeck).toHaveLength(ESSENCE_DECK_SIZE);
    expect(validateLoadout(errantesLoadout, errantesCatalog)).toMatchObject({
      ok: true,
    });
  });

  it("allows Valor as an ally in Alianzas but not in Guerra de Facciones", () => {
    const allyCatalog: CatalogEntry[] = [
      {
        id: "caos-character",
        name: "Caos",
        type: "CHARACTER",
        factionId: "CAOS",
        subtype: "CHARACTER",
      },
      {
        id: "valor-character",
        name: "Valor",
        type: "CHARACTER",
        factionId: "VALOR",
        subtype: "CHARACTER",
      },
      {
        id: "orden-character",
        name: "Orden",
        type: "CHARACTER",
        factionId: "ORDEN",
        subtype: "CHARACTER",
      },
    ];

    expect(
      mainDeckDefinitions(allyCatalog, "CAOS", "ALLIANCES").map(
        (card) => card.id,
      ),
    ).toEqual(["caos-character", "valor-character"]);
    expect(
      mainDeckDefinitions(allyCatalog, "CAOS").map((card) => card.id),
    ).toEqual(["caos-character"]);
  });

  it("counts allied cards across the main deck and Arsenal in Alianzas", () => {
    const allyCatalog: CatalogEntry[] = [
      ...Array.from({ length: 8 }, (_, index) => ({
        id: `caos-${index}`,
        name: `Caos ${index}`,
        type: "CHARACTER" as const,
        factionId: "CAOS",
        subtype: "CHARACTER",
      })),
      ...Array.from({ length: 5 }, (_, index) => ({
        id: `valor-${index}`,
        name: `Valor ${index}`,
        type: "CHARACTER" as const,
        factionId: "VALOR",
        subtype: "CHARACTER",
      })),
      {
        id: "caos-essence",
        name: "Esencia Caos",
        type: "ESSENCE",
        factionId: "CAOS",
        subtype: "BASIC",
        essenceKind: "BASIC",
      },
      {
        id: "caos-sanctuary",
        name: "Santuario Caos",
        type: "SANCTUARY",
        factionId: "CAOS",
        subtype: "SANCTUARY",
      },
    ];
    const catalog = Object.fromEntries(
      allyCatalog.map((card) => [card.id, card]),
    );
    const foreignCards = [
      "valor-0",
      "valor-0",
      "valor-0",
      "valor-1",
      "valor-1",
      "valor-1",
      "valor-2",
      "valor-2",
      "valor-2",
      "valor-3",
      "valor-3",
      "valor-3",
    ];
    const ownCards = Array.from(
      { length: 23 },
      (_, index) => `caos-${index % 8}`,
    );
    const loadout = {
      faction: "CAOS",
      mainDeck: [...foreignCards, ...ownCards],
      arsenal: [],
      sanctuary: "caos-sanctuary",
      essenceDeck: Array.from(
        { length: ESSENCE_DECK_SIZE },
        () => "caos-essence",
      ),
    };

    expect(validateLoadout(loadout, catalog, "ALLIANCES")).toMatchObject({
      ok: true,
    });
    loadout.mainDeck[12] = "valor-4";
    expect(validateLoadout(loadout, catalog, "ALLIANCES")).toMatchObject({
      ok: false,
      error: "El limite de cartas de facciones aliadas es 12",
    });
  });

  it("caps special Essences at four in the default deck and validation", () => {
    const specialCatalog: CatalogEntry[] = [
      ...Array.from({ length: 5 }, (_, index) => ({
        id: `special-${index}`,
        name: `Especial ${index}`,
        type: "ESSENCE" as const,
        factionId: "CAOS",
        subtype: "SPECIAL",
        essenceKind: "SPECIAL" as const,
      })),
      {
        id: "basic",
        name: "Basica",
        type: "ESSENCE",
        factionId: "CAOS",
        subtype: "BASIC",
        essenceKind: "BASIC",
      },
      ...Array.from({ length: 12 }, (_, index) => ({
        id: `character-${index}`,
        name: `Personaje ${index}`,
        type: "CHARACTER" as const,
        factionId: "CAOS",
        subtype: "CHARACTER",
      })),
      {
        id: "sanctuary",
        name: "Santuario",
        type: "SANCTUARY",
        factionId: "CAOS",
        subtype: "SANCTUARY",
      },
    ];
    const catalog = Object.fromEntries(
      specialCatalog.map((card) => [card.id, card]),
    );
    expect(defaultEssenceDeck(specialCatalog, "CAOS")).toHaveLength(
      ESSENCE_DECK_SIZE,
    );
    expect(
      defaultEssenceDeck(specialCatalog, "CAOS").filter((id) =>
        id.startsWith("special-"),
      ).length,
    ).toBe(4);

    const loadout = {
      faction: "CAOS",
      mainDeck: Array.from(
        { length: MAIN_DECK_SIZE },
        (_, index) => `character-${index % 12}`,
      ),
      arsenal: [],
      sanctuary: "sanctuary",
      essenceDeck: [
        "special-0",
        "special-1",
        "special-2",
        "special-3",
        "special-4",
        "basic",
        "basic",
        "basic",
        "basic",
        "basic",
      ],
    };
    expect(validateLoadout(loadout, catalog, "ALLIANCES")).toMatchObject({
      ok: false,
      error: "No puedes usar mas de 4 Esencias Especiales",
    });
  });
});
