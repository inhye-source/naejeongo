import { getSupabase } from "./supabase";
import { computeMmrChanges } from "./elo";
import { effectiveScore, seedMmr } from "./tier";
import { BalanceResult, Division, Player, Position, Tier } from "./types";

// ── DB row ↔ Player 매핑 ─────────────────────────────
interface PlayerRow {
  id: string;
  riot_id: string | null;
  display_name: string;
  tier: string;
  division: string;
  preferred_positions: string[];
  champion_pool_size: number;
  internal_mmr: number | null;
  manual_adjustment: number;
  wins: number;
  losses: number;
}

function rowToPlayer(r: PlayerRow): Player {
  return {
    id: r.id,
    riotId: r.riot_id ?? undefined,
    displayName: r.display_name,
    tier: r.tier as Tier,
    division: r.division as Division,
    preferredPositions: (r.preferred_positions ?? []) as Position[],
    championPoolSize: r.champion_pool_size,
    internalMmr: r.internal_mmr ?? undefined,
    manualAdjustment: r.manual_adjustment,
    wins: r.wins,
    losses: r.losses,
  };
}

export type PlayerInput = Omit<Player, "id" | "wins" | "losses" | "internalMmr"> & {
  internalMmr?: number;
};

function playerToRow(p: PlayerInput) {
  return {
    riot_id: p.riotId ?? null,
    display_name: p.displayName,
    tier: p.tier,
    division: p.division,
    preferred_positions: p.preferredPositions,
    champion_pool_size: p.championPoolSize,
    // 자체 MMR 미지정 시 티어점수로 시드
    internal_mmr: p.internalMmr ?? seedMmr(p),
    manual_adjustment: p.manualAdjustment,
  };
}

// ── 선수 CRUD ────────────────────────────────────────
export async function fetchPlayers(): Promise<Player[]> {
  const { data, error } = await getSupabase()
    .from("players")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data as PlayerRow[]).map(rowToPlayer);
}

export async function createPlayer(input: PlayerInput): Promise<Player> {
  const { data, error } = await getSupabase()
    .from("players")
    .insert(playerToRow(input))
    .select()
    .single();
  if (error) throw error;
  return rowToPlayer(data as PlayerRow);
}

export async function updatePlayer(
  id: string,
  input: PlayerInput,
): Promise<Player> {
  const { data, error } = await getSupabase()
    .from("players")
    .update(playerToRow(input))
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return rowToPlayer(data as PlayerRow);
}

export async function deletePlayer(id: string): Promise<void> {
  const { error } = await getSupabase().from("players").delete().eq("id", id);
  if (error) throw error;
}

// ── 매치(내전) 저장 ──────────────────────────────────
// 밸런스 결과를 내전으로 저장한다. (status='pending', 결과는 추후 입력)
export async function createMatch(result: BalanceResult): Promise<string> {
  const sb = getSupabase();
  const { data: match, error: matchErr } = await sb
    .from("matches")
    .insert({
      status: "pending",
      predicted_score_diff: result.scoreDiff,
      position_fit: result.positionFit,
    })
    .select()
    .single();
  if (matchErr) throw matchErr;

  const matchId = (match as { id: string }).id;

  const rows = [
    ...result.blue.assignments.map((a) => ({ side: "blue" as const, a })),
    ...result.red.assignments.map((a) => ({ side: "red" as const, a })),
  ].map(({ side, a }) => ({
    match_id: matchId,
    player_id: a.player.id,
    team: side,
    position: a.position,
    score_at_match: effectiveScore(a.player),
  }));

  const { error: mpErr } = await sb.from("match_players").insert(rows);
  if (mpErr) throw mpErr;

  return matchId;
}

// ── 매치 조회 ────────────────────────────────────────
export interface MatchPlayerDetail {
  id: string;
  playerId: string;
  displayName: string;
  team: "blue" | "red";
  position: Position;
  champion: string | null;
  result: "win" | "loss" | null;
  scoreAtMatch: number | null;
}

export interface MatchDetail {
  id: string;
  createdAt: string;
  status: "pending" | "completed";
  predictedScoreDiff: number | null;
  positionFit: number | null;
  winner: "blue" | "red" | null;
  players: MatchPlayerDetail[];
}

interface MatchJoinRow {
  id: string;
  created_at: string;
  status: string;
  predicted_score_diff: number | null;
  position_fit: number | null;
  winner: string | null;
  match_players: {
    id: string;
    player_id: string;
    team: string;
    position: string;
    champion: string | null;
    result: string | null;
    score_at_match: number | null;
    players: { display_name: string } | null;
  }[];
}

function joinToDetail(r: MatchJoinRow): MatchDetail {
  return {
    id: r.id,
    createdAt: r.created_at,
    status: r.status as MatchDetail["status"],
    predictedScoreDiff: r.predicted_score_diff,
    positionFit: r.position_fit,
    winner: r.winner as MatchDetail["winner"],
    players: r.match_players.map((mp) => ({
      id: mp.id,
      playerId: mp.player_id,
      displayName: mp.players?.display_name ?? "(삭제된 선수)",
      team: mp.team as "blue" | "red",
      position: mp.position as Position,
      champion: mp.champion,
      result: mp.result as "win" | "loss" | null,
      scoreAtMatch: mp.score_at_match,
    })),
  };
}

const MATCH_SELECT = `
  id, created_at, status, predicted_score_diff, position_fit, winner,
  match_players (
    id, player_id, team, position, champion, result, score_at_match,
    players ( display_name )
  )
`;

export async function fetchMatches(): Promise<MatchDetail[]> {
  const { data, error } = await getSupabase()
    .from("matches")
    .select(MATCH_SELECT)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as unknown as MatchJoinRow[]).map(joinToDetail);
}

export async function deleteMatch(id: string): Promise<void> {
  const { error } = await getSupabase().from("matches").delete().eq("id", id);
  if (error) throw error;
}

// ── 결과 기록 (승패·챔프 입력 → MMR·전적 갱신) ───────
// champions: match_player.id → 챔피언명
export async function recordMatchResult(
  matchId: string,
  winner: "blue" | "red",
  champions: Record<string, string>,
): Promise<void> {
  const sb = getSupabase();

  // 매치 + 참가자 로드 (중복 적용 방지 위해 상태 확인)
  const { data: matchRows, error: loadErr } = await sb
    .from("matches")
    .select(MATCH_SELECT)
    .eq("id", matchId);
  if (loadErr) throw loadErr;
  const detail = joinToDetail((matchRows as unknown as MatchJoinRow[])[0]);
  if (detail.status === "completed") {
    throw new Error("이미 결과가 입력된 내전입니다.");
  }

  // 참가 선수 전체 정보 로드 (현재 MMR·전적 기준으로 변동 계산)
  const playerIds = detail.players.map((p) => p.playerId);
  const players = (await fetchPlayersByIds(playerIds)).reduce<
    Record<string, Player>
  >((acc, p) => ((acc[p.id] = p), acc), {});

  const bluePlayers = detail.players
    .filter((p) => p.team === "blue")
    .map((p) => players[p.playerId])
    .filter(Boolean);
  const redPlayers = detail.players
    .filter((p) => p.team === "red")
    .map((p) => players[p.playerId])
    .filter(Boolean);

  const changes = computeMmrChanges(bluePlayers, redPlayers, winner);
  const changeById = new Map(changes.map((c) => [c.playerId, c]));

  // 1) match_players: 승패 + 챔프 기록
  for (const mp of detail.players) {
    const result = mp.team === winner ? "win" : "loss";
    const { error } = await sb
      .from("match_players")
      .update({ result, champion: champions[mp.id] ?? mp.champion ?? null })
      .eq("id", mp.id);
    if (error) throw error;
  }

  // 2) players: MMR + 전적 갱신
  for (const mp of detail.players) {
    const change = changeById.get(mp.playerId);
    const player = players[mp.playerId];
    if (!change || !player) continue;
    const won = mp.team === winner;
    const { error } = await sb
      .from("players")
      .update({
        internal_mmr: change.after,
        wins: player.wins + (won ? 1 : 0),
        losses: player.losses + (won ? 0 : 1),
      })
      .eq("id", mp.playerId);
    if (error) throw error;
  }

  // 3) matches: 완료 처리
  const { error: doneErr } = await sb
    .from("matches")
    .update({ status: "completed", winner })
    .eq("id", matchId);
  if (doneErr) throw doneErr;
}

async function fetchPlayersByIds(ids: string[]): Promise<Player[]> {
  if (ids.length === 0) return [];
  const { data, error } = await getSupabase()
    .from("players")
    .select("*")
    .in("id", ids);
  if (error) throw error;
  return (data as PlayerRow[]).map(rowToPlayer);
}
