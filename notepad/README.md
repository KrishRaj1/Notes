# Blank Notepad (self-hosted)

A minimal website that's literally a blank notepad. Open a URL slug and start typing. Your text is auto-saved to the server.

- Any path becomes a separate note: `/`, `/ideas`, `/todo-2025`, etc.
- Server stores notes in SQLite at `data/notes.db`.
- Autosaves as you type and on tab close.

## Run locally

```bash
npm install
npm start
# open http://localhost:3000
```

- Root `/` is the default note. Any other path like `/my-note` creates/loads that note.

## Deploy

- Docker:
  ```bash
  docker build -t blank-notepad .
  docker run -p 3000:3000 -v $(pwd)/data:/app/data blank-notepad
  ```
- Or push to any Node-friendly host (Render, Railway, Fly.io, etc.). Persist the `data/` directory as a volume for durability.

## API

- GET `/api/note/:slug` → `{ slug, content, updatedAt }`
- PUT `/api/note/:slug` with body `{ content: string }` → `{ ok, updatedAt }`
- POST also supported for `sendBeacon` compatibility.

## Notes

- Slugs allow letters, numbers, `-` and `_`. Invalid slugs fall back to the default.
- If offline, your text is cached in `localStorage` and syncs when back online.