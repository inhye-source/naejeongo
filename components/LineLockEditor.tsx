"use client";

import { Player, Position, POSITIONS, POSITION_LABEL } from "@/lib/types";

export default function LineLockEditor({
  selectedPlayers,
  positionLocks,
  onChange,
}: {
  selectedPlayers: Player[];
  positionLocks: Record<string, Position>;
  onChange: (locks: Record<string, Position>) => void;
}) {
  if (selectedPlayers.length === 0) return null;

  function setLock(id: string, pos: Position | "") {
    const next = { ...positionLocks };
    if (pos === "") delete next[id];
    else next[id] = pos;
    onChange(next);
  }

  // 같은 포지션에 3명 이상 고정되면 불가능 (한 라인은 팀당 1명 = 최대 2명)
  const counts: Partial<Record<Position, number>> = {};
  for (const pos of Object.values(positionLocks)) {
    counts[pos] = (counts[pos] ?? 0) + 1;
  }
  const overLocked = POSITIONS.filter((p) => (counts[p] ?? 0) > 2);

  const lockedCount = Object.keys(positionLocks).length;

  return (
    <details className="rounded-xl border border-border bg-surface p-4">
      <summary className="cursor-pointer text-sm font-semibold text-gold-bright">
        📍 라인 고정 (선택)
        <span className="ml-2 font-normal text-text-dim">
          특정 선수를 특정 라인에 고정해서 팀을 짭니다
        </span>
        {lockedCount > 0 && (
          <span className="ml-2 rounded bg-gold/15 px-1.5 py-0.5 text-[10px] font-bold text-gold">
            {lockedCount}명 고정
          </span>
        )}
      </summary>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {selectedPlayers.map((p) => (
          <div
            key={p.id}
            className="flex items-center gap-2 rounded-lg bg-surface-2 px-3 py-1.5"
          >
            <span className="flex-1 truncate text-sm">{p.displayName}</span>
            <select
              value={positionLocks[p.id] ?? ""}
              onChange={(e) => setLock(p.id, e.target.value as Position | "")}
              className={`rounded border bg-surface px-2 py-1 text-xs outline-none focus:border-gold ${
                positionLocks[p.id]
                  ? "border-gold text-gold-bright"
                  : "border-border text-text-dim"
              }`}
            >
              <option value="">자동</option>
              {POSITIONS.map((pos) => (
                <option key={pos} value={pos}>
                  {POSITION_LABEL[pos]} 고정
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      {overLocked.length > 0 && (
        <p className="mt-3 text-xs text-red-team">
          ⚠️ {overLocked.map((p) => POSITION_LABEL[p]).join(", ")} 라인에 3명 이상
          고정됐습니다. 한 라인은 최대 2명(팀당 1명)까지만 가능해 밸런스가 안 만들어질
          수 있어요.
        </p>
      )}
      <p className="mt-3 text-[11px] text-text-dim">
        💡 고정한 선수는 어느 팀에 가든 지정한 라인을 맡습니다. 같은 라인은 양 팀에
        1명씩 최대 2명까지 고정할 수 있어요.
      </p>
    </details>
  );
}
