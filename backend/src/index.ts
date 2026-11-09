import { Hono } from 'hono'
import type { Env } from './types.js'
import { corsMiddleware } from './middleware/index.js'
import libraryRouter from './routes/library.js'
import syncRouter from './routes/sync.js'
import authRouter from './routes/auth.js'
import pinRouter from './routes/pin.js'
import adminRouter from './routes/admin.js'
import streamRouter from './routes/stream.js'
import { rotateMonthlyPin } from './services/pinService.js'
import { runSync } from './services/syncService.js'

const app = new Hono<{ Bindings: Env }>()

// -------------------------------------------------------
// Global middleware
// -------------------------------------------------------

// CORS — must be first
app.use('/*', async (c, next) => {
  const fn = corsMiddleware(c.env)
  return fn(c, next)
})

// -------------------------------------------------------
// Health check
// -------------------------------------------------------

app.get('/', (c) => {
  return c.json({
    ok: true,
    data: {
      service: 'Fisk Media API',
      version: '2.0.0',
      timestamp: new Date().toISOString(),
    },
  })
})

app.get('/health', async (c) => {
  try {
    // Check DB is reachable
    await c.env.DB.prepare('SELECT 1').first()
    return c.json({ ok: true, data: { db: 'ok', timestamp: new Date().toISOString() } })
  } catch (err) {
    const error = err as Error
    return c.json({ ok: false, error: 'DB unavailable: ' + error.message }, 503)
  }
})

// -------------------------------------------------------
// API routes
// -------------------------------------------------------

app.route('/api/library', libraryRouter)
app.route('/api/stream', streamRouter)
app.route('/api/sync', syncRouter)
app.route('/api/auth', authRouter)
app.route('/api/pin', pinRouter)
app.route('/api/admin', adminRouter)

// -------------------------------------------------------
// 404 fallback
// -------------------------------------------------------

app.notFound((c) => {
  return c.json({ ok: false, error: `Rota não encontrada: ${c.req.path}` }, 404)
})

// -------------------------------------------------------
// Error handler
// -------------------------------------------------------

app.onError((err, c) => {
  console.error('Unhandled error:', err)
  return c.json({ ok: false, error: 'Erro interno do servidor.' }, 500)
})

// -------------------------------------------------------
// Cloudflare Workers scheduled handler (cron trigger)
// Runs on the 1st of every month at midnight UTC: "0 0 1 * *"
// -------------------------------------------------------

export default {
  fetch: app.fetch,

  async scheduled(event: ScheduledController, env: Env, ctx: ExecutionContext) {
    console.log(`Cron triggered: ${event.scheduledTime} at ${new Date().toISOString()}`)

    ctx.waitUntil(
      (async () => {
        try {
          // 1. Rotate monthly PIN
          const pinResult = await rotateMonthlyPin(env)
          console.log(`PIN rotated for period: ${pinResult.periodKey}`)

          // 2. Run a sync to pick up any new files
          const syncResult = await runSync(env, 'cron')
          console.log(`Cron sync completed: ${syncResult.filesProcessed} files processed, ${syncResult.filesAdded} added`)
        } catch (err) {
          const error = err as Error
          console.error('Cron job failed:', error.message)
        }
      })(),
    )
  },
} satisfies ExportedHandler<Env>
