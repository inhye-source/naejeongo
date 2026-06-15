"use client";

import { RefObject, useState } from "react";
import { toPng } from "html-to-image";
import { buildShareText } from "@/lib/share";
import { BalanceResult } from "@/lib/types";

type Status = "idle" | "ok" | "err";

export default function ShareButtons({
  result,
  captureRef,
}: {
  result: BalanceResult;
  captureRef: RefObject<HTMLDivElement | null>;
}) {
  const [textState, setTextState] = useState<Status>("idle");
  const [imgState, setImgState] = useState<Status>("idle");
  const [busy, setBusy] = useState(false);

  function flash(set: (s: Status) => void, s: Status) {
    set(s);
    setTimeout(() => set("idle"), 2000);
  }

  async function copyText() {
    try {
      await navigator.clipboard.writeText(buildShareText(result));
      flash(setTextState, "ok");
    } catch {
      flash(setTextState, "err");
    }
  }

  async function copyImage() {
    if (!captureRef.current) return;
    setBusy(true);
    try {
      const dataUrl = await toPng(captureRef.current, {
        pixelRatio: 2,
        backgroundColor: "#0a0e14",
      });
      const blob = await (await fetch(dataUrl)).blob();
      // 클립보드 이미지 복사 시도 → 미지원 시 다운로드 폴백
      try {
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": blob }),
        ]);
        flash(setImgState, "ok");
      } catch {
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = "내전고_밸런스.png";
        a.click();
        flash(setImgState, "ok");
      }
    } catch {
      flash(setImgState, "err");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        onClick={copyText}
        className="rounded-md border border-border px-3 py-1.5 text-sm text-text-dim transition-colors hover:bg-surface-2 hover:text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
      >
        {textState === "ok"
          ? "복사됨 ✓"
          : textState === "err"
            ? "복사 실패"
            : "📋 텍스트 복사"}
      </button>
      <button
        onClick={copyImage}
        disabled={busy}
        className="rounded-md border border-border px-3 py-1.5 text-sm text-text-dim transition-colors hover:bg-surface-2 hover:text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-gold disabled:opacity-40"
      >
        {busy
          ? "생성 중..."
          : imgState === "ok"
            ? "이미지 저장됨 ✓"
            : imgState === "err"
              ? "이미지 실패"
              : "🖼️ 이미지로 복사/저장"}
      </button>
    </div>
  );
}
