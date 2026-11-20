# Media Library

A static audio and video library built with React + Vite + Tailwind CSS and fed
by Google Drive. No backend, database or extra services — just GitHub Pages.

## Features

- Builds the library from 13 Google Drive folders.
- Recursively scans subfolders, paginates Drive API v3 and detects audio/video
  by MIME type (with an extension fallback).
- Natural (numeric) sorting of folders and files.
- Manual subfolder ordering in the teacher's area.
- Collapsible folder sections, closed by default, to keep scrolling short.
- Detects added, removed and renamed files between syncs.
- Static snapshot (library + folder order) loaded without a spinner.
- Auto-sync every 15 minutes (without a snapshot), manual sync and local cache.
- Keeps the previous library visible during a new sync.
- Monthly 4-digit PIN, with optional acceptance of the previous month's PIN.
- Access state persisted in `localStorage` (the PIN is never saved).
- Teacher's area at `/teachers` (and `/#/teachers`).
- Fixed audio player with play/pause, previous/next, progress, duration, volume,
  mute and continuous playback.
- Video player with native controls, fullscreen and a Drive preview fallback.
- Audio/video tabs and a book selector on mobile.
- Clean, mobile-first red-and-white UI with Lucide icons. No on-screen logo —
  the wave mark appears only in the browser tab.

## Stack

- React 19 + Vite
- JavaScript (JSX)
- Tailwind CSS v4
- Lucide React
- Google Drive API v3
- GitHub Pages

## Getting started

```bash
npm install
cp .env.example .env   # Windows: copy .env.example .env
npm run dev
```

Without `VITE_GOOGLE_API_KEY`, the app shows a setup screen — no fake data.

## 1. Google Drive API setup

1. Open the [Google Cloud Console](https://console.cloud.google.com/) and create
   or select a project.
2. Go to **APIs & Services → Library** and enable **Google Drive API**.
3. Go to **APIs & Services → Credentials** and create an **API key**.
4. Restrict the key:
   - **API restrictions:** Google Drive API.
   - **Application restrictions:** HTTP referrers. Add
     `http://localhost:5173/*` and your site URL, for example
     `https://YOUR-USER.github.io/REPO-NAME/*`.
5. Create `.env` in the project root:

```env
VITE_GOOGLE_API_KEY=your-key-here
```

> The key is bundled into the site's JavaScript. That is acceptable only because
> all files are public. Referrer and API restrictions reduce misuse but don't
> make the key secret on a static site.

### Folder sharing

The API key can only list and play public files. Share the configured series
root, every course/lesson folder and all files with **Anyone with the link ·
Viewer**. If a subfolder or file isn't public, it won't appear or won't play;
the affected series shows the error.

### Verified IDs

`AUDIO_FOLDERS` currently contains the Adults series:

| Series | Audio folder |
| --- | --- |
| Adults | `10tYI18xoQL0RzLr_CVKZuOgnNDgneYqb` |

The Drive layout is `Series / Course / Lesson` — for example
`Adults / Essentials 1 / LESSON 01`. Courses appear in the sidebar submenu and
lessons become collapsible sections. Video categories are unchanged until the
video series folders are configured.

To add another series (Teens, TeenStation, Kids), add a `{ name, id }` object to
`AUDIO_FOLDERS` and/or `VIDEO_FOLDERS` in `src/config/drive.js`. Nothing else
needs to change.

## 2. Monthly PIN and teacher's area

Set the secrets in `.env` (or GitHub Actions secrets) before publishing:

```env
VITE_SECRET_SALT=a-long-unique-secret
VITE_STAFF_PASSWORD=1234
VITE_OWNER_PASSWORD=9876
```

`VITE_STAFF_PASSWORD` and `VITE_OWNER_PASSWORD` are 4-digit PINs. Use different
values and avoid obvious sequences.

- The PIN is exactly 4 digits, derived deterministically from
  `month + year + VITE_SECRET_SALT`.
- The current month's PIN is always accepted.
- With `ACCEPT_PREVIOUS_MONTH = true` (default), last month's PIN also works
  during the current month.
- Older PINs are treated as expired.
- On success, only `{ authorized, period, expiresAt }` is saved in
  `localStorage` — never the PIN in plain text.
- Access lasts until the end of the current month. After that, the student asks
  the teacher for the new PIN.

The teacher's area is at:

- `/#/teachers` (works anywhere, including GitHub Pages);
- `/teachers` (works in development; in production `404.html` redirects to the
  app).

The login uses the same style as the student PIN screen and asks for
`VITE_STAFF_PASSWORD`. It then shows the current PIN, its month/year, the
previous PIN when applicable and a copy button.

At the bottom is the **Admin** panel, which asks for the second PIN,
`VITE_OWNER_PASSWORD`. Sync and folder order unlock only after that. Use
**Sign out** to lock the controls again.

The library no longer links to the teacher's area; the access screen still does.

> **Security note:** this is a static site. `VITE_SECRET_SALT`,
> `VITE_STAFF_PASSWORD`, `VITE_OWNER_PASSWORD`, the PIN algorithm and the API
> key all reach the visitor's browser. PINs are casual access control, not
> protection against technical users. Don't store sensitive content here.

## 3. Published snapshot, sync and cache

What students see comes from `public/library.json`, a static file shipped with
each deploy. It stores the library, folder order and the last publish date.

- On open, the published snapshot (or a newer local cache) is shown immediately,
  with no loading screen.
- While a snapshot exists, students don't call the Drive API on entry. Updates
  arrive when the admin syncs and publishes a new file.
- Without a published snapshot, the old behavior applies: local cache, silent
  sync when older than 15 minutes, and a 15-minute refresh.
- **Sync** in the **Admin** panel queries Drive and updates the admin's view.
- **Download snapshot** generates `library.json` with the synced library and
  folder order. Replace `public/library.json` with the downloaded file and
  deploy to release the update everywhere.
- The previous version stays visible during a new sync.
- Added, removed and renamed files are detected by id and name and shown in a
  discreet notice.
- A failure in one folder doesn't stop the others; the error appears in that
  category.

### Folder order

At the bottom of the **Admin** panel, **Folder order** moves subfolders up or
down and restores natural order. The panel requires `VITE_OWNER_PASSWORD`.
Changes apply immediately and are included in the file produced by
**Download snapshot**, so they reach every device after deploy. The local draft
is discarded on publish.

Folder sections start collapsed. Tap the folder header to expand or collapse.

`localStorage` keys:

| Key | Contents |
| --- | --- |
| `media.library.v1` | Library cache + last sync time |
| `media.access.v1` | Authorization state and validity period (no PIN) |
| `media.player.v1` | Audio player volume |
| `media.folderOrder.v2` | Folder order draft (cleared on publish) |

Old `fisk.*` keys are migrated automatically to `media.*` on first access,
preserving login, volume and saved order.

## 4. Media playback

- Audio and video are served from
  `https://www.googleapis.com/drive/v3/files/{id}?alt=media&key=...`.
- If that endpoint fails, audio retries with the public
  `drive.usercontent.google.com` link.
- If direct `<video>` playback fails, the modal switches to Drive's embedded
  player (`/file/d/{id}/preview`), keeping controls and fullscreen.
- The browser must support the file's codec (for example MP3/M4A for audio and
  MP4/WebM for video). Drive doesn't transcode files.
- Files with "download disabled" or outside public sharing may not play.

## 5. GitHub Pages deploy

### Via GitHub Actions (recommended)

1. Push the project to a GitHub repository.
2. In **Settings → Secrets and variables → Actions → New repository secret**,
   create `VITE_GOOGLE_API_KEY`, `VITE_SECRET_SALT`, `VITE_STAFF_PASSWORD` and
   `VITE_OWNER_PASSWORD`.
3. In **Settings → Pages**, set **Source: GitHub Actions**.
4. Push to `main`. `.github/workflows/deploy.yml` runs `npm ci`,
   `npm run build` and publishes `dist`.
5. The URL will be `https://YOUR-USER.github.io/REPO-NAME/`.

Vite uses `base: './'`, so assets work on project sites (`/repo-name/`) and
custom domains. `public/404.html` handles direct routes like `/teachers`, and
`public/.nojekyll` prevents Jekyll processing.

### Manual build

```bash
npm run build
npm run preview
```

Publish the contents of `dist/` to any static host.

## 6. Project structure

```text
src/
  config/
    access.js          # env secrets and PIN rules
    drive.js           # audio/video folders, API key and sync interval
  services/
    accessService.js   # PIN generation/validation and access persistence
    driveService.js    # Drive API v3, recursion, paging, diff and URLs
  hooks/
    useAccess.js       # authorization state
    useAudioPlayer.js  # queue, controls and continuous playback
    useLibrary.js      # sync, cache, progress and changes
    useRoute.js        # /teachers route without a router
  components/          # reusable UI (players, lists, notices, PIN, etc.)
  pages/
    TeachersPage.jsx   # /teachers
    LibraryPage.jsx    # PIN gate + library
  utils/               # formatting, folder groups and localStorage
public/
  library.json         # published snapshot (library + folder order)
```

## 7. Manual test checklist

1. Set the API key and confirm all configured series folders are queried.
2. Open each series, choose a course and check the real files and subfolders.
3. Play an audio: play/pause, progress, volume, previous/next and continuous
   playback.
4. Open a video: playback, controls, fullscreen and mobile behavior.
5. Generate the PIN at `/#/teachers` and enter it on the student screen.
6. Confirm last month's PIN is accepted and an older PIN returns "expired".
7. Reload and confirm access persists in `localStorage`.
8. Add, remove and rename a file in Drive; wait for sync (or use **Sync** in the
   **Admin** panel) and check the change notice.
9. Unlock **Admin** with `VITE_OWNER_PASSWORD`, reorder courses and lessons and
   confirm the new order in the library. Use **Sign out** to lock it again.
10. Confirm folder sections start collapsed and expand/collapse on tap.
11. Test an empty folder and a folder without public sharing.
12. Click **Download snapshot**, replace `public/library.json` with the file and
    deploy. Open in another browser and confirm library and order appear
    instantly, without loading.
13. Publish to GitHub Pages and validate `/#/teachers`, the library and playback.
