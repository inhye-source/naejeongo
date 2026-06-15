import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";
export const maxDuration = 60;

// LoL 대기실 스크린샷에서 소환사명 10명을 추출하는 구조화 스키마
const SCHEMA = {
  type: "object",
  properties: {
    players: {
      type: "array",
      items: { type: "string" },
      description: "스크린샷에 보이는 소환사명(닉네임) 목록",
    },
  },
  required: ["players"],
  additionalProperties: false,
} as const;

const SUPPORTED = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY가 설정되지 않았습니다. .env.local에 키를 추가하세요." },
      { status: 500 },
    );
  }

  let body: { imageBase64?: string; mediaType?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청 형식입니다." }, { status: 400 });
  }

  const { imageBase64, mediaType } = body;
  if (!imageBase64 || !mediaType) {
    return NextResponse.json(
      { error: "이미지 데이터가 없습니다." },
      { status: 400 },
    );
  }
  if (!SUPPORTED.has(mediaType)) {
    return NextResponse.json(
      { error: `지원하지 않는 이미지 형식입니다 (${mediaType}). PNG/JPG/WEBP를 사용하세요.` },
      { status: 400 },
    );
  }

  const client = new Anthropic({ apiKey });

  try {
    const response = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 1024,
      output_config: { format: { type: "json_schema", schema: SCHEMA } },
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType as "image/png" | "image/jpeg" | "image/webp" | "image/gif",
                data: imageBase64,
              },
            },
            {
              type: "text",
              text: [
                "이것은 리그 오브 레전드 사용자 설정 게임(내전) 대기실 스크린샷입니다.",
                "화면에 보이는 참가자들의 소환사명(닉네임)만 정확히 그대로 추출하세요.",
                "- 챔피언 이름, 버튼 텍스트, UI 라벨은 제외합니다.",
                "- 닉네임의 한글/영문/숫자/특수문자를 보이는 그대로 옮깁니다.",
                "- 보통 10명이지만, 실제로 보이는 인원수만큼만 반환하세요.",
              ].join("\n"),
            },
          ],
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    const raw = textBlock && "text" in textBlock ? textBlock.text : "{}";
    let parsed: { players?: unknown };
    try {
      parsed = JSON.parse(raw);
    } catch {
      return NextResponse.json(
        { error: "AI 응답을 해석하지 못했습니다. 다시 시도해주세요." },
        { status: 502 },
      );
    }

    const players = Array.isArray(parsed.players)
      ? parsed.players.filter((p): p is string => typeof p === "string" && p.trim().length > 0)
      : [];

    return NextResponse.json({ players });
  } catch (e) {
    const message =
      e instanceof Anthropic.APIError
        ? `Claude API 오류 (${e.status}): ${e.message}`
        : e instanceof Error
          ? e.message
          : "이미지 분석 중 오류가 발생했습니다.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
