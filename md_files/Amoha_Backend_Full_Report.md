# Amoha — Backend (Yellow) Full Architecture & Status Report
**Confirmed against live Supabase schema. Status: Monday–Thursday complete and tested.**

---

## 1. Purpose

The backend is the single source of truth for Amoha's data. Every caregiver, patient, medicine, and care log lives here. No other module (frontend, offline sync, AI) stores this data permanently on its own — they all read from and write to this backend through its API.

**Stack:** Node.js + Express (API server) · Supabase / PostgreSQL (database) · `service_role` key for all backend-to-database calls.

---

## 2. Confirmed database schema (from Supabase Schema Visualizer)

### `users`
| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| name | text | |
| phone | text | Unique |
| role | text | caregiver / chw / family |
| preferred_language | text | |
| region | text | |
| created_at | timestamptz | |

Represents whoever operates the app — a caregiver, a family member, or a community health worker. Not the patient.

### `care_recipients`
| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| name | text | |
| age | int4 | |
| dementia_stage | text | |
| caregiver_id | uuid | Foreign key → `users.id` |
| created_at | timestamptz | |

The dementia patient being cared for. Every patient belongs to exactly one caregiver.

### `meds`
| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| care_recipient_id | uuid | Foreign key → `care_recipients.id` |
| name | text | |
| dosage | text | |
| time_of_day | time | |
| frequency | text | |
| created_at | timestamptz | |

Medicines prescribed to a specific patient.

### `care_logs`
| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| care_recipient_id | uuid | Foreign key → `care_recipients.id` |
| logged_by | uuid | Foreign key → `users.id` — which caregiver wrote this entry |
| entry_text | text | The caregiver's written description of an issue/symptom |
| tag | text | Reserved for AI-generated category (e.g. "agitation") — not yet populated |
| logged_at | timestamptz | |
| suggestion | text | Reserved for AI-generated advice — not yet populated |
| game_accuracy | numeric | Reserved for cognitive-game performance data — not yet populated |
| alert_level | text | Reserved for AI-generated urgency flag — not yet populated |

This table already has the fields Green's AI module will eventually write into (`tag`, `suggestion`, `alert_level`) and a field for cognitive game accuracy — the columns exist and are confirmed live, but nothing currently fills them in; that integration is still pending.

### `sync_queue`
| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| device_id | text | Which phone/device sent this |
| payload | jsonb | The actual data being synced |
| idempotency_key | text | Unique — prevents the same action being applied twice |
| status | text | pending / synced / failed |
| created_at | timestamptz | |

Used only when a caregiver's phone was offline and is now sending queued-up actions back to the server. Not linked to a specific patient directly — it's a generic mutation log.

### `access_logs`
| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| user_id | uuid | Foreign key → `users.id`, nullable |
| endpoint | text | Which API route was hit |
| request_time | timestamptz | |
| device_id | text | Nullable |
| ip_address | text | |

Records every request hitting the server. Built to support a possible future anomaly-detection feature (flagging unusual login times, request spikes, etc.) — not part of the core Week 1 plan, and not yet used for anything beyond passive logging.

### How the tables connect
```
users
  └──▶ care_recipients (via caregiver_id)
           ├──▶ meds (via care_recipient_id)
           └──▶ care_logs (via care_recipient_id, and logged_by → users)

sync_queue   — standalone, used by all offline writes
access_logs  — standalone, records all requests, links loosely to users via user_id
```

---

## 3. API endpoints — full list, all tested

| Method | Route | Ownership check? | Purpose |
|---|---|---|---|
| GET | `/` | — | Health check |
| POST | `/users` | Not applicable | Create a caregiver/CHW account |
| POST | `/care-recipients` | Not yet added | Register a new patient |
| GET | `/care-recipients?caregiver_id=` | Filter only, no explicit block yet | List a caregiver's patients |
| GET | `/meds?care_recipient_id=` | ✅ Tested | View a patient's medicines |
| POST | `/meds` | ✅ Tested | Add a medicine |
| PUT | `/meds/:id` | ✅ Tested | Edit a medicine |
| DELETE | `/meds/:id` | ✅ Tested | Remove a medicine |
| GET | `/care-logs?care_recipient_id=` | ✅ Tested | View a patient's care log history |
| POST | `/care-logs` | ✅ Tested | Add a new care log entry |
| PUT | `/care-logs/:id` | ✅ Tested | Edit a care log entry |
| DELETE | `/care-logs/:id` | ✅ Tested | Remove a care log entry |
| POST | `/sync` | Not applicable (batched) | Replay offline actions safely, no duplicates |

**"Ownership check" means:** before returning or changing any patient's data, the backend verifies the caregiver making the request actually owns that patient. This was tested directly, in both directions, on every route marked above — the correct caregiver succeeds, an unrelated caregiver is rejected with a clear "not authorized" response.

---

## 4. Security posture, explained plainly

- Access control is enforced entirely in the backend's own code (an ownership check function), not by the database itself.
- Row-Level Security (RLS) is turned on in Supabase, but has no active rules yet — and because the backend connects using a privileged service key, RLS wouldn't affect it either way right now. This is intentional and harmless at this stage.
- Caregiver identity is currently passed manually for testing (a stand-in for real login). Once OTP-based login is built, this identity will come from a verified session instead — the underlying access rule stays the same.
- The team lead has decided to hold off on building full Supabase-based authentication for now, to avoid destabilizing the tested, working setup this close to deadlines. This is a deliberate, agreed sequencing decision, not an oversight.

---

## 5. Connection to each teammate

**🟠 Orange (Frontend)** — Calls the endpoints in section 3 directly. Needs the field names exactly as listed and, as the one remaining task, a live deployed URL plus a Postman collection.

**🔵 Blue (Offline & Sync)** — Their offline queue should produce batches matching the `/sync` endpoint's expected shape (`device_id` + list of `{idempotency_key, table, payload}`). Backend guarantees no duplicate writes even if the same batch is sent more than once.

**🟢 Green (AI/ML)** — `care_logs.tag`, `care_logs.suggestion`, and `care_logs.alert_level` are already reserved and live in the table, waiting for Green's classifier output. `care_logs.game_accuracy` is also ready for cognitive-game performance data. This integration has not been wired into the API logic yet — it's the next major open item.

**🟣 Purple (Security)** — The ownership-check logic (section 4) is what Purple's task calls for reviewing and hardening. When real OTP login is introduced, Purple's system supplies the verified identity this check already relies on — no backend restructuring needed, just a change in where the identity comes from.

**🔴 Red (Lead)** — Backend is stable and matches the agreed plan; ready for demo integration once deployed.

---

## 6. Remaining work

1. Deploy the backend to Render or Fly.io and share the live URL + a Postman collection with Orange (Friday's task — the only outstanding item from this week's plan)
2. Add the same ownership check to `POST /care-recipients` (currently unprotected — flagged, not yet fixed)
3. Wire Green's AI tagging logic into the `care_logs` write path once it's ready
4. Revisit RLS policies only if/when Supabase Auth is actually adopted — parked for now by team decision
