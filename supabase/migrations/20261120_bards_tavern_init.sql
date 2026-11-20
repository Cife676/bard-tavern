-- Migration: 20261120_bards_tavern_init.sql
-- Description: Initializes Bard's Tavern real-time tables, grants permissions to anon, sets storage buckets, and RLS policies

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

create table if not exists public.lobbies (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  description text default '',
  host_session_id text not null,
  host_name text not null,
  password_hash text default null,
  is_locked boolean default false,
  current_track_id uuid default null,
  is_playing boolean default false,
  playback_position double precision default 0,
  playback_rate real default 1.0,
  playback_updated_at timestamptz default now(),
  status text default 'active' check (status in ('active', 'closed')),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  last_heartbeat_at timestamptz default now()
);

create table if not exists public.tracks (
  id uuid primary key default gen_random_uuid(),
  lobby_id uuid not null references public.lobbies(id) on delete cascade,
  title text not null,
  artist text default 'Bard',
  audio_url text not null,
  storage_path text not null,
  duration double precision default 0,
  file_size bigint default 0,
  mime_type text not null default 'audio/mpeg',
  order_index integer default 0,
  added_by text not null,
  created_at timestamptz default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'fk_lobbies_current_track'
  ) then
    alter table public.lobbies 
      add constraint fk_lobbies_current_track 
      foreign key (current_track_id) references public.tracks(id) on delete set null;
  end if;
end $$;

create index if not exists idx_lobbies_code on public.lobbies(code);
create index if not exists idx_lobbies_status on public.lobbies(status);
create index if not exists idx_tracks_lobby_id on public.tracks(lobby_id);
create index if not exists idx_tracks_order on public.tracks(lobby_id, order_index);

grant usage on schema public to postgres, anon, authenticated, service_role;
grant all on table public.lobbies to postgres, anon, authenticated, service_role;
grant all on table public.tracks to postgres, anon, authenticated, service_role;
grant all on all sequences in schema public to postgres, anon, authenticated, service_role;

alter table public.lobbies enable row level security;
alter table public.tracks enable row level security;

drop policy if exists "Anyone can view active lobbies" on public.lobbies;
create policy "Anyone can view active lobbies"
  on public.lobbies for select
  to anon, authenticated
  using (status = 'active');

drop policy if exists "Anyone can create a lobby" on public.lobbies;
create policy "Anyone can create a lobby"
  on public.lobbies for insert
  to anon, authenticated
  with check (true);

drop policy if exists "Anyone can update lobbies" on public.lobbies;
create policy "Anyone can update lobbies"
  on public.lobbies for update
  to anon, authenticated
  using (true);

drop policy if exists "Anyone can delete lobbies" on public.lobbies;
create policy "Anyone can delete lobbies"
  on public.lobbies for delete
  to anon, authenticated
  using (true);

drop policy if exists "Anyone can view tracks" on public.tracks;
create policy "Anyone can view tracks"
  on public.tracks for select
  to anon, authenticated
  using (true);

drop policy if exists "Anyone can insert tracks" on public.tracks;
create policy "Anyone can insert tracks"
  on public.tracks for insert
  to anon, authenticated
  with check (true);

drop policy if exists "Anyone can update tracks" on public.tracks;
create policy "Anyone can update tracks"
  on public.tracks for update
  to anon, authenticated
  using (true);

drop policy if exists "Anyone can delete tracks" on public.tracks;
create policy "Anyone can delete tracks"
  on public.tracks for delete
  to anon, authenticated
  using (true);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'lobbies'
  ) then
    alter publication supabase_realtime add table public.lobbies;
  end if;

  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'tracks'
  ) then
    alter publication supabase_realtime add table public.tracks;
  end if;
end $$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'bard-tracks',
  'bard-tracks',
  true,
  52428800,
  array['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/x-wav', 'audio/wave', 'audio/m4a']
)
on conflict (id) do update set 
  public = true,
  file_size_limit = 52428800;

grant all on schema storage to postgres, anon, authenticated, service_role;
grant all on all tables in schema storage to postgres, anon, authenticated, service_role;

drop policy if exists "Public Access Bard Tracks" on storage.objects;
create policy "Public Access Bard Tracks"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'bard-tracks');

drop policy if exists "Public Upload Bard Tracks" on storage.objects;
create policy "Public Upload Bard Tracks"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'bard-tracks');

drop policy if exists "Public Delete Bard Tracks" on storage.objects;
create policy "Public Delete Bard Tracks"
  on storage.objects for delete
  to anon, authenticated
  using (bucket_id = 'bard-tracks');
