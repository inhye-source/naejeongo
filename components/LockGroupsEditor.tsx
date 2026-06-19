"use client";

import { useState } from "react";
import { Player } from "@/lib/types";

export default function LockGroupsEditor({
  selectedPlayers,
  groups,
  onChange,
}: {
  selectedPlayers: Player[];
  groups: string[][];
  onChange: (groups: string[][]) => void;
}) {
  const [picking, setPicking] = useState<Set<string>>(new Set());

  const nameOf = (id: string) =>
    selectedPlayers.find((p) => p.id === id)?.displayName ?? "?";

  const groupedIds = new Set(groups.flat());
  const ungrouped = selectedPlayers.filter((p) => !groupedIds.has(p.id));

  function togglePick(id: string) {
    setPicking((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function addGroup() {
    const ids = [...picking];
    if (ids.length < 2) return;
    onChange([...groups, ids]);
    setPicking(new Set());
  }

  function removeGroup(i: number) {
    onChange(groups.filter((_, idx) => idx !== i));
  }

  function removeMember(groupIdx: number, id: string) {
    const next = groups
      .map((g, idx) => (idx === groupIdx ? g.filter((x) => x !== id) : g))
      .filter((g) => g.length >= 2); // 1명만 남으면 그룹 해제
    onChange(next);
  }

  if (selectedPlayers.length < 2) return null;

  return (
    <details className="rounded-xl border border-border bg-surface p-4">
      <summary className="cursor-pointer text-sm font-semibold text-gold-bright">
        🔗 같은 팀 고정 (선택)
        <span className="ml-2 font-normal text-text-dim">
          항상 한 팀에 묶을 인원을 지정합니다
        </span>
        {groups.length > 0 && (
          <span className="ml-2 rounded bg-gold/15 px-1.5 py-0.5 text-[10px] font-bold text-gold">
            {groups.length}개 그룹
          </span>
        )}
      </summary>

      {/* 기존 그룹 목록 */}
      {groups.length > 0 && (
        <div className="mt-3 space-y-2">
          {groups.map((g, i) => (
            <div
              key={i}
              className="flex flex-wrap items-center gap-2 rounded-lg bg-surface-2 px-3 py-2"
            >
              <span className="text-xs font-bold text-gold">그룹 {i + 1}</span>
              {g.map((id) => (
                <span
                  key={id}
                  className="flex items-center gap-1 rounded bg-gold/10 px-2 py-0.5 text-xs text-gold-bright"
                >
                  {nameOf(id)}
                  <button
                    onClick={() => removeMember(i, id)}
                    className="text-text-dim hover:text-red-team"
                    title="그룹에서 제외"
                  >
                    ×
                  </button>
                </span>
              ))}
              <button
                onClick={() => removeGroup(i)}
                className="ml-auto text-xs text-text-dim hover:text-red-team hover:underline"
              >
                그룹 해제
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 새 그룹 만들기 */}
      <div className="mt-3">
        {ungrouped.length < 2 ? (
          <p className="text-xs text-text-dim">
            묶을 수 있는 선수가 없습니다. (참가자를 더 선택하세요)
          </p>
        ) : (
          <>
            <p className="mb-2 text-xs text-text-dim">
              같은 팀에 묶을 선수를 2명 이상 선택하세요:
            </p>
            <div className="flex flex-wrap gap-2">
              {ungrouped.map((p) => {
                const on = picking.has(p.id);
                return (
                  <button
                    key={p.id}
                    onClick={() => togglePick(p.id)}
                    className={`rounded-md border px-2.5 py-1 text-xs transition-colors ${
                      on
                        ? "border-gold bg-gold/10 text-gold-bright"
                        : "border-border text-text-dim hover:bg-surface-2"
                    }`}
                  >
                    {p.displayName}
                  </button>
                );
              })}
            </div>
            <button
              onClick={addGroup}
              disabled={picking.size < 2}
              className="mt-3 rounded-md bg-gold px-3 py-1.5 text-xs font-semibold text-white transition-transform hover:enabled:scale-[1.02] active:enabled:scale-[0.98] disabled:opacity-40"
            >
              선택한 {picking.size}명 같은 팀으로 묶기
            </button>
          </>
        )}
      </div>
      <p className="mt-3 text-[11px] text-text-dim">
        💡 한 그룹은 최대 5명까지 가능합니다. 묶인 인원은 밸런스 생성 시 반드시
        같은 팀에 배치됩니다.
      </p>
    </details>
  );
}
