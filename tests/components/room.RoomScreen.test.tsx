import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RoomScreen } from "@/components/room/RoomScreen";

const mocks = vi.hoisted(() => ({ query: vi.fn(), push: vi.fn() }));

vi.mock("convex/react", () => ({ useQuery: mocks.query, useMutation: () => vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));

const terminalView = (status: "FINISHED" | "ABANDONED" | string) => ({
  status,
  code: "ZEM1T8",
  playerId: "player-1",
  seat: "PLAYER_1",
  players: [{ playerId: "player-1", displayName: "Alice", seat: "PLAYER_1" }],
  preparation: null,
  game: null,
});

function renderRoom(status: "FINISHED" | "ABANDONED" | string) {
  localStorage.setItem("cronicas:room:ZEM1T8:session", JSON.stringify({ playerSessionToken: "session" }));
  mocks.query.mockReturnValue(terminalView(status));
  return render(<RoomScreen code="ZEM1T8" />);
}

describe("RoomScreen terminal routing", () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
    mocks.query.mockReset();
    mocks.push.mockReset();
  });

  it("renders FinalScreen for FINISHED and returns home", async () => {
    const user = userEvent.setup();
    renderRoom("FINISHED");

    await waitFor(() => expect(screen.getByTestId("finished-screen")).toBeTruthy());
    expect(screen.queryByText("Preparar partida")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Volver al inicio" }));
    expect(mocks.push).toHaveBeenCalledWith("/");
  });

  it("renders AbandonedScreen for ABANDONED", async () => {
    renderRoom("ABANDONED");

    await waitFor(() => expect(screen.getByTestId("abandoned-screen")).toBeTruthy());
    expect(screen.getByText("La partida fue abandonada.")).toBeTruthy();
    expect(screen.queryByText("Preparar partida")).toBeNull();
  });

  it("does not fall back to preparation for an unknown status", async () => {
    renderRoom("BROKEN_STATUS");

    await waitFor(() => expect(screen.getByTestId("unknown-room-status")).toBeTruthy());
    expect(screen.queryByText("Preparar partida")).toBeNull();
  });

  it("restores a terminal screen after the session is loaded on refresh", async () => {
    renderRoom("FINISHED");

    await waitFor(() => expect(screen.getByText("Sala ZEM1T8")).toBeTruthy());
    expect(screen.getByTestId("finished-screen")).toBeTruthy();
  });
});
