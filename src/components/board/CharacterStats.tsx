export type CharacterStatsValue = { attack: number; health: number };

export function CharacterStats({ attack, health }: CharacterStatsValue) {
  return <div className="mt-1 flex justify-between border-t border-white/10 pt-1"><span>ATQ {attack}</span><span>PV {health}</span></div>;
}
