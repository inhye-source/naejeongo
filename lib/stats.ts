import { MatchDetail } from "./db";
import { Player } from "./types";

// ── 밸런스 정확도 ────────────────────────────────────
export interface BalanceStats {
  completedCount: number;
  avgPredictedDiff: number; // 평균 예측 전력차 (작을수록 균형)
  blueWinRate: number; // 블루 승률 (50%에 가까울수록 균형)
  favoredWinRate: number; // 전력 우세팀이 실제로 이긴 비율
}

export function computeBalanceStats(matches: MatchDetail[]): BalanceStats {
  const done = matches.filter((m) => m.status === "completed" && m.winner);
  if (done.length === 0) {
    return { completedCount: 0, avgPredictedDiff: 0, blueWinRate: 0, favoredWinRate: 0 };
  }
  let blueWins = 0;
  let favoredWins = 0;
  let diffSum = 0;
  for (const m of done) {
    if (m.winner === "blue") blueWins++;
    diffSum += Math.abs(m.predictedScoreDiff ?? 0);

    // 전력 우세팀: score_at_match 합이 큰 팀
    const blueScore = sumScore(m, "blue");
    const redScore = sumScore(m, "red");
    const favored = blueScore === redScore ? null : blueScore > redScore ? "blue" : "red";
    if (favored && favored === m.winner) favoredWins++;
  }
  return {
    completedCount: done.length,
    avgPredictedDiff: diffSum / done.length,
    blueWinRate: blueWins / done.length,
    favoredWinRate: favoredWins / done.length,
  };
}

function sumScore(m: MatchDetail, team: "blue" | "red"): number {
  return m.players
    .filter((p) => p.team === team)
    .reduce((s, p) => s + (p.scoreAtMatch ?? 0), 0);
}

// ── 개인 전적 ────────────────────────────────────────
export interface PlayerStat {
  player: Player;
  games: number;
  wins: number;
  losses: number;
  winRate: number;
}

export function computePlayerStats(players: Player[]): PlayerStat[] {
  return players
    .map((p) => {
      const games = p.wins + p.losses;
      return {
        player: p,
        games,
        wins: p.wins,
        losses: p.losses,
        winRate: games > 0 ? p.wins / games : 0,
      };
    })
    .sort((a, b) => {
      // MMR 높은 순
      const am = a.player.internalMmr ?? 0;
      const bm = b.player.internalMmr ?? 0;
      return bm - am;
    });
}

// ── 챔피언별 통계 ────────────────────────────────────
export interface ChampionStat {
  champion: string;
  picks: number;
  wins: number;
  losses: number;
  winRate: number;
}

export function computeChampionStats(matches: MatchDetail[]): ChampionStat[] {
  const map = new Map<string, { picks: number; wins: number; losses: number }>();
  for (const m of matches) {
    if (m.status !== "completed") continue;
    for (const p of m.players) {
      const champ = p.champion?.trim();
      if (!champ) continue;
      const entry = map.get(champ) ?? { picks: 0, wins: 0, losses: 0 };
      entry.picks++;
      if (p.result === "win") entry.wins++;
      else if (p.result === "loss") entry.losses++;
      map.set(champ, entry);
    }
  }
  return Array.from(map.entries())
    .map(([champion, v]) => ({
      champion,
      picks: v.picks,
      wins: v.wins,
      losses: v.losses,
      winRate: v.picks > 0 ? v.wins / v.picks : 0,
    }))
    .sort((a, b) => b.picks - a.picks);
}
