import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GameCard } from "@/components/board/GameCard";
import { CardInspection } from "@/components/board/CardInspection";
import { cardDefinitionsById } from "@/data/cards/catalog";
import { buildMockGameState } from "@/data/mock-card-catalog";
import { testCardDefinitionsById } from "@/data/cards/fixtures/real-card-fixtures";

describe("shared card asset presentation", () => {
  afterEach(() => cleanup());

  it("renders an available card image through GameCard", () => {
    const definition = testCardDefinitionsById["fixture-character-001"]!;
    render(<GameCard card={buildMockGameState().cardInstances["local-hand-char"]} definition={definition} />);
    expect(screen.getByTestId("card-image-front")).toBeTruthy();
    expect(screen.getByAltText(definition.name)).toBeTruthy();
  });

  it("uses the full card surface with a flush rounded border", () => {
    const definition = testCardDefinitionsById["fixture-character-001"]!;
    render(<GameCard card={buildMockGameState().cardInstances["local-hand-char"]} definition={definition} size="field" />);

    const card = screen.getByTestId("game-card-local-hand-char");
    expect(card.className).toContain("h-[8.752rem]");
    expect(card.className).not.toContain("p-1.5");
    const frame = card.firstElementChild;
    expect(frame?.className).toContain("rounded-[0.35rem]");
    expect(frame?.className).toContain("border-white/30");
    expect(frame?.className).not.toContain("p-");
    expect(screen.getByTestId("card-image-front").className).toContain("h-full");
    expect(screen.getByTestId("card-image-front").className).toContain("w-full");
  });

  it("keeps printed stats untouched outside Field and overlays current Field stats", () => {
    const definition = cardDefinitionsById["MDK-055"]!;
    render(<GameCard card={buildMockGameState().cardInstances["local-hand-char"]} definition={definition} />);
    expect(screen.getByAltText("Aratto")).toBeTruthy();
    expect(screen.queryByTestId("character-stats-overlay")).toBeNull();
    cleanup();

    render(<GameCard card={buildMockGameState().cardInstances["local-hand-char"]} definition={definition} showCharacterStats />);
    expect(screen.getByTestId("character-stat-atq").textContent).toBe("4");
    expect(screen.getByTestId("character-stat-pv").textContent).toBe("5");
    expect(screen.getByTestId("character-stats-overlay").querySelector("img")?.getAttribute("src")).toContain("attack-health-frame.png");
    cleanup();

    render(<GameCard card={buildMockGameState().cardInstances["local-hand-char"]} definition={definition} characterStats={{ attack: 6, health: 7 }} showCharacterStats />);
    expect(screen.getByTestId("character-stat-atq").textContent).toBe("6");
    expect(screen.getByTestId("character-stat-pv").textContent).toBe("7");
    expect(screen.getByTestId("character-stat-atq").className).toContain("text-red-300");
    expect(screen.getByTestId("character-stat-pv").className).toContain("text-emerald-300");
    expect(screen.getByTestId("character-stat-atq").className).toContain("h-6");
    expect(screen.getByTestId("character-stat-atq").className).toContain("w-6");
    expect(screen.getByTestId("character-stat-atq").className).toContain("top-[calc(51.5%+2px)]");
    expect(screen.getByTestId("character-stat-atq").className).toContain("text-[17px]");
  });

  it("uses the development fallback when a card has no image", () => {
    const definition = testCardDefinitionsById["mock-char-a"]!;
    render(<GameCard card={buildMockGameState().cardInstances["local-hand-char"]} definition={definition} showCharacterStats />);
    expect(screen.getByTestId("card-image-fallback")).toBeTruthy();
    expect(screen.queryByTestId("card-image-front")).toBeNull();
    expect(screen.queryByTestId("character-stats-overlay")).toBeNull();
  });

  it("tolerates a legacy definition with image undefined", () => {
    const definition = { ...testCardDefinitionsById["mock-char-a"]!, image: undefined };
    render(<GameCard card={buildMockGameState().cardInstances["local-hand-char"]} definition={definition} />);
    expect(screen.getByTestId("card-image-fallback")).toBeTruthy();
  });

  it("uses the shared CardBack for face-down cards without a front alt", () => {
    const card = { ...buildMockGameState().cardInstances["local-hand-char"], faceUp: false };
    render(<GameCard card={card} definition={testCardDefinitionsById["mock-char-a"]} />);
    expect(screen.getByTestId("card-back-CARD")).toBeTruthy();
    expect(screen.queryByAltText("Vigia del Alba")).toBeNull();
  });

  it("does not inspect a card after a right click", () => {
    const inspect = vi.fn();
    const contextMenu = vi.fn();
    const card = buildMockGameState().cardInstances["local-hand-char"];
    const definition = testCardDefinitionsById["fixture-character-001"]!;
    render(
      <GameCard
        card={card}
        definition={definition}
        onInspect={inspect}
        onContextMenu={contextMenu}
      />,
    );
    const surface = screen.getByTestId("game-card-local-hand-char");
    fireEvent.pointerDown(surface, { button: 2, pointerId: 1, clientX: 10, clientY: 10 });
    fireEvent.pointerUp(surface, { button: 2, pointerId: 1, clientX: 10, clientY: 10 });
    fireEvent.contextMenu(surface);

    expect(contextMenu).toHaveBeenCalledOnce();
    expect(inspect).not.toHaveBeenCalled();
  });

  it("keeps the Inspector on the same GameCard/CardImage contract", () => {
    const card = buildMockGameState().cardInstances["local-hand-char"];
    const definition = testCardDefinitionsById["fixture-character-001"]!;
    render(<CardInspection card={card} definition={definition} onClose={() => {}} />);
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByTestId("card-image-front")).toBeTruthy();
  });
});
