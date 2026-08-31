import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PreparationScreen, type RoomPreparationView } from "@/components/room/PreparationScreen";
import { buildMockGameState, mockCardDefinitionsById } from "@/data/mock-card-catalog";

vi.mock("convex/react", () => ({ useMutation: () => vi.fn() }));
const inviteMocks = vi.hoisted(() => ({ copyTextToClipboard: vi.fn().mockResolvedValue(true) }));
vi.mock("@/components/room/room.invite", () => ({
  buildRoomInviteUrl: (origin: string, roomCode: string) => `${origin}/room/${roomCode}`,
  copyTextToClipboard: inviteMocks.copyTextToClipboard,
}));

const waitingView: RoomPreparationView = {
  status: "WAITING_FOR_PLAYER",
  code: "C7KM2",
  playerId: "player-1",
  seat: "PLAYER_1",
  players: [{ playerId: "player-1", displayName: "Alice", seat: "PLAYER_1" }],
  preparation: null,
  game: null,
};

describe("PreparationScreen waiting room sharing", () => {
  afterEach(() => {
    cleanup();
    inviteMocks.copyTextToClipboard.mockClear();
    localStorage.removeItem("cronicas:saved-decks");
  });

  beforeEach(() => inviteMocks.copyTextToClipboard.mockResolvedValue(true));

  it("shows the public room code and an invite link using the current origin", () => {
    render(<PreparationScreen view={waitingView} sessionToken="session" />);

    expect(screen.getByTestId("room-code").textContent).toContain("C7KM2");
    expect(screen.getByTestId("room-invite-link").getAttribute("href")).toBe(`${window.location.origin}/room/C7KM2`);
    expect(screen.getByTestId("room-invite-link").textContent).toContain(`${window.location.origin}/room/C7KM2`);
    expect(screen.getByText("Creada por Alice")).toBeTruthy();
    expect(screen.getByText("Esperando oponente...")).toBeTruthy();
  });

  it("copies the code and link and shows temporary feedback", async () => {
    const user = userEvent.setup();
    render(<PreparationScreen view={waitingView} sessionToken="session" />);
    await user.click(screen.getByRole("button", { name: "Copiar codigo" }));
    expect(inviteMocks.copyTextToClipboard).toHaveBeenCalledWith("C7KM2");
    await waitFor(() => expect(screen.getByRole("status").textContent).toContain("Codigo copiado"));

    await user.click(screen.getByRole("button", { name: "Copiar link" }));
    expect(inviteMocks.copyTextToClipboard).toHaveBeenLastCalledWith(`${window.location.origin}/room/C7KM2`);
    await waitFor(() => expect(screen.getByRole("status").textContent).toContain("Link copiado"));
  });

  it("renders and inspects legacy mock cards safely during Initial Draw and Mulligan", async () => {
    const user = userEvent.setup();
    const state = buildMockGameState();
    const hand = ["local-hand-char", "local-hand-relic", "local-hand-verse", "local-hand-verse-2", "local-sanctuary"].map((id, index) => ({
      ...state.cardInstances[id],
      ownerId: "player-1",
      controllerId: "player-1",
      zone: "HAND" as const,
      zoneOrder: index,
      definition: { ...mockCardDefinitionsById[state.cardInstances[id].cardDefinitionId], image: undefined },
    }));
    const basePreparation = {
      startingPlayerId: "player-1",
      startingPlayerRollWinnerId: null,
      players: [{ playerId: "player-1", displayName: "Alice", faction: "TEST", loadoutSubmitted: true, startingPlayerRoll: null, essenceConfirmed: true, initialDrawConfirmed: false, mulliganConfirmed: false }, { playerId: "player-2", displayName: "Bob", faction: "TEST", loadoutSubmitted: true, startingPlayerRoll: null, essenceConfirmed: true, initialDrawConfirmed: false, mulliganConfirmed: false }],
      you: { faction: "TEST", loadout: null, startingPlayerRoll: null, essenceConfirmed: true, initialDrawConfirmed: false, mulliganDecision: null, mulliganSelectedInstanceIds: [] },
    };
    const initialDrawView: RoomPreparationView = { ...waitingView, status: "PREPARATION", preparation: { ...basePreparation, stage: "INITIAL_DRAW" }, game: { cardInstances: hand, players: {} } };
    expect(() => render(<PreparationScreen view={initialDrawView} sessionToken="session" />)).not.toThrow();
    expect(screen.getByText("Mano inicial")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Inspeccionar" })).toBeNull();
    await user.click(screen.getAllByTestId(/^game-card-/)[0]);
    expect(screen.getByRole("dialog", { name: /Inspecci/ })).toBeTruthy();
    cleanup();
    const mulliganView: RoomPreparationView = { ...initialDrawView, preparation: { ...basePreparation, stage: "MULLIGAN", you: { ...basePreparation.you, initialDrawConfirmed: true } } };
    expect(() => render(<PreparationScreen view={mulliganView} sessionToken="session" />)).not.toThrow();
    expect(screen.getByText(/Seleccionadas:/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Inspeccionar" })).toBeNull();
    expect(screen.getAllByRole("checkbox")).toHaveLength(5);
    await user.click(screen.getAllByTestId(/^game-card-/)[0]);
    expect(screen.getByRole("dialog", { name: /Inspecci/ })).toBeTruthy();
  });

  it("offers Caos as a playable faction during deck selection", async () => {
    const user = userEvent.setup();
    const deckSelectionView: RoomPreparationView = {
      ...waitingView,
      status: "PREPARATION",
      preparation: {
        stage: "DECK_SELECTION",
        startingPlayerId: null,
        startingPlayerRollWinnerId: null,
        players: [
          { playerId: "player-1", displayName: "Alice", faction: null, loadoutSubmitted: false, startingPlayerRoll: null, essenceConfirmed: false, initialDrawConfirmed: false, mulliganConfirmed: false },
          { playerId: "player-2", displayName: "Bob", faction: null, loadoutSubmitted: false, startingPlayerRoll: null, essenceConfirmed: false, initialDrawConfirmed: false, mulliganConfirmed: false },
        ],
        you: { faction: null, loadout: null, startingPlayerRoll: null, essenceConfirmed: false, initialDrawConfirmed: false, mulliganDecision: null, mulliganSelectedInstanceIds: [] },
      },
    };

    render(<PreparationScreen view={deckSelectionView} sessionToken="session" />);
    expect(screen.getAllByText("0 / 35")).toHaveLength(2);
    await user.selectOptions(screen.getByLabelText("Faccion"), "CAOS");
    expect(screen.getByText("Aratto")).toBeTruthy();
    expect(screen.getByRole("option", { name: "Templo del Poder" })).toBeTruthy();
    await user.click(screen.getByTestId("game-card-preparation-essence-0-MDK-055"));
    expect(screen.getByRole("dialog")).toBeTruthy();
  });

  it("shows available-card quantity and remove control only after adding a copy", async () => {
    const user = userEvent.setup();
    const deckSelectionView: RoomPreparationView = {
      ...waitingView,
      status: "PREPARATION",
      preparation: {
        stage: "DECK_SELECTION",
        startingPlayerId: null,
        startingPlayerRollWinnerId: null,
        players: [
          { playerId: "player-1", displayName: "Alice", faction: null, loadoutSubmitted: false, startingPlayerRoll: null, essenceConfirmed: false, initialDrawConfirmed: false, mulliganConfirmed: false },
          { playerId: "player-2", displayName: "Bob", faction: null, loadoutSubmitted: false, startingPlayerRoll: null, essenceConfirmed: false, initialDrawConfirmed: false, mulliganConfirmed: false },
        ],
        you: { faction: null, loadout: null, startingPlayerRoll: null, essenceConfirmed: false, initialDrawConfirmed: false, mulliganDecision: null, mulliganSelectedInstanceIds: [] },
      },
    };

    render(<PreparationScreen view={deckSelectionView} sessionToken="session" />);
    await user.selectOptions(screen.getByLabelText("Faccion"), "CAOS");

    expect(screen.queryByTestId(/^available-card-count-/)).toBeNull();
    expect(screen.queryByRole("button", { name: /Quitar/ })).toBeNull();

    await user.click(screen.getByRole("button", { name: "Anadir Aratto" }));
    expect(screen.getByTestId("available-card-count-MDK-055").textContent).toBe("1");
    expect(screen.getByRole("button", { name: "Quitar Aratto" })).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Quitar Aratto" }));
    expect(screen.queryByTestId("available-card-count-MDK-055")).toBeNull();
    expect(screen.queryByRole("button", { name: "Quitar Aratto" })).toBeNull();
  });

  it("saves and reloads a deck from localStorage", async () => {
    const user = userEvent.setup();
    const deckSelectionView: RoomPreparationView = {
      ...waitingView,
      status: "PREPARATION",
      preparation: {
        stage: "DECK_SELECTION",
        startingPlayerId: null,
        startingPlayerRollWinnerId: null,
        players: [
          { playerId: "player-1", displayName: "Alice", faction: null, loadoutSubmitted: false, startingPlayerRoll: null, essenceConfirmed: false, initialDrawConfirmed: false, mulliganConfirmed: false },
          { playerId: "player-2", displayName: "Bob", faction: null, loadoutSubmitted: false, startingPlayerRoll: null, essenceConfirmed: false, initialDrawConfirmed: false, mulliganConfirmed: false },
        ],
        you: { faction: null, loadout: null, startingPlayerRoll: null, essenceConfirmed: false, initialDrawConfirmed: false, mulliganDecision: null, mulliganSelectedInstanceIds: [] },
      },
    };

    render(<PreparationScreen view={deckSelectionView} sessionToken="session" />);
    await user.selectOptions(screen.getByLabelText("Faccion"), "CAOS");
    await user.click(screen.getByRole("button", { name: "Anadir Aratto" }));
    await user.type(screen.getByLabelText("Nombre del deck"), "Caos guardado");
    await user.click(screen.getByRole("button", { name: "Guardar deck" }));

    const savedOption = screen.getByRole("option", { name: "Caos guardado" });
    const savedId = savedOption.getAttribute("value") ?? "";
    expect(savedId).not.toBe("");
    await user.selectOptions(screen.getByLabelText("Faccion"), "ORDEN");
    await user.selectOptions(screen.getByLabelText("Deck guardado"), savedId);
    await user.click(screen.getByRole("button", { name: "Cargar" }));

    expect((screen.getByLabelText("Faccion") as HTMLSelectElement).value).toBe("CAOS");
    expect(screen.getByTestId("available-card-count-MDK-055").textContent).toBe("1");
  });

  it("shows the starting-player die stage after both loadouts are ready", () => {
    const startingPlayerView: RoomPreparationView = {
      ...waitingView,
      status: "PREPARATION",
      preparation: {
        stage: "STARTING_PLAYER",
        startingPlayerId: null,
        startingPlayerRollWinnerId: null,
        players: [
          { playerId: "player-1", displayName: "Alice", faction: "CAOS", loadoutSubmitted: true, startingPlayerRoll: null, essenceConfirmed: false, initialDrawConfirmed: false, mulliganConfirmed: false },
          { playerId: "player-2", displayName: "Bob", faction: "ERRANTES", loadoutSubmitted: true, startingPlayerRoll: null, essenceConfirmed: false, initialDrawConfirmed: false, mulliganConfirmed: false },
        ],
        you: { faction: "CAOS", loadout: null, startingPlayerRoll: null, essenceConfirmed: false, initialDrawConfirmed: false, mulliganDecision: null, mulliganSelectedInstanceIds: [] },
      },
    };

    render(<PreparationScreen view={startingPlayerView} sessionToken="session" />);

    expect(screen.getByText("Decidir jugador inicial")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Tirar dado" })).toBeTruthy();
    expect(screen.getByText("Alice")).toBeTruthy();
    expect(screen.getByText("Bob")).toBeTruthy();
  });

  it("lets the die winner choose who starts", () => {
    const winnerView: RoomPreparationView = {
      ...waitingView,
      status: "PREPARATION",
      preparation: {
        stage: "STARTING_PLAYER",
        startingPlayerId: null,
        startingPlayerRollWinnerId: "player-1",
        players: [
          { playerId: "player-1", displayName: "Alice", faction: "CAOS", loadoutSubmitted: true, startingPlayerRoll: 6, essenceConfirmed: false, initialDrawConfirmed: false, mulliganConfirmed: false },
          { playerId: "player-2", displayName: "Bob", faction: "ERRANTES", loadoutSubmitted: true, startingPlayerRoll: 2, essenceConfirmed: false, initialDrawConfirmed: false, mulliganConfirmed: false },
        ],
        you: { faction: "CAOS", loadout: null, startingPlayerRoll: 6, essenceConfirmed: false, initialDrawConfirmed: false, mulliganDecision: null, mulliganSelectedInstanceIds: [] },
      },
    };

    render(<PreparationScreen view={winnerView} sessionToken="session" />);

    expect(screen.getByRole("button", { name: "Voy primero" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Mi enemigo va primero" })).toBeTruthy();
  });
});
