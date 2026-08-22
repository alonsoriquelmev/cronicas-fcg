import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#090807] p-6 text-zinc-100">
      <section className="max-w-xl border border-amber-200/20 bg-[#15120f] p-8 shadow-2xl">
        <p className="mb-3 text-xs uppercase tracking-[0.28em] text-amber-300/70">Crónicas FCG</p>
        <h1 className="text-3xl font-semibold tracking-tight">Mesa de pruebas</h1>
        <p className="mt-3 max-w-md text-sm leading-6 text-zinc-400">Fundación vertical interactiva para explorar cartas, zonas y acciones manuales.</p>
        <Link className="mt-7 inline-flex border border-emerald-300/50 bg-emerald-300/10 px-4 py-2 text-sm text-emerald-100 transition hover:bg-emerald-300/20" href="/dev/board">Abrir la mesa sandbox</Link>
      </section>
    </main>
  );
}
