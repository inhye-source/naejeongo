"use client";

import { useState } from "react";
import { BalanceResult, POSITION_LABEL, Position } from "@/lib/types";
import { PlayerChampion } from "@/lib/stats";
import { computeBanList } from "@/lib/recommend";

const POSITION_ORDER: Position[] = ["TOP", "JUNGLE", "MID", "ADC", "SUPPORT"];

export default function BanRecommendation({
  result,
  champMap,
}: {
  result: BalanceResult;
  champMap: Record<string, PlayerChampion[]>;
}) {
  const [myTeam, setMyTeam] = useState<"blue" | "red" | null>(null);

  const opponentSide = myTeam === "blue" ? "red" : "blue";
  const opponent =
    myTeam === null
      ? []
      : [...result[opponentSide].assignments].sort(
          (a, b) =>
            POSITION_ORDER.indexOf(a.position) -
            POSITION_ORDER.indexOf(b.position),
        );

  const banList = myTeam === null ? [] : computeBanList(opponent, champMap);
  const hasData = banList.length > 0;

  return (
    <section className="rounded-xl border border-border bg-surface p-4">
      <h2 className="text-lg font-semibold">🎯 상대팀 공략 (밴/예상 픽 추천)</h2>
      <p className="mt-1 text-xs text-text-dim">
        내 팀을 선택하면 상대팀이 자주 하는 챔프를 분석해 밴·주의 챔프를
        추천합니다. (내전 기록 기반)
      </p>

      <div className="mt-3 flex items-center gap-2">
        <span className="text-sm text-text-dim">내 팀:</span>
        <button
          onClick={() => setMyTeam("blue")}
          className={`rounded-md border px-3 py-1.5 text-sm font-semibold transition-colors ${
            myTeam === "blue"
              ? "border-blue-team bg-blue-team/15 text-blue-team"
              : "border-border text-text-dim hover:bg-surface-2"
          }`}
        >
          블루팀
        </button>
        <button
          onClick={() => setMyTeam("red")}
          className={`rounded-md border px-3 py-1.5 text-sm font-semibold transition-colors ${
            myTeam === "red"
              ? "border-red-team bg-red-team/15 text-red-team"
              : "border-border text-text-dim hover:bg-surface-2"
          }`}
        >
          레드팀
        </button>
      </div>

      {myTeam !== null && (
        <div className="mt-4">
          {!hasData ? (
            <p className="rounded-lg bg-surface-2 p-3 text-sm text-text-dim">
              상대팀 선수들의 내전 픽 기록이 아직 없습니다. 히스토리에서 결과(픽한
              챔프)를 입력하면 추천이 생성됩니다.
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {/* 밴 추천 */}
              <div className="rounded-lg border border-border bg-surface-2 p-3">
                <h3 className="mb-2 text-sm font-bold text-red-team">
                  🚫 밴 추천 (상대 주력 순)
                </h3>
                <ol className="space-y-1.5">
                  {banList.map((b, i) => (
                    <li key={b.champion} className="flex items-center gap-2 text-sm">
                      <span className="w-4 shrink-0 font-bold text-text-dim">
                        {i + 1}
                      </span>
                      <span className="font-semibold">{b.champion}</span>
                      <span className="text-xs text-text-dim">
                        {b.picks}판 · {Math.round((b.wins / b.picks) * 100)}% ·{" "}
                        {b.players.join(", ")}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>

              {/* 라인별 예상 픽 */}
              <div className="rounded-lg border border-border bg-surface-2 p-3">
                <h3 className="mb-2 text-sm font-bold text-gold-bright">
                  📋 상대 라인별 예상 픽
                </h3>
                <ul className="space-y-1.5">
                  {opponent.map((a) => {
                    const champs = champMap[a.player.id] ?? [];
                    return (
                      <li key={a.player.id} className="flex items-center gap-2 text-sm">
                        <span className="w-10 shrink-0 text-xs font-bold text-accent">
                          {POSITION_LABEL[a.position]}
                        </span>
                        <span className="w-16 shrink-0 truncate">
                          {a.player.displayName}
                        </span>
                        <span className="text-xs text-text-dim">
                          {champs.length > 0
                            ? champs
                                .slice(0, 2)
                                .map((c) => c.champion)
                                .join(", ")
                            : "기록 없음"}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          )}
          <p className="mt-2 text-[11px] text-text-dim">
            ※ 내전에서 실제 픽한 챔프 빈도 기반 추천입니다. 표본이 쌓일수록
            정확해집니다.
          </p>
        </div>
      )}
    </section>
  );
}
