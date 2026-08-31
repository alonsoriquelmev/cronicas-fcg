import { describe, expect, it } from "vitest";
import { cardCatalog, cardDefinitionsById, getCardImageSource } from "@/data/cards/catalog";
import { structuredCardFixtures, testCardDefinitionsById } from "@/data/cards/fixtures/real-card-fixtures";
import { mockCardDefinitionsById } from "@/data/mock-card-catalog";
import { parseCardCatalog } from "@/data/cards/schema";
import { isSpecialEssence, mainDeckDefinitions, sanctuaryDefinitions } from "@/domain/preparation/preparation";
import type { CardDefinition } from "@/domain/cards/card.types";
import { validateCards } from "../../scripts/cards-pipeline.mjs";

describe("Card catalog boundary", () => {
  it("parses the generated catalog and resolves canonical IDs", () => {
    expect(parseCardCatalog(cardCatalog)).toHaveLength(cardCatalog.length);
    expect(cardDefinitionsById["mock-char-a"]).toBeUndefined();
    expect(getCardImageSource(testCardDefinitionsById["fixture-relic-001"])).toBe("/cards/fixture/fixture-relic-001.svg");
    expect(structuredCardFixtures).toHaveLength(4);
  });

  it("keeps structured type metadata and explicit zero modifiers", () => {
    const relic = mockCardDefinitionsById["mock-relic-a"];
    const verse = mockCardDefinitionsById["mock-verse-a"];
    const sanctuary = mockCardDefinitionsById["mock-sanctuary"];
    expect(relic).toMatchObject({ type: "RELIC", attackModifier: 2, healthModifier: 0 });
    expect(verse).toMatchObject({ type: "VERSE", prologueText: expect.any(String), epilogueText: expect.any(String) });
    expect(sanctuary).toMatchObject({ type: "SANCTUARY", health: 22 });
  });

  it("supports faction filtering through CardDefinition data", () => {
    expect(mainDeckDefinitions(Object.values(testCardDefinitionsById), "FIXTURE").map((card) => card.id)).toEqual(["fixture-character-001", "fixture-relic-001", "fixture-verse-001"]);
    expect(sanctuaryDefinitions(cardCatalog, "CAOS").map((card) => card.id)).toEqual(["MDK-109", "MDK-110"]);
  });

  it("imports the complete Caos source set with canonical IDs and official assets", () => {
    const caosCards = cardCatalog.filter((card) => card.factionId === "CAOS" && card.status === "RELEASED");
    expect(caosCards.map((card) => card.id)).toEqual(Array.from({ length: 18 }, (_, index) => `MDK-${String(index + 55).padStart(3, "0")}`));
    expect(caosCards.filter((card) => card.type === "CHARACTER")).toHaveLength(7);
    expect(caosCards.filter((card) => card.type === "RELIC")).toHaveLength(2);
    expect(caosCards.filter((card) => card.type === "VERSE")).toHaveLength(5);
    expect(caosCards.filter((card) => card.type === "ESSENCE")).toHaveLength(4);
    expect(getCardImageSource(cardDefinitionsById["MDK-055"])).toBe("/cards/caos/MDK-055.webp");
    expect(cardDefinitionsById["MDK-109"]).toMatchObject({ type: "SANCTUARY", factionId: null, status: "RELEASED" });
    expect(isSpecialEssence(cardDefinitionsById["MDK-071"]!)).toBe(true);
    expect(isSpecialEssence(cardDefinitionsById["MDK-069"]!)).toBe(false);
  });

  it("imports the complete Errantes source set with official assets and a test Sanctuary", () => {
    const errantesCards = cardCatalog.filter((card) => card.factionId === "ERRANTES" && card.status === "RELEASED");
    expect(errantesCards.map((card) => card.id)).toEqual(Array.from({ length: 18 }, (_, index) => `MDK-${String(index + 91).padStart(3, "0")}`));
    expect(errantesCards.filter((card) => card.type === "CHARACTER")).toHaveLength(7);
    expect(errantesCards.filter((card) => card.type === "RELIC")).toHaveLength(2);
    expect(errantesCards.filter((card) => card.type === "VERSE")).toHaveLength(5);
    expect(errantesCards.filter((card) => card.type === "ESSENCE")).toHaveLength(4);
    expect(getCardImageSource(cardDefinitionsById["MDK-091"])).toBe("/cards/errantes/MDK-091.webp");
    expect(cardDefinitionsById["MDK-110"]).toMatchObject({ type: "SANCTUARY", factionId: null, status: "RELEASED" });
    expect(isSpecialEssence(cardDefinitionsById["MDK-107"]!)).toBe(true);
    expect(isSpecialEssence(cardDefinitionsById["MDK-105"]!)).toBe(false);
  });

  it("publishes the four newly imported factions without test cards", () => {
    expect(cardCatalog).toHaveLength(110);
    expect(cardCatalog.every((card) => card.status === "RELEASED")).toBe(true);
    for (const [faction, start] of [["ORDEN", 1], ["INSTINTO", 19], ["FORJA", 37], ["VALOR", 73]] as const) {
      const cards = cardCatalog.filter((card) => card.factionId === faction);
      expect(cards).toHaveLength(18);
      expect(cards.map((card) => card.id)).toEqual(Array.from({ length: 18 }, (_, index) => `MDK-${String(start + index).padStart(3, "0")}`));
      expect(getCardImageSource(cards[0])).toBe(`/cards/${faction.toLowerCase()}/MDK-${String(start).padStart(3, "0")}.webp`);
    }
    expect(cardCatalog.some((card) => card.id.startsWith("mock-") || card.id.startsWith("fixture-"))).toBe(false);
  });

  it("rejects malformed required fields and duplicate IDs at the catalog schema boundary", () => {
    const valid = testCardDefinitionsById["fixture-character-001"];
    expect(() => parseCardCatalog([{ ...valid, health: undefined }])).toThrow();
    expect(validateCards([valid, valid], { checkAssets: false }).errors).toContain("duplicate card id: fixture-character-001");
    expect(validateCards([{ ...valid, image: { board: "/not-a-card.png", detail: null } }], { checkAssets: false }).errors).toContain("fixture-character-001: invalid image path /not-a-card.png");
  });

  it("does not mutate CardDefinition while exposing the shared type", () => {
    const before = JSON.stringify(mockCardDefinitionsById["mock-char-a"]);
    const copy: CardDefinition = { ...mockCardDefinitionsById["mock-char-a"]! };
    copy.name = "Temporary presentation value";
    expect(JSON.stringify(mockCardDefinitionsById["mock-char-a"])).toBe(before);
  });
});
