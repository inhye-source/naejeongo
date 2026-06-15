import { effectiveScore, tierDisplay } from "./tier";
import { BalanceResult, POSITION_LABEL, Position, TeamResult } from "./types";

const POSITION_ORDER: Position[] = ["TOP", "JUNGLE", "MID", "ADC", "SUPPORT"];

function teamLines(team: TeamResult): string {
  return [...team.assignments]
    .sort(
      (a, b) =>
        POSITION_ORDER.indexOf(a.position) - POSITION_ORDER.indexOf(b.position),
    )
    .map((a) => {
      const pos = POSITION_LABEL[a.position].padEnd(2, " ");
      return `  ${pos} ${a.player.displayName} · ${tierDisplay(a.player.tier, a.player.division)}`;
    })
    .join("\n");
}

// 디스코드/카톡에 붙여넣기 좋은 텍스트로 변환
export function buildShareText(result: BalanceResult): string {
  const fit = Math.round(result.positionFit * 100);
  const diff = Math.round(result.scoreDiff);
  return [
    "⚔️ 내전 고? — 밸런스 결과",
    `전력차 ${diff} · 포지션 만족 ${fit}%`,
    "",
    `🔵 블루팀 (전력 ${Math.round(result.blue.totalScore)})`,
    teamLines(result.blue),
    "",
    `🔴 레드팀 (전력 ${Math.round(result.red.totalScore)})`,
    teamLines(result.red),
  ].join("\n");
}
