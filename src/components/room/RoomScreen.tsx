"use client";

import { useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { api } from "@/../convex/_generated/api";
import { RoomEntry, sessionKey } from "./RoomEntry";
import { RoomBoard } from "./RoomBoard";
import { PreparationScreen, type RoomPreparationView } from "./PreparationScreen";
import { RoomTerminalScreen, RoomUnknownStatusScreen } from "./RoomTerminalScreen";

export function RoomScreen({ code }: { code: string }) {
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  useEffect(() => { const timer = window.setTimeout(() => { const raw = window.localStorage.getItem(sessionKey(code)); if (raw) { try { setSessionToken(JSON.parse(raw).playerSessionToken); } catch { setSessionToken(null); } } }, 0); return () => window.clearTimeout(timer); }, [code]);
  const view = useQuery(api.rooms.getPlayerView, sessionToken ? { code, playerSessionToken: sessionToken } : "skip");
  if (!sessionToken) return <main className="min-h-screen bg-[#090807] p-6 text-zinc-100"><RoomEntry initialCode={code} onSessionSaved={setSessionToken} /></main>;
  if (view === undefined) return <main className="flex min-h-screen items-center justify-center bg-[#090807] text-sm text-zinc-400">Conectando a la sala…</main>;
  if (view?.status === "INVALID_SESSION") return <main className="min-h-screen bg-[#090807] p-6 text-zinc-100"><RoomEntry initialCode={code} onSessionSaved={setSessionToken} /></main>;
  switch (view?.status) {
    case "WAITING_FOR_PLAYER":
    case "PREPARATION":
      return <PreparationScreen view={view as unknown as RoomPreparationView} sessionToken={sessionToken} />;
    case "IN_GAME":
      return <RoomBoard view={view as unknown as Parameters<typeof RoomBoard>[0]["view"]} sessionToken={sessionToken} />;
    case "FINISHED":
      return <RoomTerminalScreen code={view.code ?? code} status="FINISHED" />;
    case "ABANDONED":
      return <RoomTerminalScreen code={view.code ?? code} status="ABANDONED" />;
    default:
      return <RoomUnknownStatusScreen code={view?.code ?? code} status={view?.status ?? "UNKNOWN"} />;
  }
}
