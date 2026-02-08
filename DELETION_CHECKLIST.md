# Unused files/code deletion checklist

**Scan date:** Repo scanned for imports, routes, config, and asset references.

**Rules applied:** Only deleted where provably unused (no imports, no route usage, no config usage, no asset references). Did not touch env files, secrets, lockfiles, or CI configs. Kept anything referenced by dynamic import, reflection, glob patterns, or routing.

---

## Deletions performed

### 1. `client/public/vite.svg`
- **Reason:** Unused asset. Default Vite template file; this app uses `tooth-icon.svg` for favicon and icons.
- **Proof:** 
  - `index.html` references only `/tooth-icon.svg` (favicon, apple-touch-icon).
  - `client/public/manifest.json` references only `/tooth-icon.svg`.
  - No grep match for `vite.svg` anywhere in the repo.
  - `vite.config.js` PWA `includeAssets` lists `favicon.ico`, `apple-touch-icon.png`, `mask-icon.svg` (none are `vite.svg`).
- **Result:** Deleted.

---

## Not deleted (verified in use)

| Item | Why kept |
|------|----------|
| All `client/src/pages/*.jsx` | Imported by `App.jsx` and used in `<Route>` components. |
| All `client/src/components/*.jsx` | Imported by pages or App (MainLayout). |
| `client/src/config.js` | Imported by `Login.jsx` and `db/indexedDB.js`. |
| `client/src/utils/timeBuckets.js` | Imported by `Graphs.jsx`. |
| `client/src/db/indexedDB.js` | Imported by App and multiple pages. |
| `client/public/tooth-icon.svg` | Referenced in `index.html` and `manifest.json`. |
| `client/public/manifest.json` | Referenced in `index.html`. |
| All `server/models/*.js` | Used by `server/routes/*.js` or `server/scripts/*.js`. |
| `server/middleware/auth.js` | Used by `server/routes/sync.js`. |
| `server/scripts/*.js` | Referenced by `server/package.json` scripts (seed, import-csv, view-data, migrate-visits). |
| `server/data/.gitkeep` | Keeps `data/` in git; may be used by scripts or convention. |
| `.DS_Store` | Not deleted (filesystem artifact; left to .gitignore). |

---

## Summary

- **Files deleted:** 1 (`client/public/vite.svg`).
- **Imports updated:** None (no remaining references to deleted file).
- **Build/tests:** Client `npm run build` succeeds. Server module loads (connectDB + routes); any exit code from `node server.js` was due to port in use, not missing files.
