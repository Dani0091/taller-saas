#!/usr/bin/env bash
# Exporta las variables E2E desde el Supabase LOCAL (supabase start).
# Uso: source scripts/e2e-env.sh
# No imprime claves ni las escribe en disco.

if ! supabase status >/dev/null 2>&1; then
  echo "Supabase local no está en marcha. Ejecuta primero: supabase start" >&2
  return 1 2>/dev/null || exit 1
fi

eval "$(supabase status -o env | grep -E '^(API_URL|ANON_KEY|SERVICE_ROLE_KEY)=')"

export E2E_SUPABASE_URL="$API_URL"
export E2E_SUPABASE_ANON_KEY="$ANON_KEY"
export E2E_SUPABASE_SERVICE_ROLE_KEY="$SERVICE_ROLE_KEY"
unset API_URL ANON_KEY SERVICE_ROLE_KEY

echo "E2E apuntando a: $E2E_SUPABASE_URL"
