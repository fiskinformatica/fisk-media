import { Hono } from 'hono'
import type { Env } from '../types.js'
import { buildLibraryPayload } from '../services/syncService.js'

const app = new Hono<{ Bindings: Env }>()

/**
 * GET /api/library
 * Returns the full library payload: folders, videos, and metadata.
 * This is the primary endpoint consumed by the frontend.
 *
 * Cache-Control: 5 minutes to reduce DB load on repeated page loads.
 */
app.get('/', async (c) => {
  try {
    const payload = await buildLibraryPayload(c.env.DB)

    return c.json(
      { ok: true, data: payload },
      200,
      { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=60' },
    )
  } catch (err) {
    const error = err as Error
    console.error('Library fetch failed:', error.message)
    return c.json({ ok: false, error: 'Não foi possível carregar a biblioteca.' }, 500)
  }
})

export default app
