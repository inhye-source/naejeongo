import { NextResponse } from "next/server";

export const runtime = "nodejs";

// 한국 서버 기준 라우팅
const REGIONAL = "https://asia.api.riotgames.com"; // account-v1
const PLATFORM = "https://kr.api.riotgames.com"; // league-v4 등

interface LeagueEntry {
  queueType: string;
  tier: string;
  rank: string;
  leaguePoints: number;
  wins: number;
  losses: number;
}

async function riotGet(url: string, key: string) {
  const sep = url.includes("?") ? "&" : "?";
  return fetch(`${url}${sep}api_key=${encodeURIComponent(key)}`);
}

export async function POST(req: Request) {
  const key = process.env.RIOT_API_KEY;
  if (!key) {
    return NextResponse.json(
      { error: "RIOT_API_KEY가 설정되지 않았습니다. .env.local에 키를 추가하세요." },
      { status: 500 },
    );
  }

  let body: { riotId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const riotId = (body.riotId ?? "").trim();
  if (!riotId.includes("#")) {
    return NextResponse.json(
      { error: "Riot ID는 '게임이름#태그' 형식이어야 합니다 (예: Hide on bush#KR1)." },
      { status: 400 },
    );
  }
  const [gameName, tagLine] = riotId.split("#");
  if (!gameName || !tagLine) {
    return NextResponse.json(
      { error: "게임이름과 태그를 모두 입력하세요." },
      { status: 400 },
    );
  }

  try {
    // 1) Riot ID → PUUID
    const accUrl = `${REGIONAL}/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`;
    const accRes = await riotGet(accUrl, key);
    if (accRes.status === 401 || accRes.status === 403) {
      return NextResponse.json(
        { error: "Riot API 키가 유효하지 않거나 만료됐습니다. 새로 발급해 교체하세요." },
        { status: 502 },
      );
    }
    if (accRes.status === 404) {
      return NextResponse.json(
        { error: "해당 Riot ID를 찾을 수 없습니다. 철자와 태그를 확인하세요." },
        { status: 404 },
      );
    }
    if (accRes.status === 429) {
      return NextResponse.json(
        { error: "Riot API 요청이 많아 잠시 후 다시 시도하세요." },
        { status: 429 },
      );
    }
    if (!accRes.ok) {
      return NextResponse.json(
        { error: `Riot 계정 조회 실패 (${accRes.status})` },
        { status: 502 },
      );
    }
    const account = (await accRes.json()) as { puuid: string };

    // 2) PUUID → 랭크 정보 (League-V4 by-puuid)
    const leagueUrl = `${PLATFORM}/lol/league/v4/entries/by-puuid/${account.puuid}`;
    const lgRes = await riotGet(leagueUrl, key);
    if (!lgRes.ok) {
      return NextResponse.json(
        { error: `랭크 정보 조회 실패 (${lgRes.status})` },
        { status: 502 },
      );
    }
    const entries = (await lgRes.json()) as LeagueEntry[];

    // 솔로랭크 우선, 없으면 자유랭크
    const solo = entries.find((e) => e.queueType === "RANKED_SOLO_5x5");
    const flex = entries.find((e) => e.queueType === "RANKED_FLEX_SR");
    const ranked = solo ?? flex;

    if (!ranked) {
      return NextResponse.json({
        riotId,
        unranked: true,
        message: "랭크 기록이 없습니다(언랭). 티어를 직접 설정하세요.",
      });
    }

    return NextResponse.json({
      riotId,
      tier: ranked.tier, // IRON ~ CHALLENGER
      division: ranked.rank, // I ~ IV (마스터+는 I)
      leaguePoints: ranked.leaguePoints,
      wins: ranked.wins,
      losses: ranked.losses,
      queue: ranked === solo ? "솔로랭크" : "자유랭크",
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "조회 중 오류가 발생했습니다." },
      { status: 502 },
    );
  }
}
