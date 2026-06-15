"use client";

import { useEffect, useRef, useState } from "react";
import { matchRoster, RosterSlot } from "@/lib/match";
import { Player } from "@/lib/types";
import { tierDisplay } from "@/lib/tier";

export default function RosterImport({
  players,
  onApply,
}: {
  players: Player[];
  onApply: (playerIds: string[]) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slots, setSlots] = useState<RosterSlot[] | null>(null);
  const [dragOver, setDragOver] = useState(false);

  // 클립보드 붙여넣기(Ctrl+V) 지원 — 최신 handleFile을 ref로 참조
  const handleFileRef = useRef<(file: File) => void>(() => {});

  function readAsBase64(file: File): Promise<{ base64: string; mediaType: string }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = String(reader.result);
        const base64 = result.split(",")[1] ?? "";
        resolve({ base64, mediaType: file.type });
      };
      reader.onerror = () => reject(new Error("파일을 읽지 못했습니다."));
      reader.readAsDataURL(file);
    });
  }

  async function handleFile(file: File) {
    setError(null);
    setSlots(null);
    setLoading(true);
    try {
      const { base64, mediaType } = await readAsBase64(file);
      const res = await fetch("/api/extract-roster", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, mediaType }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "분석 실패");
      const names: string[] = data.players ?? [];
      if (names.length === 0) {
        setError("스크린샷에서 소환사명을 찾지 못했습니다. 다른 이미지를 시도해보세요.");
        return;
      }
      setSlots(matchRoster(names, players));
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  handleFileRef.current = handleFile;

  // 페이지 어디서든 Ctrl+V로 이미지 붙여넣기
  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            handleFileRef.current(file);
            break;
          }
        }
      }
    }
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) handleFile(file);
  }

  function updateSlot(index: number, playerId: string | null) {
    setSlots((prev) =>
      prev
        ? prev.map((s, i) => (i === index ? { ...s, matchedPlayerId: playerId } : s))
        : prev,
    );
  }

  const assignedIds = slots
    ? Array.from(new Set(slots.map((s) => s.matchedPlayerId).filter((x): x is string => !!x)))
    : [];

  function apply() {
    if (assignedIds.length === 0) return;
    onApply(assignedIds.slice(0, 10));
    setSlots(null);
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
      className={`rounded-xl border border-dashed bg-surface p-4 transition-colors ${
        dragOver ? "border-gold bg-gold/5" : "border-border"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-semibold">📷 스크린샷으로 자동 구성</h3>
          <p className="text-xs text-text-dim">
            LoL 대기실 스크린샷을 올리면 소환사명을 인식해 참가자를 자동으로
            채웁니다. <span className="text-gold">Ctrl+V 붙여넣기</span> 또는
            드래그&드롭도 가능합니다.
          </p>
        </div>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={loading}
          className="rounded-md border border-border px-3 py-1.5 text-sm text-text-dim transition-colors hover:bg-surface-2 hover:text-text disabled:opacity-40"
        >
          {loading ? "분석 중..." : "이미지 선택"}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.target.value = "";
          }}
        />
      </div>

      {error && <p className="mt-3 text-sm text-red-team">{error}</p>}

      {slots && (
        <div className="mt-4 space-y-2">
          <p className="text-xs text-text-dim">
            인식된 {slots.length}명 · 매칭 {assignedIds.length}명. 안 맞는 이름은
            직접 선택하세요.
          </p>
          <ul className="space-y-1.5">
            {slots.map((slot, i) => (
              <li key={i} className="flex items-center gap-2">
                <span className="w-32 shrink-0 truncate text-sm" title={slot.extractedName}>
                  {slot.extractedName}
                </span>
                <span className="text-text-dim">→</span>
                <select
                  value={slot.matchedPlayerId ?? ""}
                  onChange={(e) => updateSlot(i, e.target.value || null)}
                  className={`flex-1 rounded border bg-surface-2 px-2 py-1 text-sm outline-none focus:border-gold ${
                    slot.matchedPlayerId ? "border-border text-text" : "border-rose-500/40 text-text-dim"
                  }`}
                >
                  <option value="">— 선택 안 함 —</option>
                  {players.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.displayName} ({tierDisplay(p.tier, p.division)})
                    </option>
                  ))}
                </select>
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={apply}
              disabled={assignedIds.length === 0}
              className="rounded-md bg-gold px-4 py-1.5 text-sm font-semibold text-bg transition-transform hover:enabled:scale-[1.02] active:enabled:scale-[0.98] disabled:opacity-40"
            >
              이 선수들로 채우기 ({assignedIds.length}명)
            </button>
            <button
              onClick={() => setSlots(null)}
              className="rounded-md border border-border px-3 py-1.5 text-sm text-text-dim transition-colors hover:bg-surface-2"
            >
              취소
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
