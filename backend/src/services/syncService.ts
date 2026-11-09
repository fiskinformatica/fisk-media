import { naturalCompare } from '../utils/helpers.js'
import { fetchDriveLibrary, getAccessToken, type MediaItem } from './driveService.js'
import type { Env, Folder, LibraryCategory, LibraryItem, LibraryPayload, SyncResult } from '../types.js'

/**
 * Compares two media items for sorting (path-first, then name).
 * Mirrors the original frontend compareMedia function.
 */
function compareMediaItem(a: MediaItem, b: MediaItem): number {
  const pathA = a.path.join('\0')
  const pathB = b.path.join('\0')
  return naturalCompare(pathA, pathB) || naturalCompare(a.name, b.name)
}

/**
 * Main synchronisation routine.
 * 1. Creates a sync_jobs row with status=running.
 * 2. Fetches all 13 Drive folders recursively.
 * 3. Upserts folders, subfolders, and videos into D1.
 * 4. Marks files no longer found in Drive as unavailable.
 * 5. Preserves existing sort_order and visible values set by admin.
 * 6. Updates sync_jobs with results.
 */
export async function runSync(env: Env, triggeredBy: 'admin' | 'cron' = 'admin'): Promise<SyncResult> {
  const db = env.DB
  const startTime = Date.now()
  const errors: string[] = []

  // 1. Create sync job record
  const jobResult = await db
    .prepare(
      `INSERT INTO sync_jobs (status, triggered_by) VALUES ('running', ?) RETURNING id`,
    )
    .bind(triggeredBy)
    .first<{ id: number }>()

  const jobId = jobResult!.id

  try {
    // 2. Load all configured folders from database
    const { results: dbFolders } = await db
      .prepare(`SELECT id, name, kind FROM folders ORDER BY kind, sort_order`)
      .all<{ id: string; name: string; kind: 'audio' | 'video' }>()

    if (!dbFolders || dbFolders.length === 0) {
      throw new Error('No folders configured in database. Run the seed migration first.')
    }

    if (!env.GOOGLE_CLIENT_EMAIL || !env.GOOGLE_PRIVATE_KEY) {
      throw new Error('GOOGLE_CLIENT_EMAIL e GOOGLE_PRIVATE_KEY não estão configurados.')
    }

    // 3. Get OAuth2 access token for the Service Account
    const accessToken = await getAccessToken(env.GOOGLE_CLIENT_EMAIL, env.GOOGLE_PRIVATE_KEY)

    // 4. Fetch from Google Drive
    const driveResult = await fetchDriveLibrary({
      accessToken,
      folders: dbFolders,
    })

    for (const err of driveResult.errors) {
      errors.push(`[${err.category}/${err.path}] ${err.message}`)
    }

    // 4. Collect all current Drive file IDs to detect removals
    const driveFileIds = new Set<string>()
    let filesAdded = 0
    let filesProcessed = 0

    // 5. Upsert each category's items
    for (const category of driveResult.categories) {
      // Sort items matching the original natural sort
      category.items.sort(compareMediaItem)

      // Subfolder upsert: collect unique path_keys
      const subfolderMap = new Map<string, number>() // path_key -> id

      const uniquePaths = new Set<string>()
      for (const item of category.items) {
        if (item.path.length > 0) {
          uniquePaths.add(item.path.join(' / '))
        }
      }

      for (const pathKey of uniquePaths) {
        const segments = pathKey.split(' / ')
        const name = segments[segments.length - 1]!

        const existing = await db
          .prepare(`SELECT id FROM subfolders WHERE folder_id = ? AND path_key = ?`)
          .bind(category.id, pathKey)
          .first<{ id: number }>()

        if (existing) {
          subfolderMap.set(pathKey, existing.id)
        } else {
          const inserted = await db
            .prepare(
              `INSERT INTO subfolders (folder_id, path_key, name) VALUES (?, ?, ?) RETURNING id`,
            )
            .bind(category.id, pathKey, name)
            .first<{ id: number }>()
          subfolderMap.set(pathKey, inserted!.id)
        }
      }

      // Upsert videos
      for (let i = 0; i < category.items.length; i++) {
        const item = category.items[i]!
        driveFileIds.add(item.id)
        filesProcessed++

        const pathKey = item.path.length > 0 ? item.path.join(' / ') : null
        const subfolderIdValue = pathKey ? (subfolderMap.get(pathKey) ?? null) : null

        const existing = await db
          .prepare(`SELECT id, sort_order FROM videos WHERE drive_file_id = ?`)
          .bind(item.id)
          .first<{ id: number; sort_order: number }>()

        if (existing) {
          // Update metadata but preserve admin-set sort_order and visible
          await db
            .prepare(`
              UPDATE videos
              SET
                folder_id = ?,
                subfolder_id = ?,
                drive_name = ?,
                mime_type = ?,
                kind = ?,
                size_bytes = ?,
                modified_time = ?,
                available = 1,
                updated_at = datetime('now')
              WHERE drive_file_id = ?
            `)
            .bind(
              category.id,
              subfolderIdValue,
              item.name,
              item.mimeType,
              item.kind,
              item.size,
              item.modifiedTime,
              item.id,
            )
            .run()
        } else {
          // New file — title defaults to drive_name, admin can rename later
          await db
            .prepare(`
              INSERT INTO videos (
                drive_file_id, folder_id, subfolder_id, title, drive_name,
                mime_type, kind, size_bytes, modified_time, sort_order, available
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
            `)
            .bind(
              item.id,
              category.id,
              subfolderIdValue,
              item.name,
              item.name,
              item.mimeType,
              item.kind,
              item.size,
              item.modifiedTime,
              i,
            )
            .run()
          filesAdded++
        }
      }
    }

    // 6. Mark removed files as unavailable (don't delete, preserve history)
    //    Get all currently available file IDs from DB
    const { results: availableFiles } = await db
      .prepare(`SELECT drive_file_id FROM videos WHERE available = 1`)
      .all<{ drive_file_id: string }>()

    let filesRemoved = 0
    for (const { drive_file_id } of availableFiles ?? []) {
      if (!driveFileIds.has(drive_file_id)) {
        await db
          .prepare(`UPDATE videos SET available = 0, updated_at = datetime('now') WHERE drive_file_id = ?`)
          .bind(drive_file_id)
          .run()
        filesRemoved++
      }
    }

    const durationMs = Date.now() - startTime

    // 7. Update sync job as completed
    await db
      .prepare(`
        UPDATE sync_jobs
        SET
          status = 'completed',
          finished_at = datetime('now'),
          files_processed = ?,
          files_added = ?,
          files_removed = ?,
          errors = ?,
          summary = ?
        WHERE id = ?
      `)
      .bind(
        filesProcessed,
        filesAdded,
        filesRemoved,
        JSON.stringify(errors),
        JSON.stringify({ durationMs, driveStats: driveResult.stats }),
        jobId,
      )
      .run()

    return {
      jobId,
      status: 'completed',
      filesProcessed,
      filesAdded,
      filesRemoved,
      errors,
      durationMs,
    }
  } catch (err) {
    const error = err as Error
    const message = error.message || 'Sync failed with unknown error'
    errors.push(message)

    const durationMs = Date.now() - startTime

    await db
      .prepare(`
        UPDATE sync_jobs
        SET
          status = 'failed',
          finished_at = datetime('now'),
          errors = ?,
          summary = ?
        WHERE id = ?
      `)
      .bind(JSON.stringify(errors), JSON.stringify({ durationMs }), jobId)
      .run()

    return {
      jobId,
      status: 'failed',
      filesProcessed: 0,
      filesAdded: 0,
      filesRemoved: 0,
      errors,
      durationMs,
    }
  }
}

/**
 * Build the library payload that the frontend consumes.
 * Returns all visible, available files grouped by category,
 * respecting admin-set sort_order values.
 */
export async function buildLibraryPayload(db: D1Database): Promise<LibraryPayload> {
  // Get last completed sync
  const lastSync = await db
    .prepare(`SELECT finished_at FROM sync_jobs WHERE status = 'completed' ORDER BY id DESC LIMIT 1`)
    .first<{ finished_at: string }>()

  // Get all visible folders
  const { results: folders } = await db
    .prepare(`SELECT * FROM folders WHERE visible = 1 ORDER BY kind, sort_order`)
    .all<Folder>()

  const audioCategories: LibraryCategory[] = []
  const videoCategories: LibraryCategory[] = []

  for (const folder of folders ?? []) {
    // Get visible, available videos in this folder with subfolder info
    const { results: videos } = await db
      .prepare(`
        SELECT
          v.drive_file_id,
          v.title,
          v.mime_type,
          v.kind,
          v.size_bytes,
          v.modified_time,
          v.sort_order,
          s.path_key,
          s.sort_order as subfolder_order
        FROM videos v
        LEFT JOIN subfolders s ON v.subfolder_id = s.id
        WHERE v.folder_id = ?
          AND v.visible = 1
          AND v.available = 1
        ORDER BY COALESCE(s.sort_order, 0), v.sort_order
      `)
      .bind(folder.id)
      .all<{
        drive_file_id: string
        title: string
        mime_type: string
        kind: 'audio' | 'video'
        size_bytes: number | null
        modified_time: string | null
        sort_order: number
        path_key: string | null
        subfolder_order: number | null
      }>()

    const items: LibraryItem[] = (videos ?? []).map((v) => ({
      id: v.drive_file_id,
      title: v.title,
      mimeType: v.mime_type,
      kind: v.kind,
      size: v.size_bytes,
      modifiedTime: v.modified_time,
      categoryId: folder.id,
      categoryName: folder.name,
      path: v.path_key ? v.path_key.split(' / ') : [],
      sortOrder: v.sort_order,
    }))

    const category: LibraryCategory = {
      id: folder.id,
      name: folder.name,
      kind: folder.kind,
      sortOrder: folder.sort_order,
      items,
    }

    if (folder.kind === 'audio') {
      audioCategories.push(category)
    } else {
      videoCategories.push(category)
    }
  }

  const audioTotal = audioCategories.reduce((t, c) => t + c.items.length, 0)
  const videoTotal = videoCategories.reduce((t, c) => t + c.items.length, 0)

  return {
    version: 2,
    syncedAt: lastSync?.finished_at ?? null,
    audio: audioCategories,
    video: videoCategories,
    stats: {
      folders: (folders ?? []).length,
      audio: audioTotal,
      video: videoTotal,
    },
  }
}
