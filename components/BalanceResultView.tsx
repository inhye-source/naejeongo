"use client";

import { BalanceResult, POSITION_LABEL, Position, TeamResult } from "@/lib/types";
import { tierDisplay } from "@/lib/tier";
import { effectiveScore } from "@/lib/tier";

const POSITION_ORDER: Position[] = ["TOP", "JUNGLE", "MID", "ADC", "SUPPORT"];

function sortByPosition(team: TeamResult) {
  return [...team.assignments].sort(
    (a, b) =>
      POSITION_ORDER.indexOf(a.position) - POSITION_ORDER.indexOf(b.position),
  );
}

function prefBadge(rank: number): { label: string; cls: string } {
  if (rank === 0) return { label: "1순위", cls: "bg-emerald-500/15 text-emerald-300" };
  if (rank === 1) return { label: "2순위", cls: "bg-teal-500/15 text-teal-300" };
  if (rank >= 2) return { label: `${rank + 1}순위`, cls: "bg-amber-500/15 text-amber-300" };
  return { label: "비선호", cls: "bg-rose-500/15 text-rose-300" };
}

const SIDE_STYLE = {
  blue: {
    color: "var(--color-blue-team)",
    border: "rgba(59,130,246,0.55)",
    bg: "rgba(59,130,246,0.07)",
    rowBg: "rgba(59,130,246,0.10)",
  },
  red: {
    color: "var(--color-red-team)",
    border: "rgba(239,68,68,0.55)",
    bg: "rgba(239,68,68,0.07)",
    rowBg: "rgba(239,68,68,0.10)",
  },
} as const;

function TeamColumn({
  team,
  side,
  stronger,
}: {
  team: TeamResult;
  side: "blue" | "red";
  stronger: boolean;
}) {
  const s = SIDE_STYLE[side];
  const label = side === "blue" ? "블루팀" : "레드팀";
  return (
    <div
      className="flex-1 rounded-xl border-2 p-4"
      style={{ borderColor: s.border, background: s.bg }}
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-lg font-bold" style={{ color: s.color }}>
          {label}
          {stronger && (
            <span className="rounded px-1.5 py-0.5 text-[10px] font-bold" style={{ background: s.rowBg, color: s.color }}>
              우세
            </span>
          )}
        </h3>
        <span className="text-sm text-text-dim">
          전력 <span className="font-semibold text-gold-bright">{Math.round(team.totalScore)}</span>
        </span>
      </div>
      <ul className="space-y-1.5">
        {sortByPosition(team).map((a) => {
          const badge = prefBadge(a.preferenceRank);
          return (
            <li
              key={a.player.id}
              className="flex items-center gap-3 rounded-lg bg-surface-2 px-3 py-2"
            >
              <span className="w-12 shrink-0 text-xs font-bold" style={{ color: s.color }}>
                {POSITION_LABEL[a.position]}
              </span>
              <span className="flex-1 truncate font-medium">
                {a.player.displayName}
              </span>
              <span className="hidden text-xs text-text-dim sm:inline">
                {tierDisplay(a.player.tier, a.player.division)}
              </span>
              <span
                className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${badge.cls}`}
              >
                {badge.label}
              </span>
              <span className="w-10 shrink-0 text-right text-xs text-text-dim">
                {Math.round(effectiveScore(a.player))}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function BalanceResultView({
  result,
}: {
  result: BalanceResult;
}) {
  const fitPct = Math.round(result.positionFit * 100);
  const diff = result.blue.totalScore - result.red.totalScore;
  const strongerSide = diff > 0 ? "blue" : diff < 0 ? "red" : "tie";
  const sign = diff > 0 ? "＞" : diff < 0 ? "＜" : "＝";
  const centerColor =
    strongerSide === "tie"
      ? "var(--color-text-dim)"
      : SIDE_STYLE[strongerSide].color;
  const centerLabel =
    strongerSide === "blue" ? "블루 우세" : strongerSide === "red" ? "레드 우세" : "균형";

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-3">
        <Metric
          label="전력 차이"
          value={Math.round(result.scoreDiff).toString()}
          hint={strongerSide === "tie" ? "완전 균형" : `${centerLabel} (낮을수록 균형)`}
        />
        <Metric label="포지션 만족도" value={`${fitPct}%`} hint="선호 포지션 반영도" />
      </div>
      <div className="flex flex-col gap-4 md:flex-row">
        <TeamColumn team={result.blue} side="blue" stronger={strongerSide === "blue"} />
        <div className="flex shrink-0 flex-col items-center justify-center gap-0.5 md:px-1">
          <span className="text-4xl font-black leading-none" style={{ color: centerColor }}>
            {sign}
          </span>
          <span className="text-xs font-semibold" style={{ color: centerColor }}>
            {centerLabel}
          </span>
        </div>
        <TeamColumn team={result.red} side="red" stronger={strongerSide === "red"} />
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface px-4 py-2">
      <div className="text-xs text-text-dim">{label}</div>
      <div className="text-xl font-bold text-gold-bright">{value}</div>
      <div className="text-[10px] text-text-dim">{hint}</div>
    </div>
  );
}
