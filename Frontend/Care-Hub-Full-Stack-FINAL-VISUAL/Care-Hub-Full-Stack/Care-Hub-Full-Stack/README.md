# Care Hub — Full Stack

This package contains both the Care Hub React frontend and the Express backend in one project.

## Structure

- `src/` — React + TypeScript frontend
- `backend/` — Express REST API
- `backend/data/db.json` — demo persistent datastore

## Easiest Windows setup

Open this folder in VS Code and run:

```powershell
npm.cmd install
npm.cmd run dev:all
```

No `cd backend` is required.

Frontend: http://localhost:5173
Backend: http://localhost:4000
Health check: http://localhost:4000/api/health

If PowerShell blocks `npm`, use `npm.cmd` exactly as shown above.

## Backend demo login

Request OTP from the app. Demo OTP is `123456` for the seeded/demo flow.

## Separate commands

Frontend only:
```powershell
npm.cmd run dev
```

Backend only:
```powershell
npm.cmd run dev:backend
```


## Text-to-Speech (TTS)

Care Hub uses the browser Web Speech API for lightweight, offline-friendly read-aloud support. Main Home actions speak their title and short description before navigation, the Voice / Ask page can read responses aloud, and the language switch announces the selected language. English uses `en-IN`; Hindi uses `hi-IN`.

The TTS layer is implemented in `src/services/tts.ts`. It does not require a backend endpoint or API key. Browser/device voice availability determines the actual voice.


## 90s Music
The Music page includes an original browser-generated retro-inspired instrumental player, so the project does not redistribute commercial 1990s recordings.
