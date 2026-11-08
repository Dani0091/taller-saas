import { defineConfig, devices } from '@playwright/test'

/**
 * E2E de TallerAgil.
 *
 * Seguridad (hay un cliente real en producción):
 * - El servidor de pruebas SOLO puede apuntar a un Supabase local
 *   (127.0.0.1 / localhost). Si no, la config aborta.
 * - Next.js no sobrescribe variables ya definidas en el proceso, así que las
 *   de abajo ganan a .env.local. Los servicios externos (Telegram, Google,
 *   OpenRouter, Gemini) se vacían para que ningún test pueda enviar nada.
 * - Las claves locales se pasan por entorno (ver scripts/e2e-env.sh);
 *   nunca se escriben en archivos.
 */

const PORT = Number(process.env.E2E_PORT ?? 3100)
const BASE_URL = `http://127.0.0.1:${PORT}`
const SUPABASE_URL = process.env.E2E_SUPABASE_URL ?? ''

const host = (() => {
  try {
    return new URL(SUPABASE_URL).hostname
  } catch {
    return ''
  }
})()

if (!['127.0.0.1', 'localhost'].includes(host)) {
  throw new Error(
    `E2E_SUPABASE_URL debe ser un Supabase local (127.0.0.1/localhost). Recibido: "${host || 'vacío'}". ` +
      'Ejecuta: source scripts/e2e-env.sh'
  )
}

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  outputDir: 'test-results',
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    // Sin sesión
    { name: 'chromium', testIgnore: [/\.auth\.spec\.ts/, /auth\.setup\.ts/], use: { ...devices['Desktop Chrome'] } },
    { name: 'movil', testIgnore: [/\.auth\.spec\.ts/, /auth\.setup\.ts/], use: { ...devices['Pixel 7'] } },
    // Con sesión: el setup crea los admins QA A/B en el Supabase local
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    {
      name: 'qa-a',
      testMatch: /\.auth\.spec\.ts/,
      dependencies: ['setup'],
      use: { ...devices['Desktop Chrome'], storageState: 'playwright/.auth/qa-a.json' },
    },
  ],
  // Build de producción, como en Railway. Con `next dev` el WebSocket de HMR
  // falla (proxy.ts no excluye /_next/hmr) y la página se recarga en bucle.
  // Las NEXT_PUBLIC_* se incrustan en el build, por eso van en `env`.
  webServer: {
    command: `npx next build && npx next start -p ${PORT}`,
    // E2E_HEALTH_PATH permite probar versiones antiguas sin /api/health (p. ej. /auth/login).
    url: `${BASE_URL}${process.env.E2E_HEALTH_PATH ?? '/api/health'}`,
    reuseExistingServer: false,
    timeout: 400_000,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.E2E_SUPABASE_ANON_KEY ?? '',
      SUPABASE_SERVICE_ROLE_KEY: process.env.E2E_SUPABASE_SERVICE_ROLE_KEY ?? '',
      NEXT_PUBLIC_APP_URL: BASE_URL,
      TELEGRAM_BOT_TOKEN: '',
      TELEGRAM_CHAT_ID: '',
      GOOGLE_CLIENT_ID: '',
      GOOGLE_CLIENT_SECRET: '',
      OPENROUTER_API_KEY: '',
      GEMINI_API_KEY: '',
    },
  },
})
