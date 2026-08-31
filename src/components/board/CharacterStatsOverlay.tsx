import Image from "next/image";
import type { CharacterStatsValue } from "./CharacterStats";

const FRAME_SOURCE = "/ui/character-stats/attack-health-frame.png";

function StatValue({
  stat,
  value,
  position,
  tone,
}: {
  stat: "atq" | "pv";
  value: number;
  position: string;
  tone: string;
}) {
  return (
    <span
      data-testid={`character-stat-${stat}`}
      className={`absolute top-[calc(51.5%+2px)] flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border text-[17px] font-black leading-none [text-shadow:-1px_-1px_0_#000,1px_-1px_0_#000,-1px_1px_0_#000,1px_1px_0_#000] shadow-[0_1px_5px_rgba(0,0,0,0.95)] ${position} ${tone}`}
    >
      {value}
    </span>
  );
}

export function CharacterStatsOverlay({
  attack,
  health,
  baseAttack,
  baseHealth,
}: CharacterStatsValue & { baseAttack: number; baseHealth: number }) {
  return (
    <div
      data-testid="character-stats-overlay"
      className="pointer-events-none absolute left-1/2 top-[calc(50%+5px)] z-20 w-[116%] -translate-x-1/2 -translate-y-1/2"
      style={{ aspectRatio: "2079 / 756" }}
      aria-hidden="true"
    >
      <Image
        src={FRAME_SOURCE}
        alt=""
        width={2079}
        height={756}
        className="absolute inset-0 h-full w-full object-contain"
      />
      <StatValue
        stat="atq"
        value={attack}
        position="left-[20.5%]"
        tone={`border-red-300/55 bg-[#210405]/95 ${attack !== baseAttack ? "text-red-300" : "text-white"}`}
      />
      <StatValue
        stat="pv"
        value={health}
        position="left-[80%]"
        tone={`border-lime-300/55 bg-[#071d08]/95 ${health !== baseHealth ? "text-emerald-300" : "text-white"}`}
      />
    </div>
  );
}
