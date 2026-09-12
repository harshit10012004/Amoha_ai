# Care Hub Backend

This project contains a real Node.js/Express REST backend under `backend/` and a React frontend under `src/`.

## Run backend

```powershell
cd backend
npm install
npm run dev
```

API: `http://localhost:4000`
Health: `http://localhost:4000/api/health`

## Run frontend

From the project root:

```powershell
npm install
npm run dev
```

The frontend API client uses `VITE_API_URL`, defaulting to `http://localhost:4000/api`.

## Demo authentication

Phone: `9876543210`
OTP: `123456`

## Main API routes

- POST `/api/auth/request-otp`
- POST `/api/auth/verify-otp`
- GET `/api/me`
- GET/POST `/api/medicines`
- POST `/api/medicines/:id/taken`
- POST `/api/medicines/:id/skipped`
- GET/PATCH `/api/care-plan`
- GET/POST `/api/care-logs`
- GET/POST/PATCH `/api/reminders`
- GET/POST/PATCH `/api/notifications`
- GET `/api/dashboard`
- GET `/api/caregiver/patients`
- GET `/api/caregiver/patients/:id/summary`

## Storage

The included demo backend persists data to `backend/data/db.json`. This makes the project runnable without installing PostgreSQL. For production deployment, replace the storage adapter with PostgreSQL while keeping the API contract.
