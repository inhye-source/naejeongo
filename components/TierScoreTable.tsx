"use client";

import {
  hasDivision,
  TIER_LABEL,
  TIER_ORDER,
  tierScore,
} from "@/lib/tier";

// 각 티어의 점수(또는 IV~I 범위)를 계산
const ROWS = TIER_ORDER.map((tier) => {
  if (hasDivision(tier)) {
    return {
      label: TIER_LABEL[tier],
      value: `${tierScore(tier, "IV")} ~ ${tierScore(tier, "I")}`,
    };
  }
  return { label: TIER_LABEL[tier], value: `${tierScore(tier, "I")}` };
}).reverse(); // 높은 티어부터

export default function TierScoreTable() {
  return (
    <details className="rounded-xl border border-border bg-surface p-4" open>
      <summary className="cursor-pointer text-sm font-semibold text-gold-bright">
        📊 티어별 실력 점수표
        <span className="ml-2 font-normal text-text-dim">
          (밸런싱 기준 — 상위 티어일수록 간격이 큽니다)
        </span>
      </summary>
      <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1.5 sm:grid-cols-3 lg:grid-cols-5">
        {ROWS.map((r) => (
          <div
            key={r.label}
            className="flex items-baseline justify-between border-b border-border/50 py-1"
          >
            <span className="text-sm text-text">{r.label}</span>
            <span className="text-xs font-semibold text-gold">{r.value}</span>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[11px] text-text-dim">
        디비전이 있는 티어는 IV~I 범위입니다. 실제 밸런싱에는 여기에{" "}
        <span className="text-text">자체 MMR(내전 결과)</span>과{" "}
        <span className="text-text">수동 보정</span>이 더해집니다.
      </p>
    </details>
  );
}
