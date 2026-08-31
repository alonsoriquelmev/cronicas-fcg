import { describe, expect, it, vi } from "vitest";
import { buildRoomInviteUrl, copyTextToClipboard } from "@/components/room/room.invite";

describe("room invite helpers", () => {
  it("uses the supplied application origin and public room code", () => {
    expect(buildRoomInviteUrl("https://cronicas.example/", "C7KM2")).toBe("https://cronicas.example/room/C7KM2");
    expect(buildRoomInviteUrl("https://preview.example/app", "A/B")).toBe("https://preview.example/app/room/A%2FB");
  });

  it("reports clipboard fallback when the API is unavailable", async () => {
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: undefined });

    await expect(copyTextToClipboard("C7KM2")).resolves.toBe(false);
  });

  it("writes text through the Clipboard API", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });

    await expect(copyTextToClipboard("https://cronicas.example/room/C7KM2")).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith("https://cronicas.example/room/C7KM2");
  });
});
