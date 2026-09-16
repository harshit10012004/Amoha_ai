# Competitor‑app Landscape

A concise comparison of existing dementia‑care and caregiver apps versus **Amoha**, highlighting pricing, core strengths, limitations, and how Amoha differentiates itself.

| App type | Typical pricing model | Example price points | Notes & Amoha differentiators |
|----------|----------------------|----------------------|------------------------------|
| **Freemium caregiver hubs** (Caring Village, CareZone, CaringBridge) | Free core + paid tiers for advanced features | ~$5–15 /month or ~$50–120 /year; some offer family plans | Free tier often enough for basic coordination; advanced safety/monitoring locked behind subscriptions. **Amoha**: All core features remain free forever; offline‑first PWA works on low‑end phones and spotty 3G. |
| **Medication‑focused apps** (Medisafe) | Free basic reminders; premium for multi‑device, detailed reports | ~$3–10 /month or ~$30–60 /year | Good value if meds are the main pain point; not a full dementia suite. **Amoha**: Combines medication tracking with care‑logs, agitation detection and voice‑guided suggestions, all offline‑first and free. |
| **GPS / safety trackers** (Life360, Jiobit, AngelSense) | Subscription + sometimes hardware cost | ~$5–20 /month plus device ($30–150 one‑time) | Recurring cost can be a barrier in low‑income settings; data plans add to expense. **Amoha**: No hardware required; optional GPS‑based safe‑zone alerts can be turned on/off; works on any smartphone. |
| **Specialized dementia apps** (Memoryboard, Recollect, etc.) | Subscription or one‑time purchase | ~$5–15 /month; some ~$60–100 /year or one‑time ~$100 | Smaller user bases; pricing often in USD/EUR, expensive after conversion. **Amoha**: Free, India‑focused, multilingual voice guidance, offline‑first, built for the North‑Eastern Region context. |
| **Telehealth / remote monitoring platforms** | Per‑consult fees or institutional contracts | Varies widely; often paid via clinics/insurers, not directly by families | In many countries families mainly use WhatsApp/phone calls rather than formal platforms due to cost and complexity. **Amoha**: Provides a lightweight coordination hub; can add a “call‑ASHA” button without per‑consult costs. |
| **Offline‑first PWA (Amoha – this project)** | **Free forever** | **No subscription** – one‑link web app | • Works offline via service‑worker caching & IndexedDB sync<br>• Voice‑guided, big‑button UI for low‑literacy caregivers<br>• AES‑256 encryption + OTP auth (PDPP compliant)<br>• Integrated medication, care‑logs, agitation detection in a single free package |

## Key Take‑aways for Amoha

- **Free‑core, no‑subscription** is the strongest market differentiator in India’s low‑income NER region.
- **Offline‑first** functionality (service‑worker caching, Background Sync) directly addresses the 3G‑spotty, internet‑unreliable environment.
- **Voice‑guided, big‑button UI** caters to caregivers with visual or literacy challenges.
- **Integrated medication + care‑log + agitation detection** in a single free slice exceeds what most single‑purpose apps offer.
- **Local language support** (Assamese, Bengali, Manipuri, etc.) and regional health‑worker integration can further lock‑out competition.

## Ideas to extend Amoha while staying true to its “free, offline‑first” mission

| Idea | Why it matters for NER caregivers | Implementation sketch |
|------|-----------------------------------|-----------------------|
| **Multilingual voice prompts** (Assamese, Bengali, Hindi, tribal languages) | Many caregivers are more comfortable speaking than reading English. | Use the ML brain (`brain.py`) to generate TTS in regional languages; package language packs as static audio files cached offline. |
| **Low‑bandwidth symptom‑sharing chat** (text‑only, emoji‑based) | Quick “Grandma is restless” entries without a full keyboard. | Add an emoticon picker and store tags (`agitation`, `eating`, `sleep`). |
| **Integration with ASHA/DISHA workers** (one‑click call/SMS) | Frontline workers are the de‑facto support system in villages. | “Contact ASHA” button that dials a pre‑saved number or sends a pre‑written SMS (requires permission). |
| **GPS‑based “safe‑zone” alert (opt‑in)** | Gives families peace of mind without a separate tracker. | When internet available, listen for geofence exits/entries and push local notification; store data locally and sync when online. |
| **Gamified coping cards** (daily “calm‑down” cards, music recommendations) | Keeps engagement and provides ready‑to‑use soothing techniques. | Store a small deck of JSON cards offline; voice prompt can read them. |
| **Care‑recipient health‑trend dashboard** (simple line charts over weeks) | Helps families see patterns (e.g., agitation peaks at dusk). | Render chart using Chart.js with data cached for offline view. |
| **Secure data export for doctors** (PDF/CSV with one‑click) | Reduces the need to recount weeks of notes during clinic visits. | Export endpoint in backend; user chooses “Export → Save locally” or email (email needs internet but file can be stored offline). |

All of the above keep the **core experience free**, **work offline**, and **leverage the existing architecture** (frontend PWA, backend Supabase APIs, service‑worker sync, AES‑256 encryption).

---
*Compiled from the competitor table you provided plus publicly‑available app pricing and feature sets. No external data was fetched; all comparisons are based on the described app types.*