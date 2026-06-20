import { PlayerChampion } from "./stats";
import { effectiveScore } from "./tier";
import { Assignment } from "./types";

export interface BanCandidate {
  champion: string;
  threat: number; // 종합 위협 점수 (정렬 기준)
  picks: number; // 내전 픽 수
  wins: number; // 내전 승수
  isMost: boolean; // 누군가의 모스트 챔피언인지
  players: string[]; // 이 챔프를 하는 상대 선수들
}

// 티어(실력 점수)가 높을수록 위협 가중치 ↑
// 아이언 ≈ 1.0, 골드 ≈ 1.4, 다이아 ≈ 2.0, 챌린저 ≈ 3.3
function tierWeight(score: number): number {
  return 1 + score / 2000;
}

// 상대팀 5명의 "모스트 챔피언 + 내전 픽 기록"을 모아 위협(밴) 후보를 산출
// - 티어 높은 선수일수록 가중
// - 모스트는 1순위일수록 가중 (most1 > most2 > most3)
export function computeBanList(
  opponent: Assignment[],
  champMap: Record<string, PlayerChampion[]>,
): BanCandidate[] {
  const agg = new Map<
    string,
    { threat: number; picks: number; wins: number; isMost: boolean; players: Set<string> }
  >();
  const get = (champ: string) => {
    let e = agg.get(champ);
    if (!e) {
      e = { threat: 0, picks: 0, wins: 0, isMost: false, players: new Set() };
      agg.set(champ, e);
    }
    return e;
  };

  for (const a of opponent) {
    const w = tierWeight(effectiveScore(a.player));

    // 1) 모스트 챔피언 (수동 입력) — 티어·순위 가중
    a.player.mostChampions.forEach((raw, idx) => {
      const champ = raw.trim();
      if (!champ) return;
      const e = get(champ);
      e.threat += (3 - idx) * w * 1.2; // most1=3.6w, most2=2.4w, most3=1.2w
      e.isMost = true;
      e.players.add(a.player.displayName);
    });

    // 2) 내전 픽 기록 — 픽 수 × 티어 가중
    for (const c of champMap[a.player.id] ?? []) {
      const champ = c.champion.trim();
      if (!champ) continue;
      const e = get(champ);
      e.threat += c.picks * w;
      e.picks += c.picks;
      e.wins += c.wins;
      e.players.add(a.player.displayName);
    }
  }

  return [...agg.entries()]
    .map(([champion, v]) => ({
      champion,
      threat: v.threat,
      picks: v.picks,
      wins: v.wins,
      isMost: v.isMost,
      players: [...v.players],
    }))
    .sort((a, b) => b.threat - a.threat)
    .slice(0, 8);
}
