"use client";

import { useRouter } from "next/navigation";

type TerminalStatus = "FINISHED" | "ABANDONED";

export function RoomTerminalScreen({ code, status }: { code: string; status: TerminalStatus }) {
  const router = useRouter();
  const finished = status === "FINISHED";

  return <main className="flex min-h-screen items-center justify-center bg-[#090807] p-6 text-zinc-100"><section className="w-full max-w-lg border border-amber-200/20 bg-[#15120f] p-8 text-center"><p className="text-xs uppercase tracking-[0.25em] text-amber-300/70">Sala {code}</p><h1 data-testid={finished ? "finished-screen" : "abandoned-screen"} className="mt-3 text-2xl font-semibold">{finished ? "Partida finalizada" : "Partida abandonada"}</h1><p className="mt-4 text-sm text-zinc-400">{finished ? "La partida ha terminado." : "La partida fue abandonada."}</p><button type="button" onClick={() => router.push("/")} className="mt-8 border border-amber-200/40 px-4 py-2 text-sm text-amber-100">Volver al inicio</button></section></main>;
}

export function RoomUnknownStatusScreen({ code, status }: { code: string; status: string }) {
  return <main className="flex min-h-screen items-center justify-center bg-[#090807] p-6 text-zinc-100"><section className="w-full max-w-lg border border-rose-300/30 bg-[#15120f] p-8 text-center"><p className="text-xs uppercase tracking-[0.25em] text-rose-200/70">Sala {code}</p><h1 data-testid="unknown-room-status" className="mt-3 text-2xl font-semibold">Estado de sala no reconocido</h1><p className="mt-4 text-sm text-zinc-400">No se puede abrir la mesa con el estado actual: {status}.</p></section></main>;
}
