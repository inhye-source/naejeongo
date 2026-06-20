import { Player } from "./types";
import { effectiveScore, seedMmr } from "./tier";

// 자체 MMR 갱신 (Elo 방식)
// - 팀 평균 실력으로 기대 승률을 구하고, 실제 결과와의 차이만큼 보정
// - 약팀이 이기면 많이 오르고, 강팀이 지면 많이 내린다
// - K: 한 판 최대 변동폭. 내전은 표본이 적으므로 다소 크게 잡는다.

const K = 160;
// Elo 기대승률 스케일: 이 점수차에서 약 76% 승률로 본다.
const SCALE = 600;

export function expectedWinRate(teamScore: number, oppScore: number): number {
  return 1 / (1 + Math.pow(10, (oppScore - teamScore) / SCALE));
}

export interface MmrChange {
  playerId: string;
  before: number;
  after: number;
  delta: number;
}

// 한 내전 결과로 양 팀 선수들의 자체 MMR 변화량을 계산
export function computeMmrChanges(
  blue: Player[],
  red: Player[],
  winner: "blue" | "red",
): MmrChange[] {
  const blueAvg = teamAvg(blue);
  const redAvg = teamAvg(red);

  const blueExpected = expectedWinRate(blueAvg, redAvg);
  const redExpected = 1 - blueExpected;

  const blueActual = winner === "blue" ? 1 : 0;
  const redActual = winner === "red" ? 1 : 0;

  const blueDelta = Math.round(K * (blueActual - blueExpected));
  const redDelta = Math.round(K * (redActual - redExpected));

  const changes: MmrChange[] = [];
  for (const p of blue) changes.push(applyDelta(p, blueDelta));
  for (const p of red) changes.push(applyDelta(p, redDelta));
  return changes;
}

function teamAvg(team: Player[]): number {
  return team.reduce((s, p) => s + effectiveScore(p), 0) / team.length;
}

function applyDelta(p: Player, delta: number): MmrChange {
  // 수동 보정값은 MMR이 아니므로 제외하고, 순수 MMR(없으면 티어시드)에 적용
  const before = p.internalMmr ?? seedMmr(p);
  const after = before + delta;
  return { playerId: p.id, before, after, delta };
}
