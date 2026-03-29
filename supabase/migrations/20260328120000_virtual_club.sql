-- Virtual club: profiles, DJ sessions, comments, votes
-- Run in Supabase SQL editor or via CLI: supabase db push

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.dj_sessions (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  description text,
  webrtc_room text not null unique,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'live', 'ended')),
  created_at timestamptz not null default now(),
  started_at timestamptz,
  ended_at timestamptz
);

create index if not exists dj_sessions_status_idx on public.dj_sessions (status);
create index if not exists dj_sessions_host_idx on public.dj_sessions (host_id);

create table if not exists public.session_comments (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.dj_sessions (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists session_comments_session_idx on public.session_comments (session_id, created_at desc);

create table if not exists public.dj_votes (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.dj_sessions (id) on delete cascade,
  voter_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (session_id, voter_id)
);

create index if not exists dj_votes_session_idx on public.dj_votes (session_id);

-- New user → profile row
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data->>'display_name'), ''),
      split_part(new.email, '@', 1),
      'DJ'
    )
  );
  return new;
end;
$$;

-- If you already have a profile trigger, skip or merge this block.
drop trigger if exists club_profile_on_signup on auth.users;
create trigger club_profile_on_signup
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.dj_sessions enable row level security;
alter table public.session_comments enable row level security;
alter table public.dj_votes enable row level security;

-- Profiles
create policy "profiles_select_auth" on public.profiles
  for select to authenticated using (true);

create policy "profiles_update_own" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Sessions
create policy "sessions_select_auth" on public.dj_sessions
  for select to authenticated using (true);

create policy "sessions_insert_host" on public.dj_sessions
  for insert to authenticated with check (host_id = auth.uid());

create policy "sessions_update_host" on public.dj_sessions
  for update to authenticated using (host_id = auth.uid()) with check (host_id = auth.uid());

-- Comments
create policy "comments_select_auth" on public.session_comments
  for select to authenticated using (true);

create policy "comments_insert_own" on public.session_comments
  for insert to authenticated with check (user_id = auth.uid());

-- Votes (one per session per voter; cannot vote own session)
create policy "votes_select_auth" on public.dj_votes
  for select to authenticated using (true);

create policy "votes_insert_rules" on public.dj_votes
  for insert to authenticated
  with check (
    voter_id = auth.uid()
    and exists (
      select 1 from public.dj_sessions s
      where s.id = session_id and s.host_id <> auth.uid()
    )
  );

-- Realtime for live chat (skip if already added in dashboard)
alter publication supabase_realtime add table public.session_comments;

-- Aggregated DJ votes for leaderboard
create or replace function public.leaderboard_djs(limit_n int default 25)
returns table (host_id uuid, display_name text, vote_count bigint)
language sql
stable
security invoker
set search_path = public
as $$
  select s.host_id, p.display_name, count(v.id)::bigint as vote_count
  from public.dj_votes v
  join public.dj_sessions s on s.id = v.session_id
  join public.profiles p on p.id = s.host_id
  group by s.host_id, p.display_name
  order by vote_count desc
  limit coalesce(nullif(limit_n, 0), 25);
$$;

grant execute on function public.leaderboard_djs(int) to authenticated;
