"use client";

import { useEffect, useState } from "react";
import {
  createPlayer,
  deletePlayer,
  fetchPlayers,
  PlayerInput,
  updatePlayer,
} from "@/lib/db";
import { SAMPLE_PLAYERS } from "@/lib/sampleData";
import {
  DIVISION_ORDER,
  hasDivision,
  TIER_LABEL,
  TIER_ORDER,
  tierDisplay,
  tierScore,
} from "@/lib/tier";
import {
  Division,
  Player,
  POSITION_LABEL,
  POSITIONS,
  Position,
  Tier,
} from "@/lib/types";

const EMPTY_FORM: PlayerInput = {
  displayName: "",
  riotId: "",
  tier: "GOLD",
  division: "IV",
  preferredPositions: [],
  championPoolSize: 3,
  manualAdjustment: 0,
};

export default function PlayersManager() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<PlayerInput>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setPlayers(await fetchPlayers());
    } catch (e) {
      setError(msg(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function resetForm() {
    setForm(EMPTY_FORM);
    setEditingId(null);
  }

  function startEdit(p: Player) {
    setEditingId(p.id);
    setForm({
      displayName: p.displayName,
      riotId: p.riotId ?? "",
      tier: p.tier,
      division: p.division,
      preferredPositions: p.preferredPositions,
      championPoolSize: p.championPoolSize,
      manualAdjustment: p.manualAdjustment,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function save() {
    if (!form.displayName.trim()) {
      setError("이름을 입력하세요.");
      return;
    }
    if (form.preferredPositions.length === 0) {
      setError("주 포지션을 1개 이상 선택하세요.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const payload: PlayerInput = {
        ...form,
        division: hasDivision(form.tier) ? form.division : "I",
      };
      if (editingId) {
        await updatePlayer(editingId, payload);
      } else {
        await createPlayer(payload);
      }
      resetForm();
      await load();
    } catch (e) {
      setError(msg(e));
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("이 선수를 삭제할까요? 관련 내전 기록도 함께 삭제됩니다.")) return;
    setBusy(true);
    try {
      await deletePlayer(id);
      if (editingId === id) resetForm();
      await load();
    } catch (e) {
      setError(msg(e));
    } finally {
      setBusy(false);
    }
  }

  async function seedSamples() {
    if (!confirm("샘플 선수 14명을 추가할까요?")) return;
    setBusy(true);
    setError(null);
    try {
      for (const p of SAMPLE_PLAYERS) {
        await createPlayer({
          displayName: p.displayName,
          riotId: p.riotId,
          tier: p.tier,
          division: p.division,
          preferredPositions: p.preferredPositions,
          championPoolSize: p.championPoolSize,
          manualAdjustment: p.manualAdjustment,
        });
      }
      await load();
    } catch (e) {
      setError(msg(e));
    } finally {
      setBusy(false);
    }
  }

  function togglePosition(pos: Position) {
    setForm((f) => {
      const list = [...f.preferredPositions];
      const idx = list.indexOf(pos);
      if (idx >= 0) list.splice(idx, 1);
      else list.push(pos);
      return { ...f, preferredPositions: list };
    });
  }

  return (
    <div className="space-y-8">
      <section>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-balance-gradient">선수 관리</h1>
          {players.length === 0 && !loading && (
            <button
              onClick={seedSamples}
              disabled={busy}
              className="rounded-md border border-border px-3 py-1.5 text-sm text-text-dim transition-colors hover:bg-surface-2 hover:text-text disabled:opacity-40"
            >
              샘플 선수 14명 불러오기
            </button>
          )}
        </div>
        <p className="mt-1 text-sm text-text-dim">
          내전 참가자를 등록하세요. 티어·주 포지션·챔프 폭이 밸런싱에 사용됩니다.
        </p>
      </section>

      {/* 등록/수정 폼 */}
      <section className="rounded-xl border border-border bg-surface p-5">
        <h2 className="mb-4 text-lg font-semibold">
          {editingId ? "선수 수정" : "선수 등록"}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="이름 *">
            <input
              value={form.displayName}
              onChange={(e) => setForm({ ...form, displayName: e.target.value })}
              placeholder="표시 이름"
              className="input"
            />
          </Field>
          <Field label="Riot ID (선택)">
            <input
              value={form.riotId ?? ""}
              onChange={(e) => setForm({ ...form, riotId: e.target.value })}
              placeholder="게임이름#KR1"
              className="input"
            />
          </Field>

          <Field label="티어">
            <select
              value={form.tier}
              onChange={(e) =>
                setForm({ ...form, tier: e.target.value as Tier })
              }
              className="input"
            >
              {TIER_ORDER.map((t) => (
                <option key={t} value={t}>
                  {TIER_LABEL[t]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="디비전">
            <select
              value={form.division}
              onChange={(e) =>
                setForm({ ...form, division: e.target.value as Division })
              }
              disabled={!hasDivision(form.tier)}
              className="input disabled:opacity-40"
            >
              {DIVISION_ORDER.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </Field>

          <Field label="주 포지션 * (선호 순서대로 클릭)">
            <div className="flex flex-wrap gap-2">
              {POSITIONS.map((pos) => {
                const rank = form.preferredPositions.indexOf(pos);
                const active = rank >= 0;
                return (
                  <button
                    key={pos}
                    type="button"
                    onClick={() => togglePosition(pos)}
                    className={`relative rounded-md border px-3 py-1.5 text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gold ${
                      active
                        ? "border-gold bg-gold/10 text-gold-bright"
                        : "border-border text-text-dim hover:bg-surface-2"
                    }`}
                  >
                    {POSITION_LABEL[pos]}
                    {active && (
                      <span className="ml-1 text-xs text-gold">{rank + 1}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </Field>

          <Field label={`수동 보정: ${form.manualAdjustment > 0 ? "+" : ""}${form.manualAdjustment}점`}>
            <input
              type="range"
              min={-500}
              max={500}
              step={50}
              value={form.manualAdjustment}
              onChange={(e) =>
                setForm({ ...form, manualAdjustment: Number(e.target.value) })
              }
              className="w-full accent-[var(--gold)]"
            />
          </Field>

          <div className="flex items-end gap-2">
            <button
              onClick={save}
              disabled={busy}
              className="rounded-md bg-gold px-4 py-2 text-sm font-semibold text-bg transition-transform hover:enabled:scale-[1.02] active:enabled:scale-[0.98] disabled:opacity-40"
            >
              {editingId ? "수정 저장" : "등록"}
            </button>
            {editingId && (
              <button
                onClick={resetForm}
                disabled={busy}
                className="rounded-md border border-border px-4 py-2 text-sm text-text-dim transition-colors hover:bg-surface-2"
              >
                취소
              </button>
            )}
          </div>
        </div>
        <p className="mt-3 text-xs text-text-dim">
          예상 실력 점수:{" "}
          <span className="font-semibold text-gold-bright">
            {tierScore(
              form.tier,
              hasDivision(form.tier) ? form.division : "I",
            ) + form.manualAdjustment}
            점
          </span>{" "}
          ({tierDisplay(form.tier, hasDivision(form.tier) ? form.division : "I")})
        </p>
      </section>

      {error && <p className="text-sm text-red-team">{error}</p>}

      {/* 선수 목록 */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">
          등록된 선수{" "}
          <span className="text-sm text-text-dim">({players.length}명)</span>
        </h2>
        {loading ? (
          <p className="text-sm text-text-dim">불러오는 중...</p>
        ) : players.length === 0 ? (
          <p className="text-sm text-text-dim">
            아직 등록된 선수가 없습니다. 위에서 등록하거나 샘플을 불러오세요.
          </p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-surface-2 text-text-dim">
                <tr>
                  <th className="px-3 py-2 text-left">이름</th>
                  <th className="px-3 py-2 text-left">티어</th>
                  <th className="hidden px-3 py-2 text-left sm:table-cell">
                    주 포지션
                  </th>
                  <th className="px-3 py-2 text-center">전적</th>
                  <th className="px-3 py-2 text-right">관리</th>
                </tr>
              </thead>
              <tbody>
                {players.map((p) => (
                  <tr
                    key={p.id}
                    className="border-t border-border bg-surface hover:bg-surface-2"
                  >
                    <td className="px-3 py-2 font-medium">{p.displayName}</td>
                    <td className="px-3 py-2 text-text-dim">
                      {tierDisplay(p.tier, p.division)}
                    </td>
                    <td className="hidden px-3 py-2 text-text-dim sm:table-cell">
                      {p.preferredPositions
                        .map((x) => POSITION_LABEL[x])
                        .join("/")}
                    </td>
                    <td className="px-3 py-2 text-center text-text-dim">
                      {p.wins}승 {p.losses}패
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        onClick={() => startEdit(p)}
                        className="mr-2 text-accent hover:underline"
                      >
                        수정
                      </button>
                      <button
                        onClick={() => remove(p.id)}
                        className="text-red-team hover:underline"
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-text-dim">
        {label}
      </span>
      {children}
    </label>
  );
}

function msg(e: unknown): string {
  return e instanceof Error ? e.message : "오류가 발생했습니다.";
}
