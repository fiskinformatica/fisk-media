import { Hono } from 'hono'
import type { Env } from '../types.js'
import { getAccessToken, getDriveFileMetadata, streamDriveFile } from '../services/driveService.js'

const app = new Hono<{ Bindings: Env }>()

/**
 * GET /api/stream/:fileId
 * Proxies a Google Drive file with Service Account authentication.
 * Supports HTTP Range requests for seek/partial audio & video playback.
 *
 * This is necessary because the files are shared with the Service Account
 * (not publicly), so the frontend cannot access them directly.
 *
 * Security note: this endpoint is PUBLIC (no JWT required) because students
 * need to stream files after PIN validation. The fileId alone is not a secret —
 * if someone has the ID they can stream the file, which is acceptable since
 * the IDs are only delivered to authenticated (PIN-validated) sessions.
 *
 * CORS headers are handled by the global middleware.
 */
app.get('/:fileId', async (c) => {
  const fileId = c.req.param('fileId')

  if (!fileId || fileId.length < 10) {
    return c.json({ ok: false, error: 'File ID inválido.' }, 400)
  }

  if (!c.env.GOOGLE_CLIENT_EMAIL || !c.env.GOOGLE_PRIVATE_KEY) {
    return c.json({ ok: false, error: 'Credenciais do Google não configuradas.' }, 503)
  }

  try {
    const accessToken = await getAccessToken(c.env.GOOGLE_CLIENT_EMAIL, c.env.GOOGLE_PRIVATE_KEY)
    const rangeHeader = c.req.header('Range')

    const streamResponse = await streamDriveFile(fileId, accessToken, rangeHeader)

    // Add CORS headers so the browser can play the stream
    const origin = c.env.FRONTEND_URL || 'http://localhost:5173'
    streamResponse.headers.set('Access-Control-Allow-Origin', origin)
    streamResponse.headers.set('Access-Control-Allow-Headers', 'Range')
    streamResponse.headers.set('Access-Control-Expose-Headers', 'Content-Range, Accept-Ranges, Content-Length')

    return streamResponse
  } catch (err) {
    const error = err as Error & { status?: number }
    console.error(`Stream error for ${fileId}:`, error.message)

    const status = error.status === 404 ? 404 : error.status === 403 ? 403 : 502
    return c.json(
      { ok: false, error: error.message || 'Erro ao acessar o arquivo no Drive.' },
      status,
    )
  }
})

/**
 * HEAD /api/stream/:fileId
 * Returns file metadata without the body (used by audio/video elements
 * to check Content-Length and Content-Type before streaming).
 */
app.on('HEAD', '/:fileId', async (c) => {
  const fileId = c.req.param('fileId')

  if (!c.env.GOOGLE_CLIENT_EMAIL || !c.env.GOOGLE_PRIVATE_KEY) {
    return new Response(null, { status: 503 })
  }

  try {
    const accessToken = await getAccessToken(c.env.GOOGLE_CLIENT_EMAIL, c.env.GOOGLE_PRIVATE_KEY)
    const meta = await getDriveFileMetadata(fileId, accessToken)

    const origin = c.env.FRONTEND_URL || 'http://localhost:5173'
    return new Response(null, {
      status: 200,
      headers: {
        'Content-Type': meta.mimeType || 'application/octet-stream',
        'Content-Length': meta.size || '0',
        'Accept-Ranges': 'bytes',
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Headers': 'Range',
        'Access-Control-Expose-Headers': 'Content-Range, Accept-Ranges, Content-Length',
      },
    })
  } catch (err) {
    const error = err as Error & { status?: number }
    return new Response(null, { status: error.status ?? 502 })
  }
})

/**
 * OPTIONS /api/stream/:fileId
 * Preflight for CORS (Range header requires preflight).
 */
app.options('/:fileId', (c) => {
  const origin = c.env.FRONTEND_URL || 'http://localhost:5173'
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Range, Authorization',
      'Access-Control-Expose-Headers': 'Content-Range, Accept-Ranges, Content-Length',
      'Access-Control-Max-Age': '86400',
    },
  })
})

export default app
