"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { fetchPlayers, createMatch } from "@/lib/db";
import { balanceTeams } from "@/lib/balance";
import { effectiveScore, tierDisplay } from "@/lib/tier";
import { BalanceResult, POSITION_LABEL, Player, Position } from "@/lib/types";
import BalanceResultView from "@/components/BalanceResultView";
import ShareButtons from "@/components/ShareButtons";
import RosterImport from "@/components/RosterImport";
import TierScoreTable from "@/components/TierScoreTable";
import LockGroupsEditor from "@/components/LockGroupsEditor";
import LineLockEditor from "@/components/LineLockEditor";

export default function Home() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [results, setResults] = useState<BalanceResult[] | null>(null);
  const [altIndex, setAltIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [lockGroups, setLockGroups] = useState<string[][]>([]);
  const [positionLocks, setPositionLocks] = useState<Record<string, Position>>({});
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchPlayers()
      .then(setPlayers)
      .catch((e) => setError(e instanceof Error ? e.message : "선수 로드 실패"))
      .finally(() => setLoading(false));
  }, []);

  // 선택이 바뀌면 고정 그룹에서 빠진 선수를 정리
  useEffect(() => {
    setLockGroups((prev) => {
      const pruned = prev
        .map((g) => g.filter((id) => selected.has(id)))
        .filter((g) => g.length >= 2);
      return JSON.stringify(pruned) === JSON.stringify(prev) ? prev : pruned;
    });
    // 라인 고정도 빠진 선수 정리
    setPositionLocks((prev) => {
      const next: Record<string, Position> = {};
      for (const [id, pos] of Object.entries(prev)) {
        if (selected.has(id)) next[id] = pos;
      }
      return JSON.stringify(next) === JSON.stringify(prev) ? prev : next;
    });
  }, [selected]);

  const selectedCount = selected.size;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else {
        if (next.size >= 10) return prev;
        next.add(id);
      }
      return next;
    });
    setResults(null);
    setSaved(null);
  }

  function generate() {
    setError(null);
    setSaved(null);
    const chosen = players.filter((p) => selected.has(p.id));
    if (chosen.length !== 10) {
      setError("정확히 10명을 선택해야 합니다.");
      return;
    }
    try {
      setResults(balanceTeams(chosen, lockGroups, positionLocks));
      setAltIndex(0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "밸런싱 오류");
    }
  }

  function reset() {
    setSelected(new Set());
    setResults(null);
    setError(null);
    setSaved(null);
    setLockGroups([]);
    setPositionLocks({});
  }

  function applyRoster(ids: string[]) {
    setSelected(new Set(ids.slice(0, 10)));
    setResults(null);
    setSaved(null);
    setError(null);
  }

  async function saveMatch() {
    if (!current) return;
    setBusy(true);
    setError(null);
    try {
      const id = await createMatch(current);
      setSaved(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "내전 저장 실패");
    } finally {
      setBusy(false);
    }
  }

  const current = results?.[altIndex] ?? null;
  const altCount = results ? Math.min(results.length, 10) : 0;

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-2xl font-bold text-balance-gradient">내전 만들기</h1>
        <p className="mt-1 text-sm text-text-dim">
          참가자 10명을 선택하면 티어·포지션·챔프 폭을 고려해 가장 균형 잡힌 5:5
          조합을 찾아드립니다.
        </p>
      </section>

      <TierScoreTable />

      {loading ? (
        <p className="text-sm text-text-dim">선수 목록을 불러오는 중...</p>
      ) : players.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-6 text-center">
          <p className="text-sm text-text-dim">
            등록된 선수가 없습니다. 먼저{" "}
            <Link href="/players" className="text-gold hover:underline">
              선수 관리
            </Link>
            에서 참가자를 등록하세요.
          </p>
        </div>
      ) : (
        <>
          <RosterImport players={players} onApply={applyRoster} />

          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                참가자 선택{" "}
                <span
                  className={`ml-1 text-sm ${
                    selectedCount === 10 ? "text-accent" : "text-text-dim"
                  }`}
                >
                  {selectedCount} / 10
                </span>
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={reset}
                  className="rounded-md border border-border px-3 py-1.5 text-sm text-text-dim transition-colors hover:bg-surface-2 hover:text-text"
                >
                  초기화
                </button>
                <button
                  onClick={generate}
                  disabled={selectedCount !== 10}
                  className="rounded-md bg-gold px-4 py-1.5 text-sm font-semibold text-bg transition-transform hover:enabled:scale-[1.02] active:enabled:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  밸런스 생성
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {players.map((p) => (
                <PlayerChip
                  key={p.id}
                  player={p}
                  selected={selected.has(p.id)}
                  disabled={!selected.has(p.id) && selectedCount >= 10}
                  onToggle={() => toggle(p.id)}
                />
              ))}
            </div>

            <div className="mt-4 space-y-3">
              <LineLockEditor
                selectedPlayers={players.filter((p) => selected.has(p.id))}
                positionLocks={positionLocks}
                onChange={setPositionLocks}
              />
              <LockGroupsEditor
                selectedPlayers={players.filter((p) => selected.has(p.id))}
                groups={lockGroups}
                onChange={setLockGroups}
              />
            </div>

            {error && <p className="mt-3 text-sm text-red-team">{error}</p>}
          </section>

          {current && results && (
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-semibold">밸런스 결과</h2>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-text-dim">
                    조합 {altIndex + 1} / {altCount}
                  </span>
                  <button
                    onClick={() => setAltIndex((i) => Math.max(0, i - 1))}
                    disabled={altIndex === 0}
                    className="rounded-md border border-border px-2 py-1 text-sm text-text-dim transition-colors hover:enabled:bg-surface-2 disabled:opacity-30"
                  >
                    ◀
                  </button>
                  <button
                    onClick={() =>
                      setAltIndex((i) => Math.min(altCount - 1, i + 1))
                    }
                    disabled={altIndex >= altCount - 1}
                    className="rounded-md border border-border px-2 py-1 text-sm text-text-dim transition-colors hover:enabled:bg-surface-2 disabled:opacity-30"
                  >
                    ▶
                  </button>
                </div>
              </div>
              <div ref={resultRef}>
                <BalanceResultView result={current} />
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  onClick={saveMatch}
                  disabled={busy || saved !== null}
                  className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-bg transition-transform hover:enabled:scale-[1.02] active:enabled:scale-[0.98] disabled:opacity-40"
                >
                  {saved ? "저장됨 ✓" : "이 조합으로 내전 저장"}
                </button>
                <ShareButtons result={current} captureRef={resultRef} />
                {saved && (
                  <span className="text-sm text-text-dim">
                    히스토리에 저장되었습니다. 게임 후{" "}
                    <Link href="/history" className="text-gold hover:underline">
                      히스토리
                    </Link>
                    에서 결과를 입력하세요.
                  </span>
                )}
              </div>
              <p className="mt-3 text-xs text-text-dim">
                ▶ 버튼으로 차선 조합들을 비교할 수 있습니다. (전력 차이가 작은
                순서대로 정렬)
              </p>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function PlayerChip({
  player,
  selected,
  disabled,
  onToggle,
}: {
  player: Player;
  selected: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      className={`flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-gold ${
        selected
          ? "border-gold bg-gold/10"
          : "border-border bg-surface hover:enabled:border-text-dim hover:enabled:bg-surface-2"
      } ${disabled ? "cursor-not-allowed opacity-40" : ""}`}
    >
      <div className="flex w-full items-center justify-between">
        <span className="truncate font-semibold">{player.displayName}</span>
        {selected && <span className="text-xs text-gold">✓</span>}
      </div>
      <span className="text-xs text-text-dim">
        {tierDisplay(player.tier, player.division)} ·{" "}
        {Math.round(effectiveScore(player))}점
      </span>
      <span className="text-[10px] text-text-dim">
        {player.preferredPositions.map((p) => POSITION_LABEL[p]).join("/")}
      </span>
    </button>
  );
}
