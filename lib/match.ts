import { Player } from "./types";

// 매칭용 정규화: 공백 제거 + 소문자
function normalize(s: string): string {
  return s.replace(/\s+/g, "").toLowerCase();
}

// 선수의 매칭 후보 문자열들 (표시이름 + Riot ID의 게임이름 부분)
function candidates(p: Player): string[] {
  const list = [p.displayName];
  if (p.riotId) {
    list.push(p.riotId.split("#")[0]); // 태그 앞부분
    list.push(p.riotId);
  }
  return list.map(normalize).filter(Boolean);
}

export interface RosterSlot {
  extractedName: string;
  matchedPlayerId: string | null;
}

// 추출된 이름 목록을 등록 선수와 매칭 (선수 중복 배정 방지)
export function matchRoster(names: string[], players: Player[]): RosterSlot[] {
  const used = new Set<string>();
  const slots: RosterSlot[] = names.map((n) => ({
    extractedName: n,
    matchedPlayerId: null,
  }));

  const cand = players.map((p) => ({ player: p, keys: candidates(p) }));

  // 1차: 정확히 일치
  slots.forEach((slot) => {
    const target = normalize(slot.extractedName);
    const hit = cand.find(
      (c) => !used.has(c.player.id) && c.keys.includes(target),
    );
    if (hit) {
      slot.matchedPlayerId = hit.player.id;
      used.add(hit.player.id);
    }
  });

  // 2차: 부분 포함 (2글자 이상)
  slots.forEach((slot) => {
    if (slot.matchedPlayerId) return;
    const target = normalize(slot.extractedName);
    if (target.length < 2) return;
    const hit = cand.find(
      (c) =>
        !used.has(c.player.id) &&
        c.keys.some((k) => k.includes(target) || target.includes(k)),
    );
    if (hit) {
      slot.matchedPlayerId = hit.player.id;
      used.add(hit.player.id);
    }
  });

  return slots;
}
