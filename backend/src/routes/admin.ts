import { Hono } from 'hono'
import type { Env } from '../types.js'
import { requireAdmin } from '../middleware/index.js'

const app = new Hono<{ Bindings: Env; Variables: { adminId: string; adminUsername: string } }>()

app.use('/*', requireAdmin)

// -------------------------------------------------------
// Folder management
// -------------------------------------------------------

/**
 * GET /api/admin/folders
 * Returns all folders (including hidden ones), with item counts.
 */
app.get('/folders', async (c) => {
  try {
    const { results } = await c.env.DB
      .prepare(`
        SELECT
          f.*,
          COUNT(v.id) FILTER (WHERE v.available = 1) as item_count
        FROM folders f
        LEFT JOIN videos v ON v.folder_id = f.id
        GROUP BY f.id
        ORDER BY f.kind, f.sort_order
      `)
      .all()

    return c.json({ ok: true, data: results ?? [] })
  } catch (err) {
    const error = err as Error
    return c.json({ ok: false, error: error.message }, 500)
  }
})

/**
 * PATCH /api/admin/folders/:id
 * Updates folder name, sort_order, or visible.
 *
 * Body: { name?: string; sort_order?: number; visible?: boolean }
 */
app.patch('/folders/:id', async (c) => {
  const folderId = c.req.param('id')

  let body: { name?: string; sort_order?: number; visible?: boolean }
  try {
    body = await c.req.json()
  } catch {
    return c.json({ ok: false, error: 'Corpo inválido.' }, 400)
  }

  const updates: string[] = []
  const values: unknown[] = []

  if (body.name !== undefined) {
    updates.push('name = ?')
    values.push(String(body.name).trim())
  }
  if (body.sort_order !== undefined) {
    updates.push('sort_order = ?')
    values.push(Number(body.sort_order))
  }
  if (body.visible !== undefined) {
    updates.push('visible = ?')
    values.push(body.visible ? 1 : 0)
  }

  if (updates.length === 0) {
    return c.json({ ok: false, error: 'Nenhum campo para atualizar.' }, 400)
  }

  updates.push("updated_at = datetime('now')")
  values.push(folderId)

  try {
    const result = await c.env.DB
      .prepare(`UPDATE folders SET ${updates.join(', ')} WHERE id = ?`)
      .bind(...values)
      .run()

    if (!result.success || result.meta.changes === 0) {
      return c.json({ ok: false, error: 'Pasta não encontrada.' }, 404)
    }

    return c.json({ ok: true, data: { updated: true } })
  } catch (err) {
    const error = err as Error
    return c.json({ ok: false, error: error.message }, 500)
  }
})

/**
 * POST /api/admin/folders/reorder
 * Reorders multiple folders at once.
 *
 * Body: { orders: Array<{ id: string; sort_order: number }> }
 */
app.post('/folders/reorder', async (c) => {
  let body: { orders?: Array<{ id: string; sort_order: number }> }
  try {
    body = await c.req.json()
  } catch {
    return c.json({ ok: false, error: 'Corpo inválido.' }, 400)
  }

  if (!Array.isArray(body.orders) || body.orders.length === 0) {
    return c.json({ ok: false, error: 'orders deve ser um array não vazio.' }, 400)
  }

  try {
    const stmts = body.orders.map(({ id, sort_order }) =>
      c.env.DB.prepare(`UPDATE folders SET sort_order = ?, updated_at = datetime('now') WHERE id = ?`)
        .bind(sort_order, id),
    )

    await c.env.DB.batch(stmts)

    return c.json({ ok: true, data: { updated: body.orders.length } })
  } catch (err) {
    const error = err as Error
    return c.json({ ok: false, error: error.message }, 500)
  }
})

// -------------------------------------------------------
// Subfolder management
// -------------------------------------------------------

/**
 * POST /api/admin/subfolders/reorder
 * Reorders subfolders within a folder.
 *
 * Body: { orders: Array<{ id: number; sort_order: number }> }
 */
app.post('/subfolders/reorder', async (c) => {
  let body: { orders?: Array<{ id: number; sort_order: number }> }
  try {
    body = await c.req.json()
  } catch {
    return c.json({ ok: false, error: 'Corpo inválido.' }, 400)
  }

  if (!Array.isArray(body.orders) || body.orders.length === 0) {
    return c.json({ ok: false, error: 'orders deve ser um array não vazio.' }, 400)
  }

  try {
    const stmts = body.orders.map(({ id, sort_order }) =>
      c.env.DB.prepare(`UPDATE subfolders SET sort_order = ?, updated_at = datetime('now') WHERE id = ?`)
        .bind(sort_order, id),
    )

    await c.env.DB.batch(stmts)

    return c.json({ ok: true, data: { updated: body.orders.length } })
  } catch (err) {
    const error = err as Error
    return c.json({ ok: false, error: error.message }, 500)
  }
})

// -------------------------------------------------------
// Video management
// -------------------------------------------------------

/**
 * GET /api/admin/videos
 * Returns all videos for a folder (including invisible/unavailable).
 * Query: ?folderId=<id>&kind=audio|video
 */
app.get('/videos', async (c) => {
  const folderId = c.req.query('folderId')
  const kind = c.req.query('kind')

  let query = `
    SELECT v.*, s.path_key, s.name as subfolder_name
    FROM videos v
    LEFT JOIN subfolders s ON v.subfolder_id = s.id
    WHERE 1=1
  `
  const params: unknown[] = []

  if (folderId) {
    query += ' AND v.folder_id = ?'
    params.push(folderId)
  }
  if (kind) {
    query += ' AND v.kind = ?'
    params.push(kind)
  }

  query += ' ORDER BY COALESCE(s.sort_order, 0), v.sort_order LIMIT 500'

  try {
    const { results } = await c.env.DB.prepare(query).bind(...params).all()
    return c.json({ ok: true, data: results ?? [] })
  } catch (err) {
    const error = err as Error
    return c.json({ ok: false, error: error.message }, 500)
  }
})

/**
 * PATCH /api/admin/videos/:id
 * Updates video title, sort_order, or visible.
 *
 * Body: { title?: string; sort_order?: number; visible?: boolean }
 */
app.patch('/videos/:id', async (c) => {
  const videoId = c.req.param('id')

  let body: { title?: string; sort_order?: number; visible?: boolean }
  try {
    body = await c.req.json()
  } catch {
    return c.json({ ok: false, error: 'Corpo inválido.' }, 400)
  }

  const updates: string[] = []
  const values: unknown[] = []

  if (body.title !== undefined) {
    updates.push('title = ?')
    values.push(String(body.title).trim())
  }
  if (body.sort_order !== undefined) {
    updates.push('sort_order = ?')
    values.push(Number(body.sort_order))
  }
  if (body.visible !== undefined) {
    updates.push('visible = ?')
    values.push(body.visible ? 1 : 0)
  }

  if (updates.length === 0) {
    return c.json({ ok: false, error: 'Nenhum campo para atualizar.' }, 400)
  }

  updates.push("updated_at = datetime('now')")
  values.push(videoId)

  try {
    const result = await c.env.DB
      .prepare(`UPDATE videos SET ${updates.join(', ')} WHERE id = ?`)
      .bind(...values)
      .run()

    if (!result.success || result.meta.changes === 0) {
      return c.json({ ok: false, error: 'Vídeo não encontrado.' }, 404)
    }

    return c.json({ ok: true, data: { updated: true } })
  } catch (err) {
    const error = err as Error
    return c.json({ ok: false, error: error.message }, 500)
  }
})

/**
 * POST /api/admin/videos/reorder
 * Reorders multiple videos at once.
 *
 * Body: { orders: Array<{ id: number; sort_order: number }> }
 */
app.post('/videos/reorder', async (c) => {
  let body: { orders?: Array<{ id: number; sort_order: number }> }
  try {
    body = await c.req.json()
  } catch {
    return c.json({ ok: false, error: 'Corpo inválido.' }, 400)
  }

  if (!Array.isArray(body.orders) || body.orders.length === 0) {
    return c.json({ ok: false, error: 'orders deve ser um array não vazio.' }, 400)
  }

  try {
    const stmts = body.orders.map(({ id, sort_order }) =>
      c.env.DB.prepare(`UPDATE videos SET sort_order = ?, updated_at = datetime('now') WHERE id = ?`)
        .bind(sort_order, id),
    )

    await c.env.DB.batch(stmts)

    return c.json({ ok: true, data: { updated: body.orders.length } })
  } catch (err) {
    const error = err as Error
    return c.json({ ok: false, error: error.message }, 500)
  }
})

// -------------------------------------------------------
// PIN management
// -------------------------------------------------------

/**
 * POST /api/admin/pins/teacher
 * Updates the teacher PIN (requires admin authentication).
 *
 * Body: { pin: string }
 */
app.post('/pins/teacher', async (c) => {
  let body: { pin?: string }
  try {
    body = await c.req.json()
  } catch {
    return c.json({ ok: false, error: 'Corpo inválido.' }, 400)
  }

  const { pin } = body

  if (!pin || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
    return c.json({ ok: false, error: 'PIN deve ter 4 dígitos.' }, 400)
  }

  try {
    const { hashPassword } = await import('../utils/helpers.js')
    const pinHash = await hashPassword(pin)

    // Deactivate all previous teacher PINs
    await c.env.DB
      .prepare(`UPDATE teacher_pins SET active = 0 WHERE active = 1`)
      .run()

    // Insert new active PIN
    await c.env.DB
      .prepare(`INSERT INTO teacher_pins (pin_hash, active) VALUES (?, 1)`)
      .bind(pinHash)
      .run()

    return c.json({ ok: true, data: { message: 'PIN de teacher atualizado com sucesso.' } })
  } catch (err) {
    const error = err as Error
    return c.json({ ok: false, error: error.message }, 500)
  }
})

/**
 * POST /api/admin/pins/admin
 * Updates the admin PIN (requires admin authentication).
 *
 * Body: { pin: string }
 */
app.post('/pins/admin', async (c) => {
  let body: { pin?: string }
  try {
    body = await c.req.json()
  } catch {
    return c.json({ ok: false, error: 'Corpo inválido.' }, 400)
  }

  const { pin } = body

  if (!pin || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
    return c.json({ ok: false, error: 'PIN deve ter 4 dígitos.' }, 400)
  }

  try {
    const { hashPassword } = await import('../utils/helpers.js')
    const pinHash = await hashPassword(pin)

    // Deactivate all previous admin PINs
    await c.env.DB
      .prepare(`UPDATE admin_pin SET active = 0 WHERE active = 1`)
      .run()

    // Insert new active PIN
    await c.env.DB
      .prepare(`INSERT INTO admin_pin (pin_hash, active) VALUES (?, 1)`)
      .bind(pinHash)
      .run()

    return c.json({ ok: true, data: { message: 'PIN de admin atualizado com sucesso.' } })
  } catch (err) {
    const error = err as Error
    return c.json({ ok: false, error: error.message }, 500)
  }
})

export default app
