import { effectiveScore } from "./tier";
import {
  Assignment,
  BalanceResult,
  Player,
  Position,
  POSITIONS,
  TeamResult,
} from "./types";

// ── 가중치 (튜닝 가능) ──────────────────────────────
// 포지션 불만족 1단위가 실력점수 몇 점에 해당하는지.
// 값이 클수록 "포지션 맞추기"를 점수 균형보다 우선시한다.
const POSITION_WEIGHT = 60;
// 비선호 포지션(주 포지션 목록에 없음) 배정 시 페널티 (고정값).
// 챔프 폭 기반 조정은 추후 Riot API 숙련도 연동 시 적용 예정.
const OFF_POSITION_PENALTY = 4;

// 한 선수가 특정 포지션을 맡을 때의 불만족 비용
function positionCost(player: Player, position: Position): number {
  const rank = player.preferredPositions.indexOf(position);
  if (rank >= 0) return rank; // 0=1순위, 1=2순위 ...
  return OFF_POSITION_PENALTY;
}

// 선호 순위 (0=1순위, -1=비선호) — 표시용
function preferenceRank(player: Player, position: Position): number {
  return player.preferredPositions.indexOf(position);
}

// 5명 → 5포지션 순열 (120가지) 미리 생성
function permutations<T>(arr: T[]): T[][] {
  if (arr.length <= 1) return [arr];
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i++) {
    const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
    for (const perm of permutations(rest)) {
      result.push([arr[i], ...perm]);
    }
  }
  return result;
}
const POSITION_PERMS: Position[][] = permutations(POSITIONS);

// 한 팀(5명)에게 포지션을 최적 배정한다 (불만족 비용 최소화)
// positionLocks: 특정 선수를 특정 포지션에 고정. 만족 불가 시 Infinity 반환.
function assignPositions(
  team: Player[],
  positionLocks: Record<string, Position>,
): {
  assignments: Assignment[] | null;
  positionCostTotal: number;
} {
  let best: Assignment[] | null = null;
  let bestCost = Infinity;

  for (const perm of POSITION_PERMS) {
    // 라인 고정 검증: 고정된 선수는 반드시 해당 포지션이어야 함
    let valid = true;
    for (let i = 0; i < 5; i++) {
      const lock = positionLocks[team[i].id];
      if (lock && perm[i] !== lock) {
        valid = false;
        break;
      }
    }
    if (!valid) continue;

    let cost = 0;
    for (let i = 0; i < 5; i++) {
      cost += positionCost(team[i], perm[i]);
    }
    if (cost < bestCost) {
      bestCost = cost;
      best = team.map((player, i) => ({
        player,
        position: perm[i],
        preferenceRank: preferenceRank(player, perm[i]),
      }));
    }
  }
  return { assignments: best, positionCostTotal: bestCost };
}

function teamScore(team: Player[]): number {
  return team.reduce((sum, p) => sum + effectiveScore(p), 0);
}

// 선호 순위를 0~1 만족도로 변환 (1순위=1.0, 비선호=0)
function satisfaction(rank: number): number {
  if (rank < 0) return 0;
  return Math.max(0, 1 - rank * 0.25); // 1.0, 0.75, 0.5, 0.25, 0
}

// 10명 선택 조합 (인덱스 0을 항상 블루에 고정해 대칭 중복 제거 → 126가지)
function* teamSplits(n: number): Generator<number[]> {
  // n=10 가정. blue 5명 중 0번 고정.
  const indices = Array.from({ length: n }, (_, i) => i);
  const rest = indices.slice(1); // 1..9 에서 4명 선택
  const combos = combinations(rest, 4);
  for (const c of combos) {
    yield [0, ...c];
  }
}

function combinations(arr: number[], k: number): number[][] {
  if (k === 0) return [[]];
  if (arr.length < k) return [];
  const [head, ...tail] = arr;
  const withHead = combinations(tail, k - 1).map((c) => [head, ...c]);
  const withoutHead = combinations(tail, k);
  return [...withHead, ...withoutHead];
}

// 메인: 10명을 받아 최적 밸런스 조합들을 비용 오름차순으로 반환
// lockGroups: 같은 팀에 묶어야 하는 선수 id 그룹들 (선택)
// positionLocks: 특정 선수를 특정 포지션에 고정 (선택)
export function balanceTeams(
  players: Player[],
  lockGroups: string[][] = [],
  positionLocks: Record<string, Position> = {},
): BalanceResult[] {
  if (players.length !== 10) {
    throw new Error(`내전은 정확히 10명이어야 합니다 (현재 ${players.length}명)`);
  }

  // 고정 그룹을 인덱스 집합으로 변환 (2명 이상만 의미 있음)
  const idToIndex = new Map(players.map((p, i) => [p.id, i]));
  const groupIndexSets = lockGroups
    .map((g) =>
      g
        .map((id) => idToIndex.get(id))
        .filter((x): x is number => x !== undefined),
    )
    .filter((g) => g.length >= 2);

  for (const g of groupIndexSets) {
    if (g.length > 5) {
      throw new Error("한 그룹이 6명 이상이라 같은 팀(5명)에 넣을 수 없습니다.");
    }
  }

  const results: BalanceResult[] = [];

  for (const blueIdx of teamSplits(10)) {
    const blueSet = new Set(blueIdx);

    // 고정 그룹 검증: 각 그룹은 블루에 전부 들어가거나 전부 빠져야 한다
    let valid = true;
    for (const g of groupIndexSets) {
      const inBlue = g.filter((i) => blueSet.has(i)).length;
      if (inBlue !== 0 && inBlue !== g.length) {
        valid = false;
        break;
      }
    }
    if (!valid) continue;

    const bluePlayers = blueIdx.map((i) => players[i]);
    const redPlayers = players.filter((_, i) => !blueSet.has(i));

    const blueAssign = assignPositions(bluePlayers, positionLocks);
    const redAssign = assignPositions(redPlayers, positionLocks);

    // 라인 고정을 만족 못 하는 조합은 제외
    if (!blueAssign.assignments || !redAssign.assignments) continue;

    const blueTotal = teamScore(bluePlayers);
    const redTotal = teamScore(redPlayers);
    const scoreDiff = Math.abs(blueTotal - redTotal);
    const positionCostTotal =
      blueAssign.positionCostTotal + redAssign.positionCostTotal;

    const allRanks = [...blueAssign.assignments, ...redAssign.assignments].map(
      (a) => a.preferenceRank,
    );
    const positionFit =
      allRanks.reduce((s, r) => s + satisfaction(r), 0) / allRanks.length;

    const cost = scoreDiff + positionCostTotal * POSITION_WEIGHT;

    const blue: TeamResult = {
      assignments: blueAssign.assignments,
      totalScore: blueTotal,
    };
    const red: TeamResult = {
      assignments: redAssign.assignments,
      totalScore: redTotal,
    };

    results.push({ blue, red, scoreDiff, positionFit, cost });
  }

  results.sort((a, b) => a.cost - b.cost);
  if (results.length === 0) {
    throw new Error(
      "고정 조건을 만족하는 팀 구성이 없습니다. 같은 팀 그룹이나 라인 고정을 조정해주세요. (같은 라인은 최대 2명까지 고정 가능)",
    );
  }
  return results;
}

// 최적 1개만 필요할 때
export function bestBalance(
  players: Player[],
  lockGroups: string[][] = [],
  positionLocks: Record<string, Position> = {},
): BalanceResult {
  return balanceTeams(players, lockGroups, positionLocks)[0];
}
