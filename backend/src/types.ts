// Cloudflare Workers environment bindings
export interface Env {
  // D1 database
  DB: D1Database

  // Google Service Account credentials (set via `wrangler secret put`)
  GOOGLE_CLIENT_EMAIL: string
  GOOGLE_PRIVATE_KEY: string  // PEM private key, \n as literal newlines

  // JWT secret for admin sessions (generate: openssl rand -hex 32)
  JWT_SECRET: string

  // Secret salt for monthly student PIN generation
  SECRET_SALT: string

  // Admin account setup key (used once to create the first admin)
  ADMIN_SETUP_KEY?: string

  // Frontend origin for CORS (set in wrangler.toml [vars])
  FRONTEND_URL: string

  // Environment tag
  ENVIRONMENT?: string
}

// -------------------------------------------------------
// Domain types
// -------------------------------------------------------

export interface Folder {
  id: string
  name: string
  drive_name: string
  kind: 'audio' | 'video'
  sort_order: number
  visible: boolean
  created_at: string
  updated_at: string
}

export interface Subfolder {
  id: number
  folder_id: string
  path_key: string
  name: string
  sort_order: number
  visible: boolean
  created_at: string
  updated_at: string
}

export interface Video {
  id: number
  drive_file_id: string
  folder_id: string
  subfolder_id: number | null
  title: string
  drive_name: string
  mime_type: string
  kind: 'audio' | 'video'
  size_bytes: number | null
  modified_time: string | null
  sort_order: number
  visible: boolean
  metadata: string  // JSON
  available: boolean
  created_at: string
  updated_at: string
}

export interface SyncJob {
  id: number
  status: 'running' | 'completed' | 'failed'
  triggered_by: string
  started_at: string
  finished_at: string | null
  files_processed: number
  files_added: number
  files_removed: number
  errors: string   // JSON array
  summary: string  // JSON blob
}

export interface AccessCode {
  id: number
  code_hash: string
  valid_from: string
  valid_until: string
  active: boolean
  created_at: string
}

export interface Admin {
  id: number
  username: string
  password_hash: string
  created_at: string
  updated_at: string
}

// -------------------------------------------------------
// API response shapes
// -------------------------------------------------------

export interface ApiSuccess<T = unknown> {
  ok: true
  data: T
}

export interface ApiError {
  ok: false
  error: string
  code?: string
}

export type ApiResponse<T = unknown> = ApiSuccess<T> | ApiError

// -------------------------------------------------------
// Library payload (returned to frontend)
// -------------------------------------------------------

export interface LibraryItem {
  id: string            // drive_file_id
  title: string
  mimeType: string
  kind: 'audio' | 'video'
  size: number | null
  modifiedTime: string | null
  categoryId: string    // folder.id
  categoryName: string  // folder.name
  path: string[]        // subfolder path segments
  sortOrder: number
}

export interface LibraryCategory {
  id: string
  name: string
  kind: 'audio' | 'video'
  sortOrder: number
  items: LibraryItem[]
}

export interface LibraryPayload {
  version: number
  syncedAt: string | null
  audio: LibraryCategory[]
  video: LibraryCategory[]
  stats: {
    folders: number
    audio: number
    video: number
  }
}

// -------------------------------------------------------
// Google Drive API types
// -------------------------------------------------------

export interface DriveFile {
  id: string
  name: string
  mimeType: string
  size?: string
  modifiedTime?: string
  createdTime?: string
  shortcutDetails?: {
    targetId: string
    targetMimeType: string
  }
}

export interface DriveFilesResponse {
  files: DriveFile[]
  nextPageToken?: string
}

// -------------------------------------------------------
// Sync types
// -------------------------------------------------------

export interface SyncResult {
  jobId: number
  status: 'completed' | 'failed'
  filesProcessed: number
  filesAdded: number
  filesRemoved: number
  errors: string[]
  durationMs: number
}
