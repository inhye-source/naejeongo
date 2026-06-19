import { PlayerChampion } from "./stats";
import { Assignment } from "./types";

export interface BanCandidate {
  champion: string;
  picks: number;
  wins: number;
  players: string[]; // 이 챔프를 하는 상대 선수들
}

// 상대팀 5명의 내전 픽 기록을 모아 위협(밴) 후보를 산출
export function computeBanList(
  opponent: Assignment[],
  champMap: Record<string, PlayerChampion[]>,
): BanCandidate[] {
  const agg = new Map<
    string,
    { picks: number; wins: number; players: Set<string> }
  >();
  for (const a of opponent) {
    const champs = champMap[a.player.id] ?? [];
    for (const c of champs) {
      const e = agg.get(c.champion) ?? { picks: 0, wins: 0, players: new Set() };
      e.picks += c.picks;
      e.wins += c.wins;
      e.players.add(a.player.displayName);
      agg.set(c.champion, e);
    }
  }
  return [...agg.entries()]
    .map(([champion, v]) => ({
      champion,
      picks: v.picks,
      wins: v.wins,
      players: [...v.players],
    }))
    // 많이 픽한 순 → 승률 높은 순
    .sort((a, b) => b.picks - a.picks || b.wins / b.picks - a.wins / a.picks)
    .slice(0, 6);
}
