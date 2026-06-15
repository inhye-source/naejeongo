"use client";

import { useEffect, useState } from "react";
import {
  deleteMatch,
  fetchMatches,
  MatchDetail,
  MatchPlayerDetail,
  recordMatchResult,
} from "@/lib/db";
import { POSITION_LABEL, Position } from "@/lib/types";

const POSITION_ORDER: Position[] = ["TOP", "JUNGLE", "MID", "ADC", "SUPPORT"];

function sortByPos(list: MatchPlayerDetail[]) {
  return [...list].sort(
    (a, b) =>
      POSITION_ORDER.indexOf(a.position) - POSITION_ORDER.indexOf(b.position),
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function HistoryManager() {
  const [matches, setMatches] = useState<MatchDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      setMatches(await fetchMatches());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "불러오기 실패");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-bold text-balance-gradient">히스토리</h1>
        <p className="mt-1 text-sm text-text-dim">
          저장된 내전 목록입니다. 게임이 끝나면 승리 팀과 픽한 챔프를 입력하세요.
          입력 시 자체 MMR과 전적이 자동 갱신됩니다.
        </p>
      </section>

      {error && <p className="text-sm text-red-team">{error}</p>}

      {loading ? (
        <p className="text-sm text-text-dim">불러오는 중...</p>
      ) : matches.length === 0 ? (
        <p className="text-sm text-text-dim">
          아직 저장된 내전이 없습니다. 내전 만들기에서 조합을 저장하세요.
        </p>
      ) : (
        <div className="space-y-4">
          {matches.map((m) => (
            <MatchCard key={m.id} match={m} onChanged={load} />
          ))}
        </div>
      )}
    </div>
  );
}

function MatchCard({
  match,
  onChanged,
}: {
  match: MatchDetail;
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(match.status === "pending");
  const [winner, setWinner] = useState<"blue" | "red" | null>(match.winner);
  const [champions, setChampions] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      match.players.map((p) => [p.id, p.champion ?? ""]),
    ),
  );
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const blue = sortByPos(match.players.filter((p) => p.team === "blue"));
  const red = sortByPos(match.players.filter((p) => p.team === "red"));
  const completed = match.status === "completed";

  async function submit() {
    if (!winner) {
      setErr("승리 팀을 선택하세요.");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      await recordMatchResult(match.id, winner, champions);
      onChanged();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "저장 실패");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm("이 내전 기록을 삭제할까요?")) return;
    setBusy(true);
    try {
      await deleteMatch(match.id);
      onChanged();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "삭제 실패");
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-surface">
      {/* 헤더 */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-5 py-3 text-left"
      >
        <div className="flex items-center gap-3">
          <span className="text-sm text-text-dim">{formatDate(match.createdAt)}</span>
          {completed ? (
            <span
              className="rounded px-2 py-0.5 text-xs font-semibold"
              style={{
                color: `var(--color-${match.winner === "blue" ? "blue-team" : "red-team"})`,
                background:
                  match.winner === "blue"
                    ? "rgba(59,130,246,0.12)"
                    : "rgba(239,68,68,0.12)",
              }}
            >
              {match.winner === "blue" ? "블루팀 승" : "레드팀 승"}
            </span>
          ) : (
            <span className="rounded bg-amber-500/15 px-2 py-0.5 text-xs font-semibold text-amber-300">
              결과 대기중
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-text-dim">
          {match.predictedScoreDiff != null && (
            <span>예측 전력차 {Math.round(match.predictedScoreDiff)}</span>
          )}
          <span>{open ? "▲" : "▼"}</span>
        </div>
      </button>

      {open && (
        <div className="border-t border-border px-5 py-4">
          <div className="grid gap-4 md:grid-cols-2">
            <TeamPanel
              title="블루팀"
              side="blue"
              players={blue}
              champions={champions}
              setChampions={setChampions}
              editable={!completed}
              isWinner={completed && match.winner === "blue"}
            />
            <TeamPanel
              title="레드팀"
              side="red"
              players={red}
              champions={champions}
              setChampions={setChampions}
              editable={!completed}
              isWinner={completed && match.winner === "red"}
            />
          </div>

          {!completed && (
            <div className="mt-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-text-dim">승리 팀:</span>
                <button
                  onClick={() => setWinner("blue")}
                  className={`rounded-md border px-3 py-1.5 text-sm font-semibold transition-colors ${
                    winner === "blue"
                      ? "border-blue-team bg-blue-team/15 text-blue-team"
                      : "border-border text-text-dim hover:bg-surface-2"
                  }`}
                >
                  블루팀 승
                </button>
                <button
                  onClick={() => setWinner("red")}
                  className={`rounded-md border px-3 py-1.5 text-sm font-semibold transition-colors ${
                    winner === "red"
                      ? "border-red-team bg-red-team/15 text-red-team"
                      : "border-border text-text-dim hover:bg-surface-2"
                  }`}
                >
                  레드팀 승
                </button>
              </div>
              {err && <p className="text-sm text-red-team">{err}</p>}
              <div className="flex gap-2">
                <button
                  onClick={submit}
                  disabled={busy}
                  className="rounded-md bg-gold px-4 py-2 text-sm font-semibold text-bg transition-transform hover:enabled:scale-[1.02] active:enabled:scale-[0.98] disabled:opacity-40"
                >
                  결과 저장 (MMR 갱신)
                </button>
                <button
                  onClick={remove}
                  disabled={busy}
                  className="rounded-md border border-border px-4 py-2 text-sm text-text-dim transition-colors hover:bg-surface-2"
                >
                  내전 삭제
                </button>
              </div>
            </div>
          )}

          {completed && (
            <div className="mt-4">
              {err && <p className="mb-2 text-sm text-red-team">{err}</p>}
              <button
                onClick={remove}
                disabled={busy}
                className="text-xs text-text-dim hover:text-red-team hover:underline"
              >
                내전 기록 삭제
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TeamPanel({
  title,
  side,
  players,
  champions,
  setChampions,
  editable,
  isWinner,
}: {
  title: string;
  side: "blue" | "red";
  players: MatchPlayerDetail[];
  champions: Record<string, string>;
  setChampions: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  editable: boolean;
  isWinner: boolean;
}) {
  const color = side === "blue" ? "blue-team" : "red-team";
  return (
    <div className="rounded-lg border border-border bg-surface-2 p-3">
      <div className="mb-2 flex items-center gap-2">
        <h3 className="font-bold" style={{ color: `var(--color-${color})` }}>
          {title}
        </h3>
        {isWinner && <span className="text-xs text-gold">승리 👑</span>}
      </div>
      <ul className="space-y-1.5">
        {players.map((p) => (
          <li key={p.id} className="flex items-center gap-2">
            <span className="w-10 shrink-0 text-xs font-bold text-accent">
              {POSITION_LABEL[p.position]}
            </span>
            <span className="w-20 shrink-0 truncate text-sm">{p.displayName}</span>
            {editable ? (
              <input
                value={champions[p.id] ?? ""}
                onChange={(e) =>
                  setChampions((c) => ({ ...c, [p.id]: e.target.value }))
                }
                placeholder="픽한 챔프 (선택)"
                className="flex-1 rounded border border-border bg-surface px-2 py-1 text-xs text-text outline-none focus:border-gold"
              />
            ) : (
              <span className="flex-1 text-xs text-text-dim">
                {p.champion || "—"}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
