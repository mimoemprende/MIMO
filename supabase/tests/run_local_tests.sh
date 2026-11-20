#!/usr/bin/env bash
# Ejecuta las pruebas SQL en un Postgres local (no Supabase). Uso: PGHOST=... PGPORT=... PGUSER=postgres ./run_local_tests.sh
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
DB=mimo_test_$$
psql -q -c "create database $DB"
trap 'psql -q -c "drop database if exists $DB"' EXIT
psql -q -d "$DB" -v ON_ERROR_STOP=1 -f "$DIR/00_local_auth_stub.sql" -f "$DIR/../migrations/20261119000000_mimo_schema.sql" -f "$DIR/01_security_and_rules.sql"
