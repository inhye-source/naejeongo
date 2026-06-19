// 내전 밸런서 핵심 타입 정의

// 라이엇 5개 포지션
export type Position = "TOP" | "JUNGLE" | "MID" | "ADC" | "SUPPORT";

export const POSITIONS: Position[] = ["TOP", "JUNGLE", "MID", "ADC", "SUPPORT"];

export const POSITION_LABEL: Record<Position, string> = {
  TOP: "탑",
  JUNGLE: "정글",
  MID: "미드",
  ADC: "원딜",
  SUPPORT: "서폿",
};

// 라이엇 티어
export type Tier =
  | "IRON"
  | "BRONZE"
  | "SILVER"
  | "GOLD"
  | "PLATINUM"
  | "EMERALD"
  | "DIAMOND"
  | "MASTER"
  | "GRANDMASTER"
  | "CHALLENGER";

export type Division = "IV" | "III" | "II" | "I";

export interface Player {
  id: string;
  // Riot ID = 게임이름#태그 (예: Hide on bush#KR1)
  riotId?: string;
  displayName: string;
  tier: Tier;
  division: Division; // 마스터 이상은 "I"로 통일
  // 주 포지션 (선호 순서대로, 첫 번째가 1순위)
  preferredPositions: Position[];
  // 챔피언 폭: 자신 있게 플레이 가능한 챔프 수 (1~)
  championPoolSize: number;
  // 모스트 챔피언 (최대 3개)
  mostChampions: string[];
  // 자체 MMR: 내전 결과로 갱신되는 Elo. 미설정 시 티어점수로 초기화
  internalMmr?: number;
  // 수동 보정값 (체감 실력 반영, +/-)
  manualAdjustment: number;
  // 누적 전적
  wins: number;
  losses: number;
}

// 밸런싱 결과: 한 선수의 팀/포지션 배정
export interface Assignment {
  player: Player;
  position: Position;
  // 이 포지션이 선호 순위 몇 번째인지 (0 = 1순위, -1 = 비선호)
  preferenceRank: number;
}

export interface TeamResult {
  assignments: Assignment[];
  totalScore: number;
}

export interface BalanceResult {
  blue: TeamResult;
  red: TeamResult;
  // 두 팀 점수 차 (낮을수록 균형)
  scoreDiff: number;
  // 포지션 적합도: 선호 포지션에 배정된 정도 (0~1, 높을수록 좋음)
  positionFit: number;
  // 종합 평가 점수 (낮을수록 좋은 조합)
  cost: number;
}
