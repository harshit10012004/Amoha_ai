# 🔵 Blue Module - Offline & Connectivity Lead
## Detailed Role Report for Team Amoha

---

## 👤 Your Role: Blue - Offline & Connectivity Lead

**Folder:** `/offline/`

**Core Mission:** Ensure the Amoha app works reliably when the internet is down—which is common in India's North Eastern Region (NER) hills and remote areas. You make the "offline-first" promise a reality.

---

## 🎯 Key Responsibilities

### 1. **Offline-First Experience**
- The app must function **without any internet connection**
- Caregivers in areas with spotty 3G/4G coverage should still be able to:
  - View patient care plans
  - Log medications and observations
  - Play cognitive games
  - Access care instructions

### 2. **Local Storage Management**
- Implement **IndexedDB** or **SQLite** for local data persistence
- Store care logs, game scores, patient notes locally when offline
- Cache essential app shell and screens for immediate loading

### 3. **Background Sync Protocol**
- Detect when internet connectivity is restored
- **Retry sending** pending care logs and game data to the backend
- Implement exponential backoff to avoid overwhelming the server
- Track sync status for each piece of data

### 4. **SMS Fallback for Critical Reminders**
- For critical medication reminders that couldn't be delivered offline
- Integrate with SMS gateways or Twilio-like services
- Ensure high-priority alerts always reach caregivers

### 5. **Data Integrity & Conflict Resolution**
- Handle cases where data was edited offline and online simultaneously
- Implement simple conflict resolution (last-write-wins or manual merge)
- Ensure no data loss during sync transitions

---

## 🔗 Integration Points (How You Connect to Others)

### **🟠 Orange (Frontend) Connection**
- **You cache:** The app screens Orange builds (PWA shell)
- **They cache your data:** Orange stores data locally that you manage
- **Interaction:** When Orange's UI needs to read/write data, it calls your sync functions
- **Key handoff:** Orange → You: "Here's the new care log" → You → Local Storage
- **You → Orange:** "Data synced successfully" → Orange updates UI

> **From the project docs:** "Blue ensures everything works without the internet. Connects to: Orange (caches the app screens), Yellow (syncs offline data to the cloud), Green (makes sure the brain's files are tiny enough to cache offline)."

### **🟡 Yellow (Backend/Database) Connection**
- **You sync to:** Your offline data goes to Yellow's APIs when internet returns
- **They provide:** REST endpoints for sync (`POST /sync`, `GET /pending-syncs`)
- **Interaction:** 
  - Local data → Queue for sync → Yellow API → PostgreSQL
  - Yellow API → Local cache (for offline re-use)
- **Key handoff:** You → Yellow: "Here's batch of care logs ready to upload" → Yellow stores them

> **From the project docs:** "Yellow builds the plumbing. Stores data (PostgreSQL) and provides APIs for Orange to call. Receives data from Orange and passes it to Green. Connects to: Blue (syncs offline data to the cloud)."

### **🟢 Green (AI/ML) Connection**
- **You ensure:** Green's brain files (models, data) are tiny enough to cache offline
- **They provide:** The `brain.py` with `analyze_care_log()` function
- **Interaction:** 
  - Green's files stored in IndexedDB/SQLite offline cache
  - When offline, app uses cached brain results
  - When online, fresh results from Yellow's API
- **Key constraint:** Green's implementation must stay lightweight (only `json`, `re` - no heavy AI libraries)

> **From the project docs:** "Green builds the brain that reads text and gives advice. Connects to: Yellow (Yellow will import your function or call your mock API)."

### **🟣 Purple (Security) Connection**
- **You encrypt:** Offline storage containing patient data
- **They provide:** Encryption libraries and auth flow
- **Interaction:** 
  - Before storing data locally → encrypt with Purple's keys
  - After sync → data is already encrypted end-to-end
- **Key handoff:** Purple → You: "Here are encryption standards" → You → Offline storage

> **From the project docs:** "Purple protects patient health data. Connects to: Blue (encrypts offline storage)."

### **🔴 Red (Project Lead) Connection**
- **You report:** Progress on offline functionality and sync status
- **They coordinate:** Overall project timeline and integration
- **Key deliverable:** Combined demo by Sept 11 that includes offline working

---

## 📋 Your Key Deliverables

### 1. **Service Worker Configuration**
- Set up Workbox or custom service worker
- Cache app shell (HTML, CSS, JS) for instant loading
- Implement runtime caching strategy for API responses

### 2. **Offline Data Storage Schema**
- Design SQLite/IndexedDB tables for:
  - Care logs (text, tags, timestamps)
  - Game scores and accuracy data
  - Medication reminders
  - Patient preferences
- Migration script for schema updates

### 3. **Sync Protocol Implementation**
- Function to queue data for upload:
  ```javascript
  function queueForSync(dataType, data) { ... }
  ```
- Function to check connectivity and sync:
  ```javascript
  async function trySync() { ... }
  ```
- Error handling for failed syncs
- Retry counter and backoff timing

### 4. **SMS Fallback System** (Optional but recommended)
- Integration points for critical reminder delivery
- Fallback mechanism when offline delivery isn't possible

### 5. **Connectivity Detection**
- Monitor network status changes
- Auto-trigger sync when connection restores
- User notification when sync completes

---

## 🧪 Testing Your Offline Functionality

### **Test Scenarios**

| Scenario | Expected Behavior |
|----------|-------------------|
| App opens completely offline | Full functionality with cached data |
| User logs a care log offline | Stored locally, syncs when online |
| User plays game offline | Score cached, uploaded when online |
| Internet drops mid-session | Graceful degradation, data preserved |
| Internet restores after outage | Automatic sync of pending data |
| Multiple care logs offline | All queued and sent in batch |

### **Success Criteria for Blue**
- [ ] App launches and works without internet connection
- [ ] Care logs saved offline are successfully synced when online
- [ ] Game scores persisted locally and uploaded to backend
- [ ] No data loss during offline→online transitions
- [ ] Critical reminders have SMS fallback
- [ ] Service worker doesn't break on updates

---

## ⏰ Timeline & Milestones

### **Sept 4-5:** Foundation
- Set up `/offline/` folder structure
- Implement basic service worker
- Design local storage schema

### **Sept 5-8:** Core Sync
- Implement sync protocol
- Queue/desync mechanism
- Basic connectivity detection

### **Sept 8-10:** Robustness
- SMS fallback implementation
- Conflict resolution
- Comprehensive testing

### **Sept 11:** Demo Day
- Working offline-first demo
- All modules integrated
- One-link access on phone

---

## 💡 Pro Tips from the Team

1. **Start simple:** Begin with SQLite (easier to implement than IndexedDB, works in more browsers)

2. **Cache strategically:** Don't cache everything - prioritize:
   - App shell (always needed)
   - Patient care plans (frequently accessed)
   - Keyword lists for Green's brain (static, small)

3. **Sync in batches:** Don't send one record at a time - group into batches for efficiency

4. **Handle the "cold start":** When user first opens app offline, show cached/latest data with clear "last updated" timestamp

5. **User feedback:** Show sync status visibly (✓ synced, ⚠ pending, 🔄 syncing)

6. **Keep Green's files tiny:** Your main constraint - Green's brain.py and data must fit in offline cache. Stick to `json`, `re` only. No numpy/pandas files larger than ~500KB.

---

## 📚 Resources & References

- **Service Workers:** MDN Web Docs, Workbox library
- **IndexedDB:** `idb` wrapper library simplifies usage
- **SQLite for Web:** `sql.js` or `better-sqlite3` (WebAssembly)
- **SMS Gateways:** Twilio, MSG91 (for Indian numbers)
- **Project Docs:** See `/description.txt` for full architecture
- **Green's brain.py:** `/amoha_ai/Amoha_ai_ml/brain.py` - keep your cache compatible with its output format
- **Yellow's API endpoints:** `POST /care-log`, `GET /suggestions`, plus new `POST /sync` endpoints

---

## 🎯 Final Thought

**"Offline-first isn't about removing internet - it's about respecting the user's reality."**

In NER's hills, 3G drops, power goes out, and connectivity is precious. Your work ensures that a caregiver in a remote village can still log Grandma's symptoms, even without a single bar of signal. When the net returns, her data seamlessly joins the rest of her care story.

You are the safety net that makes Amoha truly accessible. **Thank you for keeping care within reach, always.**

---

*This report covers your role from start to finish: understanding the architecture, connecting with teammates, implementing offline functionality, and delivering a working demo by Sept 11.*

**Key reminder:** Your success criteria are tied to the project's overall success criteria #2: "No internet? Still works (offline-first)."