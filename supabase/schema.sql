-- ============================================================
-- 내전 밸런서 — Supabase 테이블 스키마
-- Supabase 대시보드 → SQL Editor 에 통째로 붙여넣고 RUN 하세요.
-- (한 번만 실행하면 됩니다)
-- ============================================================

-- 1) 선수 테이블 -------------------------------------------------
create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  riot_id text,                          -- 게임이름#태그 (예: Hide on bush#KR1)
  display_name text not null,            -- 표시 이름
  tier text not null default 'GOLD',     -- 라이엇 티어
  division text not null default 'IV',   -- 디비전 (마스터+는 'I')
  preferred_positions text[] not null default '{}',  -- 주 포지션 (선호순)
  champion_pool_size int not null default 3,         -- 챔프 폭
  most_champions text[] not null default '{}',       -- 모스트 챔피언 (최대 3)
  internal_mmr numeric,                  -- 자체 MMR (내전 결과로 갱신)
  manual_adjustment numeric not null default 0,      -- 수동 보정
  wins int not null default 0,
  losses int not null default 0,
  created_at timestamptz not null default now()
);

-- 2) 내전(매치) 테이블 ------------------------------------------
create table if not exists matches (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  status text not null default 'pending',     -- 'pending' | 'completed'
  predicted_score_diff numeric,               -- 생성 시 예측 전력차
  position_fit numeric,                        -- 생성 시 포지션 만족도(0~1)
  winner text,                                 -- 'blue' | 'red' | null
  notes text
);

-- 3) 매치 참가자 테이블 (선수 × 매치) --------------------------
create table if not exists match_players (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  team text not null,                  -- 'blue' | 'red'
  position text not null,              -- 배정 포지션
  champion text,                       -- 실제 픽한 챔프 (게임 후 입력)
  result text,                         -- 'win' | 'loss' (게임 후 입력)
  score_at_match numeric,              -- 매치 당시 실력 점수 (밸런스 정확도 분석용)
  created_at timestamptz not null default now()
);

create index if not exists idx_match_players_match on match_players(match_id);
create index if not exists idx_match_players_player on match_players(player_id);

-- 4) 보안(RLS) -------------------------------------------------
-- 비공개 소규모 도구라 anon 키로 읽기/쓰기를 허용합니다.
-- (외부 공개가 필요해지면 정책을 좁히세요)
alter table players enable row level security;
alter table matches enable row level security;
alter table match_players enable row level security;

create policy "allow all players"       on players        for all using (true) with check (true);
create policy "allow all matches"       on matches        for all using (true) with check (true);
create policy "allow all match_players" on match_players  for all using (true) with check (true);
