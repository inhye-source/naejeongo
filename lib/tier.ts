import { Division, Player, Tier } from "./types";

// 티어 순서 (낮은 → 높은)
export const TIER_ORDER: Tier[] = [
  "IRON",
  "BRONZE",
  "SILVER",
  "GOLD",
  "PLATINUM",
  "EMERALD",
  "DIAMOND",
  "MASTER",
  "GRANDMASTER",
  "CHALLENGER",
];

export const TIER_LABEL: Record<Tier, string> = {
  IRON: "아이언",
  BRONZE: "브론즈",
  SILVER: "실버",
  GOLD: "골드",
  PLATINUM: "플래티넘",
  EMERALD: "에메랄드",
  DIAMOND: "다이아몬드",
  MASTER: "마스터",
  GRANDMASTER: "그랜드마스터",
  CHALLENGER: "챌린저",
};

export const DIVISION_ORDER: Division[] = ["IV", "III", "II", "I"];

// 마스터 이상은 디비전이 없다
export function hasDivision(tier: Tier): boolean {
  return tier !== "MASTER" && tier !== "GRANDMASTER" && tier !== "CHALLENGER";
}

// ── 비선형(상위 가중) 티어 점수 ─────────────────────
// 각 티어의 IV(입성) 기준 점수. 위로 갈수록 티어 간 간격이 커진다.
// 다이아~챌린저 구간의 실력차가 실제로 가파르다는 체감을 반영.
const TIER_BASE: Record<Tier, number> = {
  IRON: 0,
  BRONZE: 200,
  SILVER: 450,
  GOLD: 750,
  PLATINUM: 1100,
  EMERALD: 1500,
  DIAMOND: 2000,
  MASTER: 2800,
  GRANDMASTER: 3600,
  CHALLENGER: 4600,
};

// 티어별 디비전 1칸당 점수 (티어 폭에 비례, 마스터 이상은 미사용)
const DIVISION_STEP: Record<Tier, number> = {
  IRON: 50,
  BRONZE: 50,
  SILVER: 75,
  GOLD: 75,
  PLATINUM: 100,
  EMERALD: 100,
  DIAMOND: 200,
  MASTER: 0,
  GRANDMASTER: 0,
  CHALLENGER: 0,
};

// 디비전 IV→I 이동 칸 수 (IV=0, III=1, II=2, I=3)
const DIVISION_INDEX: Record<Division, number> = {
  IV: 0,
  III: 1,
  II: 2,
  I: 3,
};

// 티어 + 디비전 → 기본 실력 점수 (비선형)
export function tierScore(tier: Tier, division: Division): number {
  const base = TIER_BASE[tier];
  if (!hasDivision(tier)) return base; // 마스터 이상은 디비전 무시
  return base + DIVISION_INDEX[division] * DIVISION_STEP[tier];
}

// 밸런싱에 쓰이는 선수의 최종 실력 점수
// 자체 MMR이 있으면 그걸 우선, 없으면 티어점수. 수동보정값을 더한다.
export function effectiveScore(player: Player): number {
  const base = player.internalMmr ?? tierScore(player.tier, player.division);
  return base + player.manualAdjustment;
}

// 신규 선수의 자체 MMR 초기값 (티어점수로 시드)
export function seedMmr(player: Pick<Player, "tier" | "division">): number {
  return tierScore(player.tier, player.division);
}

// "다이아몬드 II" 같은 표시 문자열
export function tierDisplay(tier: Tier, division: Division): string {
  if (!hasDivision(tier)) return TIER_LABEL[tier];
  return `${TIER_LABEL[tier]} ${division}`;
}
