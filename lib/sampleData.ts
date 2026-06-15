import { Player } from "./types";
import { seedMmr } from "./tier";

// 데모용 샘플 선수 14명 (2단계에서 Supabase 데이터로 대체)
const raw: Omit<Player, "internalMmr">[] = [
  { id: "p1", displayName: "페이커", riotId: "Hide on bush#KR1", tier: "CHALLENGER", division: "I", preferredPositions: ["MID"], championPoolSize: 8, manualAdjustment: 0, wins: 0, losses: 0 },
  { id: "p2", displayName: "구마유시", riotId: "GUMAYUSI#KR1", tier: "GRANDMASTER", division: "I", preferredPositions: ["ADC"], championPoolSize: 6, manualAdjustment: 0, wins: 0, losses: 0 },
  { id: "p3", displayName: "케리아", riotId: "Keria#KR1", tier: "MASTER", division: "I", preferredPositions: ["SUPPORT", "MID"], championPoolSize: 9, manualAdjustment: 0, wins: 0, losses: 0 },
  { id: "p4", displayName: "오너", riotId: "Oner#KR1", tier: "MASTER", division: "I", preferredPositions: ["JUNGLE"], championPoolSize: 5, manualAdjustment: 0, wins: 0, losses: 0 },
  { id: "p5", displayName: "제우스", riotId: "Zeus#KR1", tier: "DIAMOND", division: "I", preferredPositions: ["TOP"], championPoolSize: 6, manualAdjustment: 0, wins: 0, losses: 0 },
  { id: "p6", displayName: "도란", riotId: "Doran#KR1", tier: "DIAMOND", division: "III", preferredPositions: ["TOP", "JUNGLE"], championPoolSize: 4, manualAdjustment: 0, wins: 0, losses: 0 },
  { id: "p7", displayName: "초가스장인", riotId: "ChoMain#KR1", tier: "EMERALD", division: "II", preferredPositions: ["TOP", "MID"], championPoolSize: 3, manualAdjustment: 0, wins: 0, losses: 0 },
  { id: "p8", displayName: "정글차이", riotId: "JgDiff#KR1", tier: "PLATINUM", division: "I", preferredPositions: ["JUNGLE", "SUPPORT"], championPoolSize: 5, manualAdjustment: 0, wins: 0, losses: 0 },
  { id: "p9", displayName: "미드갱맘", riotId: "MidGang#KR1", tier: "PLATINUM", division: "IV", preferredPositions: ["MID"], championPoolSize: 4, manualAdjustment: 0, wins: 0, losses: 0 },
  { id: "p10", displayName: "원딜러", riotId: "AdcCarry#KR1", tier: "GOLD", division: "II", preferredPositions: ["ADC", "MID"], championPoolSize: 3, manualAdjustment: 0, wins: 0, losses: 0 },
  { id: "p11", displayName: "서폿마스터", riotId: "SupGod#KR1", tier: "GOLD", division: "IV", preferredPositions: ["SUPPORT"], championPoolSize: 7, manualAdjustment: 0, wins: 0, losses: 0 },
  { id: "p12", displayName: "실버탈출", riotId: "Escape#KR1", tier: "SILVER", division: "I", preferredPositions: ["ADC", "SUPPORT"], championPoolSize: 2, manualAdjustment: 0, wins: 0, losses: 0 },
  { id: "p13", displayName: "올라운더", riotId: "Flex#KR1", tier: "EMERALD", division: "IV", preferredPositions: ["TOP", "JUNGLE", "MID", "ADC", "SUPPORT"], championPoolSize: 10, manualAdjustment: 0, wins: 0, losses: 0 },
  { id: "p14", displayName: "막내", riotId: "Newbie#KR1", tier: "BRONZE", division: "II", preferredPositions: ["SUPPORT", "TOP"], championPoolSize: 2, manualAdjustment: 0, wins: 0, losses: 0 },
];

export const SAMPLE_PLAYERS: Player[] = raw.map((p) => ({
  ...p,
  internalMmr: seedMmr(p),
}));
