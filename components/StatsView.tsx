"use client";

import { useEffect, useState } from "react";
import { fetchMatches, fetchPlayers, MatchDetail } from "@/lib/db";
import {
  computeBalanceStats,
  computeChampionStats,
  computePlayerStats,
} from "@/lib/stats";
import { effectiveScore, tierDisplay } from "@/lib/tier";
import { Player } from "@/lib/types";

type Tab = "balance" | "players" | "champions";

const TABS: { key: Tab; label: string }[] = [
  { key: "balance", label: "밸런스 정확도" },
  { key: "players", label: "개인 전적" },
  { key: "champions", label: "챔피언별" },
];

export default function StatsView() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<MatchDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("balance");

  useEffect(() => {
    Promise.all([fetchPlayers(), fetchMatches()])
      .then(([p, m]) => {
        setPlayers(p);
        setMatches(m);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "불러오기 실패"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-bold text-balance-gradient">분석</h1>
        <p className="mt-1 text-sm text-text-dim">
          축적된 내전 데이터로 밸런스 품질과 선수·챔피언 통계를 확인합니다.
        </p>
      </section>

      <div className="flex gap-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.key
                ? "border-b-2 border-gold text-gold-bright"
                : "text-text-dim hover:text-text"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-red-team">{error}</p>}
      {loading ? (
        <p className="text-sm text-text-dim">불러오는 중...</p>
      ) : (
        <>
          {tab === "balance" && <BalanceTab matches={matches} />}
          {tab === "players" && <PlayersTab players={players} />}
          {tab === "champions" && <ChampionsTab matches={matches} />}
        </>
      )}
    </div>
  );
}

function BalanceTab({ matches }: { matches: MatchDetail[] }) {
  const s = computeBalanceStats(matches);
  if (s.completedCount === 0) {
    return (
      <p className="text-sm text-text-dim">
        결과가 입력된 내전이 아직 없습니다. 히스토리에서 결과를 입력하면 밸런스
        품질이 분석됩니다.
      </p>
    );
  }
  // 팀 구성이 박빙이었는지 = 전력 우세팀 승률이 50%에 가까운 정도 (블루 승률 아님!)
  const balanceScore = 100 - Math.abs(s.favoredWinRate - 0.5) * 200;
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="완료된 내전" value={`${s.completedCount}판`} />
        <Stat
          label="평균 예측 전력차"
          value={Math.round(s.avgPredictedDiff).toString()}
          hint="작을수록 균형 있게 매칭"
        />
        <Stat
          label="전력 우세팀 승률"
          value={`${Math.round(s.favoredWinRate * 100)}%`}
          hint="50%에 가까울수록 박빙 (팀 공평)"
        />
        <Stat
          label="밸런스 점수"
          value={`${Math.round(balanceScore)}점`}
          hint="100에 가까울수록 박빙"
        />
      </div>
      <div className="rounded-lg border border-border bg-surface p-4 text-sm text-text-dim">
        <p className="mb-2 font-semibold text-text">해석 가이드</p>
        <ul className="list-inside list-disc space-y-1">
          <li>
            <span className="text-text">팀 구성이 공평한지</span>는{" "}
            <span className="text-text">전력 우세팀 승률</span>로 봅니다. 점수상
            강한 팀이 실제로도 이긴 비율인데,{" "}
            <span className="text-text">50%에 가까울수록</span> 강팀·약팀 구분이
            무의미할 만큼 박빙이었다는 뜻 = 밸런스가 좋음.
          </li>
          <li>
            <span className="text-text">평균 예측 전력차</span>가 작을수록
            알고리즘이 애초에 팀을 고르게 나눴다는 뜻입니다.
          </li>
          <li>
            참고 — <span className="text-text">블루 사이드 승률</span>:{" "}
            {Math.round(s.blueWinRate * 100)}%. 이건 팀 공평성이 아니라{" "}
            <span className="text-text">게임 내 진영(블루/레드) 유불리</span>를
            봅니다. 블루/레드는 무작위로 배정되므로, 이 값이 50%에서 많이 벗어나면
            진영 자체의 어드밴티지 신호예요 (팀 구성 문제 아님).
          </li>
        </ul>
      </div>
    </div>
  );
}

function PlayersTab({ players }: { players: Player[] }) {
  const stats = computePlayerStats(players);
  if (players.length === 0) {
    return <p className="text-sm text-text-dim">등록된 선수가 없습니다.</p>;
  }
  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead className="bg-surface-2 text-text-dim">
          <tr>
            <th className="px-3 py-2 text-left">#</th>
            <th className="px-3 py-2 text-left">선수</th>
            <th className="px-3 py-2 text-left">티어</th>
            <th className="px-3 py-2 text-right">MMR</th>
            <th className="px-3 py-2 text-center">전적</th>
            <th className="px-3 py-2 text-right">승률</th>
          </tr>
        </thead>
        <tbody>
          {stats.map((s, i) => (
            <tr
              key={s.player.id}
              className="border-t border-border bg-surface hover:bg-surface-2"
            >
              <td className="px-3 py-2 text-text-dim">{i + 1}</td>
              <td className="px-3 py-2 font-medium">{s.player.displayName}</td>
              <td className="px-3 py-2 text-text-dim">
                {tierDisplay(s.player.tier, s.player.division)}
              </td>
              <td className="px-3 py-2 text-right font-semibold text-gold-bright">
                {Math.round(effectiveScore(s.player))}
              </td>
              <td className="px-3 py-2 text-center text-text-dim">
                {s.games > 0 ? `${s.wins}승 ${s.losses}패` : "—"}
              </td>
              <td className="px-3 py-2 text-right">
                {s.games > 0 ? (
                  <span
                    className={
                      s.winRate >= 0.5 ? "text-emerald-600" : "text-rose-600"
                    }
                  >
                    {Math.round(s.winRate * 100)}%
                  </span>
                ) : (
                  <span className="text-text-dim">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ChampionsTab({ matches }: { matches: MatchDetail[] }) {
  const stats = computeChampionStats(matches);
  if (stats.length === 0) {
    return (
      <p className="text-sm text-text-dim">
        챔피언 데이터가 없습니다. 히스토리에서 결과 입력 시 각 선수가 픽한 챔프를
        적으면 집계됩니다.
      </p>
    );
  }
  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead className="bg-surface-2 text-text-dim">
          <tr>
            <th className="px-3 py-2 text-left">챔피언</th>
            <th className="px-3 py-2 text-center">픽</th>
            <th className="px-3 py-2 text-center">전적</th>
            <th className="px-3 py-2 text-right">승률</th>
          </tr>
        </thead>
        <tbody>
          {stats.map((c) => (
            <tr
              key={c.champion}
              className="border-t border-border bg-surface hover:bg-surface-2"
            >
              <td className="px-3 py-2 font-medium">{c.champion}</td>
              <td className="px-3 py-2 text-center text-text-dim">{c.picks}</td>
              <td className="px-3 py-2 text-center text-text-dim">
                {c.wins}승 {c.losses}패
              </td>
              <td className="px-3 py-2 text-right">
                <span
                  className={
                    c.winRate >= 0.5 ? "text-emerald-600" : "text-rose-600"
                  }
                >
                  {Math.round(c.winRate * 100)}%
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface px-4 py-3">
      <div className="text-xs text-text-dim">{label}</div>
      <div className="mt-0.5 text-2xl font-bold text-gold-bright">{value}</div>
      {hint && <div className="mt-0.5 text-[10px] text-text-dim">{hint}</div>}
    </div>
  );
}
