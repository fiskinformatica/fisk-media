import { Hono } from 'hono'
import type { Env } from '../types.js'
import { requireAdmin } from '../middleware/index.js'
import { runSync } from '../services/syncService.js'

const app = new Hono<{ Bindings: Env; Variables: { adminId: string; adminUsername: string } }>()

app.use('/*', requireAdmin)

/**
 * POST /api/sync
 * Triggers a manual sync from Google Drive.
 * Admin authentication required.
 */
app.post('/', async (c) => {
  try {
    const result = await runSync(c.env, 'admin')

    const status = result.status === 'completed' ? 200 : 500

    return c.json({ ok: result.status === 'completed', data: result }, status)
  } catch (err) {
    const error = err as Error
    console.error('Sync failed:', error.message)
    return c.json({ ok: false, error: 'Sincronização falhou.', detail: error.message }, 500)
  }
})

/**
 * GET /api/sync/history
 * Returns the last 20 sync job records.
 */
app.get('/history', async (c) => {
  try {
    const { results } = await c.env.DB
      .prepare(
        `SELECT id, status, triggered_by, started_at, finished_at,
                files_processed, files_added, files_removed, errors, summary
         FROM sync_jobs
         ORDER BY id DESC
         LIMIT 20`,
      )
      .all()

    return c.json({ ok: true, data: results ?? [] })
  } catch (err) {
    const error = err as Error
    return c.json({ ok: false, error: error.message }, 500)
  }
})

/**
 * GET /api/sync/status
 * Returns whether a sync is currently running.
 */
app.get('/status', async (c) => {
  try {
    const running = await c.env.DB
      .prepare(`SELECT id, started_at FROM sync_jobs WHERE status = 'running' ORDER BY id DESC LIMIT 1`)
      .first<{ id: number; started_at: string }>()

    const lastCompleted = await c.env.DB
      .prepare(
        `SELECT id, finished_at, files_processed, files_added, files_removed
         FROM sync_jobs
         WHERE status = 'completed'
         ORDER BY id DESC LIMIT 1`,
      )
      .first<{ id: number; finished_at: string; files_processed: number; files_added: number; files_removed: number }>()

    return c.json({
      ok: true,
      data: {
        running: Boolean(running),
        runningJobId: running?.id ?? null,
        lastSync: lastCompleted ?? null,
      },
    })
  } catch (err) {
    const error = err as Error
    return c.json({ ok: false, error: error.message }, 500)
  }
})

export default app
