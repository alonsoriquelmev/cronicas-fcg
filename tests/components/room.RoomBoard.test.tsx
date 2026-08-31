import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RoomBoard } from "@/components/room/RoomBoard";
import { CARD_ASPECT_RATIO } from "@/components/board/card.tokens";
import { buildMockGameState, mockCardDefinitionsById } from "@/data/mock-card-catalog";
import { cardDefinitionsById } from "@/data/cards/catalog";

const finishMutation = vi.hoisted(() => vi.fn().mockResolvedValue(null));
vi.mock("convex/react", () => ({ useMutation: () => finishMutation }));

function boardView() {
  const state = buildMockGameState();
  return {
    status: "IN_GAME",
    code: "ZEM1T8",
    playerId: "PLAYER_LOCAL",
    seat: "PLAYER_1",
    players: [
      { playerId: "PLAYER_LOCAL", displayName: "Alice", seat: "PLAYER_1" },
      { playerId: "PLAYER_OPPONENT", displayName: "Bob", seat: "PLAYER_2" },
    ],
    game: {
      ...state,
      cardInstances: Object.values(state.cardInstances).map((card) => ({ ...card, definition: mockCardDefinitionsById[card.cardDefinitionId] })),
      hiddenCounts: {
        PLAYER_LOCAL: { HAND: 4, MAIN_DECK: 2, ESSENCE_DECK: 2 },
        PLAYER_OPPONENT: { HAND: 2, MAIN_DECK: 1, ESSENCE_DECK: 1 },
      },
    },
  };
}

describe("RoomBoard terminal confirmations", () => {
  beforeEach(() => finishMutation.mockClear());
  afterEach(() => cleanup());

  it("requires confirmation before finishing or abandoning", async () => {
    const user = userEvent.setup();
    render(<RoomBoard view={boardView()} sessionToken="session" />);

    await user.click(screen.getByRole("button", { name: "Finalizar" }));
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(finishMutation).not.toHaveBeenCalled();
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Cancelar" }));
    expect(screen.queryByRole("dialog")).toBeNull();

    await user.click(screen.getByRole("button", { name: "Abandonar" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Abandonar" }));
    expect(finishMutation).toHaveBeenCalledWith({ code: "ZEM1T8", playerSessionToken: "session", status: "ABANDONED" });
  });

  it("keeps the board perspective compact and removes visible FieldSlot and Character counters", () => {
    const view = boardView();
    view.game.cardInstances.find((card) => card.instanceId === "local-hand-char")!.zone = "FIELD";
    view.game.cardInstances.find((card) => card.instanceId === "local-hand-char")!.counter = 3;
    render(<RoomBoard view={view} sessionToken="session" />);

    const content = document.body.textContent ?? "";
    const enemyEssence = content.indexOf("Essences / ");
    const enemyField = content.indexOf("FIELD");
    const verse = content.indexOf("Verse Resolution / ");
    const ownField = content.indexOf("FIELD", enemyField + 1);
    const ownEssence = content.indexOf("Essences / ", enemyEssence + 1);
    expect(enemyEssence).toBeLessThan(enemyField);
    expect(enemyField).toBeLessThan(verse);
    expect(verse).toBeLessThan(ownField);
    expect(ownField).toBeLessThan(ownEssence);
    expect(content).not.toContain("Field Slot");
    expect(screen.queryByTestId("generic-counter-badge")).toBeNull();
    expect(screen.queryByLabelText("Aumentar contador")).toBeNull();
    expect(screen.queryByLabelText("Reducir contador")).toBeNull();
    expect(screen.getAllByTestId("character-field-content")).toHaveLength(2);
    expect(screen.getAllByTestId("character-field-content")[0].className).toContain("justify-center");
  });

  it("keeps hand cards in a compact horizontal row without changing DnD", () => {
    render(<RoomBoard view={boardView()} sessionToken="session" />);
    const handCard = screen.getByTestId("hand-card-local-hand-char");
    const surface = screen.getByTestId("hand-card-surface-local-hand-char");
    expect(surface.className).toContain("origin-bottom");
    expect(surface.className).toContain("scale-[0.94]");
    expect(surface.firstElementChild?.className).toContain("h-[9.724rem]");
    expect(handCard.getAttribute("aria-roledescription")).toBe("draggable");
    expect(handCard.className).not.toContain("-ml-5");
    expect(handCard.getAttribute("style")).not.toContain("rotate");
  });

  it("stacks repeated Hand card definitions while preserving every draggable instance", () => {
    const view = boardView();
    const original = view.game.cardInstances.find((card) => card.instanceId === "local-hand-char")!;
    view.game.cardInstances.push({ ...original, instanceId: "local-hand-char-copy", zoneOrder: original.zoneOrder + 1 });
    render(<RoomBoard view={view} sessionToken="session" />);

    const stack = screen.getByTestId(`hand-stack-${original.cardDefinitionId}`);
    expect(stack.getAttribute("data-stack-count")).toBe("2");
    expect(within(stack).getByTestId("hand-card-local-hand-char")).toBeTruthy();
    expect(within(stack).getByTestId("hand-card-local-hand-char-copy")).toBeTruthy();
  });

  it("exposes reusable own Utils markers and allows removing a marker from a Character", async () => {
    const user = userEvent.setup();
    const view = boardView();
    const character = view.game.cardInstances.find((card) => card.instanceId === "local-hand-char")!;
    character.zone = "FIELD";
    view.game.characterMarkers = {
      [character.instanceId]: [{ markerId: "marker-1", kind: "IMBATIBLE" }],
    };
    render(<RoomBoard view={view} sessionToken="session" />);

    await user.click(within(screen.getByTestId("utility-chest-PLAYER_LOCAL")).getByRole("button", { name: "Abrir Utils" }));
    expect(screen.getByTestId("utility-tray-PLAYER_LOCAL").className).toContain("w-[176px]");
    expect(screen.getByTestId("utility-tray-PLAYER_LOCAL").className).toContain("fixed");
    expect(screen.getAllByTestId(/^utility-marker-PLAYER_LOCAL-/)).toHaveLength(4);
    expect(within(screen.getByTestId("utility-chest-PLAYER_OPPONENT")).getByRole("button", { name: "Abrir Utils" }).hasAttribute("disabled")).toBe(true);

    await user.click(document.body);
    expect(screen.queryByTestId("utility-tray-PLAYER_LOCAL")).toBeNull();

    await user.click(within(screen.getByTestId("utility-chest-PLAYER_LOCAL")).getByRole("button", { name: "Abrir Utils" }));
    await user.click(screen.getByRole("button", { name: "Quitar Imbatible" }));
    expect(finishMutation).toHaveBeenCalledWith(
      expect.objectContaining({
        action: { type: "REMOVE_CHARACTER_MARKER", characterInstanceId: "local-hand-char", markerId: "marker-1" },
      }),
    );
  });

  it("opens the Inspector with a left click on a card in Hand", async () => {
    const user = userEvent.setup();
    render(<RoomBoard view={boardView()} sessionToken="session" />);

    await user.click(screen.getByTestId("game-card-local-hand-char"));

    await waitFor(() => expect(screen.getByRole("dialog", { name: /Inspecci/ })).toBeTruthy());
  });

  it("opens the Inspector with a left click on a public opponent card", async () => {
    const user = userEvent.setup();
    render(<RoomBoard view={boardView()} sessionToken="session" />);

    await user.click(screen.getByTestId("game-card-opponent-field-char"));

    expect(screen.getByRole("dialog", { name: /Inspecci/ })).toBeTruthy();
  });

  it("shows base and attached Relic modifiers in the Character Field overlay", () => {
    const view = boardView();
    const character = view.game.cardInstances.find((card) => card.instanceId === "local-hand-char")!;
    const relic = view.game.cardInstances.find((card) => card.instanceId === "local-hand-relic")!;
    const definition = cardDefinitionsById["MDK-055"]!;
    character.cardDefinitionId = definition.id;
    character.definition = definition;
    character.zone = "FIELD";
    relic.zone = "FIELD";
    relic.attachedToInstanceId = character.instanceId;

    render(<RoomBoard view={view} sessionToken="session" />);

    expect(screen.getByTestId("character-stat-atq").textContent).toBe("6");
    expect(screen.getByTestId("character-stat-pv").textContent).toBe("5");
  });

  it("exposes the active phase and shared card backs structurally", () => {
    render(<RoomBoard view={boardView()} sessionToken="session" />);
    expect(screen.queryByText(/Sala ZEM1T8 \/ IN_GAME/)).toBeNull();
    expect(screen.getByText("Rev. 0")).toBeTruthy();
    expect(screen.getByTestId("phase-ALBA").getAttribute("aria-current")).toBe("step");
    expect(screen.getByTestId("phase-ALBA").getAttribute("data-phase-active")).toBe("true");
    expect(screen.getAllByTestId("card-back-MAIN_DECK")).toHaveLength(2);
    expect(screen.getAllByTestId("card-back-ESSENCE_DECK")).toHaveLength(2);
    expect(screen.getAllByTestId("card-back-MAIN_DECK")[0].style.aspectRatio).toBe(CARD_ASPECT_RATIO);
    expect(screen.getByLabelText("Main Deck, 2 cartas")).toBeTruthy();
    expect(screen.getByLabelText("Essence Deck, 2 cartas")).toBeTruthy();
  });

  it("keeps empty Verse Resolution compact and sizes the populated zone to its card", () => {
    const empty = boardView();
    render(<RoomBoard view={empty} sessionToken="session" />);
    expect(screen.getByTestId("verse-resolution-zone").className).toContain("min-h-8");
    cleanup();

    const populated = boardView();
    populated.game.cardInstances.find((card) => card.instanceId === "local-hand-verse")!.zone = "VERSE_RESOLUTION";
    render(<RoomBoard view={populated} sessionToken="session" />);
    const zone = screen.getByTestId("verse-resolution-zone");
    expect(zone.className).toContain("min-h-[104px]");
    expect(screen.getByTestId("board-column").className).toContain("gap-0");
    expect(zone.className).toContain("my-1");
    expect(within(zone).getByText("VERSE")).toBeTruthy();
    expect(within(zone).getByTestId("verse-resolution-label").className).toContain("shrink-0");
    expect(within(zone).getByTestId("verse-resolution-content").className).toContain("justify-start");
    expect(within(zone).getByTestId("verse-resolution-content").className).toContain("flex-nowrap");
  });

  it("keeps board separators inside the central board column", () => {
    render(<RoomBoard view={boardView()} sessionToken="session" />);
    const board = screen.getByTestId("board-column");
    const sidebar = screen.getByTestId("board-sidebar");
    expect(board.className).toContain("grid-rows-[284px_auto_284px_auto]");
    expect(board.className).toContain("overflow-y-auto");
    expect(board.contains(screen.getByTestId("hand-zone"))).toBe(true);
    expect(screen.getByTestId("hand-zone").className).toContain("top-2");
    expect(board.contains(sidebar)).toBe(false);
    expect(screen.getByTestId("opponent-central-zones").className).toContain("grid-rows-[104px_180px]");
    expect(screen.getByTestId("own-central-zones").className).toContain("grid-rows-[180px_104px]");
  });

  it("orders the sidebar as rival resources, turn phases, then own resources", () => {
    render(<RoomBoard view={boardView()} sessionToken="session" />);
    const rival = screen.getByTestId("resource-panel-rival");
    const turn = screen.getByTestId("turn-phase-panel");
    const own = screen.getByTestId("resource-panel-own");
    expect(rival.compareDocumentPosition(turn) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(turn.compareDocumentPosition(own) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(within(rival).getByTestId("resource-sanctuary")).toBeTruthy();
    expect(within(own).getByTestId("resource-sanctuary")).toBeTruthy();
  });

  it("keeps Sanctuary controls in one row with equal panel heights", () => {
    render(<RoomBoard view={boardView()} sessionToken="session" />);
    const rivalSanctuary = within(screen.getByTestId("resource-panel-rival")).getByTestId("resource-sanctuary");
    const ownSanctuary = within(screen.getByTestId("resource-panel-own")).getByTestId("resource-sanctuary");
    expect(ownSanctuary.className).toContain("h-[174px]");
    expect(rivalSanctuary.className).toContain("h-[174px]");
    expect(within(ownSanctuary).getByLabelText("Bajar vida del Santuario").className).toContain("h-8");
    expect(within(ownSanctuary).getByText("PV 22")).toBeTruthy();
  });

  it("places Sanctuary HP controls beside the card and keeps the rival read-only", () => {
    render(<RoomBoard view={boardView()} sessionToken="session" />);
    const rival = within(screen.getByTestId("resource-panel-rival")).getByTestId("resource-sanctuary");
    const own = within(screen.getByTestId("resource-panel-own")).getByTestId("resource-sanctuary");
    expect(within(own).getByLabelText("Bajar vida del Santuario").parentElement?.className).toContain("justify-center");
    expect(within(own).getByLabelText("Subir vida del Santuario").parentElement?.className).toContain("justify-center");
    expect(within(rival).queryByLabelText("Bajar vida del Santuario")).toBeNull();
    expect(within(own).getByText("PV 22").parentElement?.className).toContain("h-6");
  });

  it("restores own Main and Essence deck context draws without enabling rival decks", async () => {
    const user = userEvent.setup();
    render(<RoomBoard view={boardView()} sessionToken="session" />);
    const rivalPanel = screen.getByTestId("resource-panel-rival");
    const ownPanel = screen.getByTestId("resource-panel-own");

    fireEvent.contextMenu(within(ownPanel).getByTestId("card-back-MAIN_DECK"));
    expect(screen.getByTestId("context-menu").className).toContain("-translate-y-full");
    expect(screen.getByRole("button", { name: "Enviar top al Cementerio" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Barajar" })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Robar" }));
    expect(finishMutation).toHaveBeenCalledWith(expect.objectContaining({ action: { type: "DRAW_CARD", playerId: "PLAYER_LOCAL" } }));

    fireEvent.contextMenu(within(ownPanel).getByTestId("card-back-MAIN_DECK"));
    await user.click(screen.getByRole("button", { name: "Enviar top al Cementerio" }));
    expect(finishMutation).toHaveBeenCalledWith(expect.objectContaining({ action: { type: "SEND_MAIN_DECK_TOP_TO_GRAVEYARD", playerId: "PLAYER_LOCAL" } }));

    fireEvent.contextMenu(within(ownPanel).getByTestId("card-back-MAIN_DECK"));
    await user.click(screen.getByRole("button", { name: "Barajar" }));
    expect(finishMutation).toHaveBeenCalledWith(expect.objectContaining({ action: { type: "SHUFFLE_MAIN_DECK", playerId: "PLAYER_LOCAL" } }));

    fireEvent.contextMenu(within(ownPanel).getByTestId("card-back-ESSENCE_DECK"));
    await user.click(screen.getByRole("button", { name: "Robar" }));
    expect(finishMutation).toHaveBeenCalledWith(expect.objectContaining({ action: { type: "DRAW_ESSENCE", playerId: "PLAYER_LOCAL" } }));

    fireEvent.contextMenu(within(rivalPanel).getByTestId("card-back-MAIN_DECK"));
    expect(screen.queryByRole("button", { name: "Robar" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Enviar top al Cementerio" })).toBeNull();
    fireEvent.contextMenu(within(rivalPanel).getByTestId("card-back-ESSENCE_DECK"));
    expect(screen.queryByRole("button", { name: "Robar" })).toBeNull();
  });

  it.each([
    { count: 1, rowStep: "20" },
    { count: 2, rowStep: "14" },
    { count: 3, rowStep: "10" },
  ])("keeps Character plus $count attached Relic(s) inside the compact Field slot", ({ count, rowStep }) => {
    const view = boardView();
    const character = view.game.cardInstances.find((card) => card.instanceId === "local-hand-char")!;
    character.zone = "FIELD";
    const relic = view.game.cardInstances.find((card) => card.instanceId === "local-hand-relic")!;
    relic.zone = "FIELD";
    relic.attachedToInstanceId = character.instanceId;
    view.game.cardInstances.push(...Array.from({ length: count - 1 }, (_, index) => ({ ...relic, instanceId: `local-attached-relic-${index + 2}` })));
    render(<RoomBoard view={view} sessionToken="session" />);
    const slot = screen.getAllByTestId("character-field-content")[1].querySelector(`[data-attached-relic-count="${count}"]`);
    const characterStack = screen.getByTestId(`character-stack-${character.instanceId}`);
    const stack = screen.getByTestId(`attached-relic-stack-${character.instanceId}`);
    expect(slot?.className).toContain("h-[180px]");
    expect(characterStack.firstElementChild?.contains(stack)).toBe(true);
    expect(Number(characterStack.getAttribute("data-stack-height"))).toBe(141 + (count === 1 ? 20 : count === 2 ? 34 : 38));
    expect(stack.getAttribute("data-stack-row-step")).toBe(rowStep);
    expect(screen.getAllByTitle(relic.definition!.name)).toHaveLength(count);
  });

  it("centers a Character unit at its base card height without attached Relics", () => {
    const view = boardView();
    view.game.cardInstances.find((card) => card.instanceId === "local-hand-char")!.zone = "FIELD";
    render(<RoomBoard view={view} sessionToken="session" />);
    expect(screen.getByTestId("character-stack-local-hand-char").getAttribute("data-stack-height")).toBe("141");
    expect(screen.getAllByTestId("character-field-content")[1].className).toContain("h-full");
  });

  it("centers loose Relics inside their Field slots", () => {
    const view = boardView();
    view.game.cardInstances.find((card) => card.instanceId === "local-hand-relic")!.zone = "FIELD";
    render(<RoomBoard view={view} sessionToken="session" />);
    const slot = screen.getByTestId("field-slot-local-hand-relic");
    expect(slot.className).toContain("items-center");
    expect(slot.className).toContain("justify-center");
  });

  it("uses dedicated compact sizes for Field, Verse, and Essence without changing hover behavior", () => {
    const view = boardView();
    view.game.cardInstances.find((card) => card.instanceId === "local-hand-char")!.zone = "FIELD";
    view.game.cardInstances.find((card) => card.instanceId === "local-hand-verse")!.zone = "VERSE_RESOLUTION";
    view.game.cardInstances.find((card) => card.instanceId === "local-essence-1")!.zone = "ESSENCE_ZONE";
    render(<RoomBoard view={view} sessionToken="session" />);

    expect(screen.getAllByTestId("character-field-content")[1].querySelector('[class*="h-[8.752rem]"]')).toBeTruthy();
    expect(screen.getByTestId("verse-resolution-zone").querySelector('[class*="h-[5.557rem]"]')).toBeTruthy();
    expect(screen.getAllByTestId("essence-zone")[1].querySelector('[class*="h-[5.904rem]"]')).toBeTruthy();
  });

  it("keeps empty Essence Zones the same height as populated zones", () => {
    const empty = boardView();
    render(<RoomBoard view={empty} sessionToken="session" />);
    const emptyEssenceClasses = screen.getAllByTestId("essence-zone").map((zone) => zone.className);
    expect(emptyEssenceClasses.every((className) => className.includes("h-[104px]"))).toBe(true);
    cleanup();

    const populated = boardView();
    populated.game.cardInstances.find((card) => card.instanceId === "local-hand-verse")!.zone = "VERSE_RESOLUTION";
    populated.game.cardInstances.find((card) => card.instanceId === "local-essence-1")!.zone = "ESSENCE_ZONE";
    render(<RoomBoard view={populated} sessionToken="session" />);
    const populatedEssenceClasses = screen.getAllByTestId("essence-zone").map((zone) => zone.className);
    expect(populatedEssenceClasses[0]).toContain("h-[104px]");
    expect(populatedEssenceClasses[1]).toContain("h-[104px]");
  });

  it("centers three Essences inside a content-sized Essence Zone", () => {
    const view = boardView();
    const first = view.game.cardInstances.find((card) => card.instanceId === "local-essence-1")!;
    const second = view.game.cardInstances.find((card) => card.instanceId === "local-essence-2")!;
    first.zone = "ESSENCE_ZONE";
    second.zone = "ESSENCE_ZONE";
    view.game.cardInstances.push({ ...first, instanceId: "local-essence-3", zoneOrder: 2 });

    render(<RoomBoard view={view} sessionToken="session" />);
    const ownEssence = screen.getAllByTestId("essence-zone")[1];
    const content = within(ownEssence).getByTestId("essence-zone-content");
    expect(content.className).toContain("flex-1");
    expect(content.className).toContain("content-center");
    expect(content.className).toContain("justify-center");
    expect(content.children).toHaveLength(3);
  });

  it("reserves the rotated footprint for tapped Essences", () => {
    const view = boardView();
    const essence = view.game.cardInstances.find((card) => card.instanceId === "local-essence-1")!;
    essence.zone = "ESSENCE_ZONE";
    essence.tapped = true;
    render(<RoomBoard view={view} sessionToken="session" />);
    expect(screen.getByTestId("essence-card-frame-local-essence-1").className).toContain("w-[6.12rem]");
    expect(screen.getByTestId("essence-card-frame-local-essence-1").className).toContain("h-[6.12rem]");
  });

  it("opens the own Graveyard as a gallery and exposes movement actions", async () => {
    const user = userEvent.setup();
    const view = boardView();
    view.game.cardInstances.find((card) => card.instanceId === "local-hand-char")!.zone = "GRAVEYARD";
    render(<RoomBoard view={view} sessionToken="session" />);

    await user.click(screen.getAllByRole("button", { name: /Abrir Cementerio/ })[1]);
    const gallery = screen.getByRole("dialog", { name: /Cementerio de PLAYER_LOCAL/ });
    expect(within(gallery).getByText("CHARACTER")).toBeTruthy();
    fireEvent.contextMenu(within(gallery).getByText("CHARACTER"));
    expect(screen.getByRole("button", { name: "Devolver a la Mano" })).toBeTruthy();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: /Cementerio de PLAYER_LOCAL/ })).toBeNull();
  });

  it("keeps an opponent Graveyard gallery inspect-only", async () => {
    const user = userEvent.setup();
    const view = boardView();
    view.game.cardInstances.find((card) => card.instanceId === "opponent-field-char")!.zone = "GRAVEYARD";
    render(<RoomBoard view={view} sessionToken="session" />);

    await user.click(screen.getAllByRole("button", { name: /Abrir Cementerio/ })[0]);
    const gallery = screen.getByRole("dialog", { name: /Cementerio de PLAYER_OPPONENT/ });
    fireEvent.contextMenu(within(gallery).getByText("CHARACTER"));
    expect(screen.getByRole("button", { name: "Inspeccionar" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Devolver a la Mano" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Mover al Campo" })).toBeNull();
  });

  it("anchors the rival Graveyard to the top and the own Graveyard to the bottom", () => {
    render(<RoomBoard view={boardView()} sessionToken="session" />);
    const graveyards = screen.getAllByLabelText(/Abrir Cementerio/);
    expect(graveyards[0].parentElement?.className).toContain("self-start");
    expect(graveyards[1].parentElement?.className).toContain("self-end");
    expect(graveyards[0].parentElement?.parentElement?.parentElement?.className).toContain("grid-rows-[104px_180px]");
    expect(graveyards[1].parentElement?.parentElement?.parentElement?.className).toContain("grid-rows-[180px_104px]");
  });

  it("shows only the rival hand count in the board header", () => {
    render(<RoomBoard view={boardView()} sessionToken="session" />);
    expect(screen.getByText("Mano rival / 2").closest("header")).toBeTruthy();
    expect(screen.queryByText(/Cartas publicas/i)).toBeNull();
    expect(screen.queryByText(/Tu perspectiva/i)).toBeNull();
    expect(screen.queryByText(/Mano 4/i)).toBeNull();
  });

  it("keeps both visible Graveyard slots stable and gives the top card useful scale", () => {
    const view = boardView();
    view.game.cardInstances.find((card) => card.instanceId === "local-hand-char")!.zone = "GRAVEYARD";
    render(<RoomBoard view={view} sessionToken="session" />);
    const slots = screen.getAllByTestId("graveyard-slot");
    expect(slots.every((slot) => slot.className.includes("h-[clamp(104px,10vh,108px)]"))).toBe(true);
    expect(slots[1].querySelector('[class*="scale-[0.92]"]')).toBeTruthy();
    expect(screen.queryByText(/Graveyard \/\s*\d+/i)).toBeNull();
  });

  it("opens the Graveyard gallery without also inspecting its top card", async () => {
    const user = userEvent.setup();
    const view = boardView();
    view.game.cardInstances.find((card) => card.instanceId === "local-hand-char")!.zone = "GRAVEYARD";
    render(<RoomBoard view={view} sessionToken="session" />);

    await user.click(screen.getAllByRole("button", { name: /Abrir Cementerio/ })[1]);
    expect(screen.getByRole("dialog", { name: /Cementerio de PLAYER_LOCAL/ })).toBeTruthy();
    expect(screen.queryByRole("dialog", { name: /Inspecci/ })).toBeNull();
  });

  it("submits manual Hand, Graveyard and Essence movements from their context menus", async () => {
    const user = userEvent.setup();
    const view = boardView();
    const essence = view.game.cardInstances.find((card) => card.instanceId === "local-essence-1")!;
    essence.zone = "ESSENCE_ZONE";
    const graveyardCard = view.game.cardInstances.find((card) => card.instanceId === "local-hand-verse")!;
    graveyardCard.zone = "GRAVEYARD";
    render(<RoomBoard view={view} sessionToken="session" />);

    fireEvent.contextMenu(screen.getByTestId("game-card-local-hand-char"));
    await user.click(screen.getByRole("button", { name: "Enviar al Cementerio" }));
    expect(finishMutation).toHaveBeenCalledWith(expect.objectContaining({ action: { type: "MOVE_HAND_CARD_TO_GRAVEYARD", instanceId: "local-hand-char", playerId: "PLAYER_LOCAL" } }));

    fireEvent.contextMenu(screen.getByTestId("game-card-local-hand-relic"));
    await user.click(screen.getByRole("button", { name: "Devolver al Mazo y barajar" }));
    expect(finishMutation).toHaveBeenCalledWith(expect.objectContaining({ action: { type: "SHUFFLE_CARD_INTO_MAIN_DECK", instanceId: "local-hand-relic", playerId: "PLAYER_LOCAL" } }));

    fireEvent.contextMenu(screen.getByTestId("game-card-local-essence-1"));
    await user.click(screen.getByRole("button", { name: "Enviar al fondo del Mazo de Esencias" }));
    expect(finishMutation).toHaveBeenCalledWith(expect.objectContaining({ action: { type: "RETURN_ESSENCE_TO_DECK_BOTTOM", instanceId: "local-essence-1", playerId: "PLAYER_LOCAL" } }));

    await user.click(screen.getAllByRole("button", { name: /Abrir Cementerio/ })[1]);
    const gallery = screen.getByRole("dialog", { name: /Cementerio de PLAYER_LOCAL/ });
    fireEvent.contextMenu(within(gallery).getByTestId("game-card-local-hand-verse"));
    await user.click(screen.getByRole("button", { name: "Devolver al Mazo y barajar" }));
    expect(finishMutation).toHaveBeenCalledWith(expect.objectContaining({ action: { type: "SHUFFLE_CARD_INTO_MAIN_DECK", instanceId: "local-hand-verse", playerId: "PLAYER_LOCAL" } }));
  });

  it("removes inline generic counter controls from a loose Relic", () => {
    const view = boardView();
    view.game.cardInstances.find((card) => card.instanceId === "local-hand-relic")!.zone = "FIELD";
    render(<RoomBoard view={view} sessionToken="session" />);
    expect(screen.queryByLabelText("Aumentar contador")).toBeNull();
    expect(screen.queryByLabelText("Reducir contador")).toBeNull();
  });

  it("proposes Character stat changes and exposes approval to the opponent", async () => {
    const user = userEvent.setup();
    const ownView = boardView();
    ownView.game.cardInstances.find((card) => card.instanceId === "local-hand-char")!.zone = "FIELD";
    render(<RoomBoard view={ownView} sessionToken="session" />);
    fireEvent.contextMenu(screen.getByTestId("game-card-local-hand-char"));
    await user.click(screen.getByRole("button", { name: "Modificar ATQ/PV" }));
    await user.click(screen.getByRole("button", { name: "Subir ATQ" }));
    await user.click(screen.getByRole("button", { name: "Solicitar cambio" }));
    expect(finishMutation).toHaveBeenCalledWith(expect.objectContaining({ action: expect.objectContaining({ type: "PROPOSE_CHARACTER_STAT_CHANGE", characterInstanceId: "local-hand-char", playerId: "PLAYER_LOCAL", attackDelta: 1, healthDelta: 0 }) }));
    cleanup();

    const rivalView = boardView();
    rivalView.game.pendingStatChanges = { "opponent-field-char": { proposalId: "proposal-1", characterInstanceId: "opponent-field-char", proposerId: "PLAYER_OPPONENT", attackDelta: 1, healthDelta: -1 } };
    render(<RoomBoard view={rivalView} sessionToken="session" />);
    const approval = screen.getByRole("dialog", { name: "Aprobar cambio de ATQ y PV" });
    await user.click(within(approval).getByRole("button", { name: "Aprobar" }));
    expect(finishMutation).toHaveBeenCalledWith(expect.objectContaining({ action: { type: "APPROVE_CHARACTER_STAT_CHANGE", proposalId: "proposal-1", characterInstanceId: "opponent-field-char", playerId: "PLAYER_LOCAL" } }));
  });

  it("keeps Devastadas inside the Field and restores a card to Hand from its gallery", async () => {
    const user = userEvent.setup();
    const view = boardView();
    const card = view.game.cardInstances.find((item) => item.instanceId === "local-hand-char")!;
    card.zone = "DEVASTATED";
    render(<RoomBoard view={view} sessionToken="session" />);

    const devastatedButton = screen.getAllByRole("button", { name: "Abrir Devastadas" })[1];
    expect(devastatedButton.parentElement?.className).toContain("h-[180px]");
    await user.click(devastatedButton);
    const gallery = screen.getByRole("dialog", { name: "Devastadas de PLAYER_LOCAL" });
    fireEvent.contextMenu(within(gallery).getByTestId("game-card-local-hand-char"));
    await user.click(screen.getByRole("button", { name: "Revertir devastacion" }));
    await user.click(screen.getByRole("button", { name: "Volver a la Mano" }));
    expect(finishMutation).toHaveBeenCalledWith(expect.objectContaining({ action: { type: "REVERT_DEVASTATION", instanceId: "local-hand-char", playerId: "PLAYER_LOCAL", toZone: "HAND" } }));
  });
});
