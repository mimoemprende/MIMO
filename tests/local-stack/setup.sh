#!/usr/bin/env bash
# Backend local compatible con Supabase para pruebas E2E (Linux x64). OPCIONAL.
# Requiere un Postgres 15+ escuchando en 127.0.0.1:54329 con usuario postgres (trust).
# Descarga PostgREST y Supabase Auth (GoTrue), crea la BD mimo_e2e, aplica el esquema y levanta todo en :54321.
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"; ROOT="$DIR/../.."; cd "$DIR"
[ -x postgrest ] || { curl -sSL -o p.tar.xz https://github.com/PostgREST/postgrest/releases/download/v12.2.3/postgrest-v12.2.3-linux-static-x64.tar.xz && tar xf p.tar.xz && rm p.tar.xz; }
[ -x auth ] || { curl -sSL -o a.tgz https://github.com/supabase/auth/releases/download/v2.169.0/auth-v2.169.0-x86.tar.gz && tar xzf a.tgz && rm a.tgz; }
P="psql -h 127.0.0.1 -p 54329 -U postgres"
$P -q -c "drop database if exists mimo_e2e with (force)" -c "create database mimo_e2e"
$P -d mimo_e2e -q -v ON_ERROR_STOP=1 <<'SQL'
do $$ begin
  if not exists (select 1 from pg_roles where rolname='anon') then create role anon nologin noinherit; end if;
  if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin noinherit; end if;
  if not exists (select 1 from pg_roles where rolname='service_role') then create role service_role nologin noinherit bypassrls; end if;
  if not exists (select 1 from pg_roles where rolname='authenticator') then create role authenticator login noinherit; end if;
  if not exists (select 1 from pg_roles where rolname='supabase_auth_admin') then create role supabase_auth_admin login createrole; end if;
end $$;
grant anon, authenticated, service_role to authenticator;
create schema auth authorization supabase_auth_admin;
grant create on database mimo_e2e to supabase_auth_admin;
alter role supabase_auth_admin set search_path = auth;
SQL
set -a; . ./gotrue.env; set +a
./auth migrate
$P -d mimo_e2e -q -v ON_ERROR_STOP=1 -c "grant usage on schema auth to anon, authenticated; grant execute on function auth.uid() to anon, authenticated;" -f "$ROOT/supabase/migrations/20261119000000_mimo_schema.sql"
nohup ./auth serve > gotrue.log 2>&1 &
nohup ./postgrest postgrest.conf > postgrest.log 2>&1 &
nohup node proxy.mjs > proxy.log 2>&1 &
sleep 2
echo "Backend local listo en http://localhost:54321"
echo "VITE_SUPABASE_URL=http://localhost:54321"
echo "VITE_SUPABASE_ANON_KEY=$(node jwt.mjs)"
