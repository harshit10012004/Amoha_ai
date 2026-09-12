import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { readDb, updateDb } from './store.js';
import { auth, signUser } from './auth.js';

const app = express();
const port = Number(process.env.PORT || 4000);
const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
app.use(cors({ origin: clientOrigin, credentials: true }));
app.use(express.json({ limit: '1mb' }));

const ok = (res, data, status = 200) => res.status(status).json({ ok: true, data });
const fail = (res, message, status = 400) => res.status(status).json({ ok: false, message });
const userOf = async id => (await readDb()).users.find(u => u.id === id);

app.get('/api/health', (req, res) => ok(res, { service: 'care-hub-api', status: 'healthy', storage: 'json-demo', time: new Date().toISOString() }));

// Auth
app.post('/api/auth/request-otp', async (req, res) => {
  const phone = String(req.body.phone || '').replace(/\D/g, '');
  if (phone.length < 10) return fail(res, 'Enter a valid phone number');
  const db = await readDb();
  let user = db.users.find(u => u.phone === phone);
  if (!user) {
    user = { id: `u${Date.now()}`, name: 'Care Recipient', phone, role: 'patient', language: 'en', caregiverIds: [] };
    db.users.push(user);
  }
  const code = process.env.DEMO_OTP || '123456';
  db.otp[phone] = { code, expiresAt: Date.now() + 5 * 60 * 1000 };
  await updateDb(d => { d.users = db.users; d.otp = db.otp; });
  ok(res, { message: 'OTP generated', demoOtp: code, user: { id: user.id, name: user.name, role: user.role } });
});

app.post('/api/auth/verify-otp', async (req, res) => {
  const phone = String(req.body.phone || '').replace(/\D/g, '');
  const code = String(req.body.otp || '');
  const db = await readDb();
  const record = db.otp[phone];
  if (!record || record.code !== code || record.expiresAt < Date.now()) return fail(res, 'Invalid or expired OTP', 401);
  const user = db.users.find(u => u.phone === phone);
  delete db.otp[phone];
  await updateDb(d => { d.otp = db.otp; });
  ok(res, { token: signUser(user), user });
});

app.get('/api/me', auth, async (req, res) => ok(res, await userOf(req.user.sub)));

// Patient medicines
app.get('/api/medicines', auth, async (req, res) => ok(res, (await readDb()).medicines.filter(x => x.userId === req.user.sub)));
app.post('/api/medicines', auth, async (req, res) => {
  const item = await updateDb(db => {
    const next = { id: Date.now(), userId: req.user.sub, name: req.body.name || 'Medicine', time: req.body.time || '08:00 AM', dosage: req.body.dosage || '1 tablet', status: 'pending' };
    db.medicines.push(next); return next;
  });
  ok(res, item, 201);
});
for (const [action, status] of [['taken', 'taken'], ['skipped', 'skipped']]) {
  app.post(`/api/medicines/:id/${action}`, auth, async (req, res) => {
    const item = await updateDb(db => {
      const m = db.medicines.find(x => x.id === Number(req.params.id) && x.userId === req.user.sub);
      if (!m) return null;
      m.status = status; m.updatedAt = new Date().toISOString(); return m;
    });
    if (!item) return fail(res, 'Medicine not found', 404);
    ok(res, item);
  });
}

// Care plan
app.get('/api/care-plan', auth, async (req, res) => ok(res, (await readDb()).carePlan.filter(x => x.userId === req.user.sub)));
app.patch('/api/care-plan/:id', auth, async (req, res) => {
  const item = await updateDb(db => {
    const p = db.carePlan.find(x => x.id === Number(req.params.id) && x.userId === req.user.sub);
    if (!p) return null; p.completed = !p.completed; p.updatedAt = new Date().toISOString(); return p;
  });
  if (!item) return fail(res, 'Care plan item not found', 404); ok(res, item);
});

// Care logs / issues
app.get('/api/care-logs', auth, async (req, res) => ok(res, (await readDb()).careLogs.filter(x => x.userId === req.user.sub).sort((a,b) => b.timestamp.localeCompare(a.timestamp))));
app.post('/api/care-logs', auth, async (req, res) => {
  const log = await updateDb(db => {
    const item = { id: Date.now(), userId: req.user.sub, category: req.body.category || 'other', note: req.body.note || '', timestamp: req.body.timestamp || new Date().toISOString(), syncStatus: 'synced' };
    db.careLogs.push(item); return item;
  });
  ok(res, log, 201);
});

// Reminders
app.get('/api/reminders', auth, async (req, res) => ok(res, (await readDb()).reminders.filter(x => x.userId === req.user.sub)));
app.post('/api/reminders', auth, async (req, res) => {
  const reminder = await updateDb(db => { const item = { id: Date.now(), userId: req.user.sub, title: req.body.title || 'Reminder', time: req.body.time || '09:00 AM', enabled: true }; db.reminders.push(item); return item; });
  ok(res, reminder, 201);
});
app.patch('/api/reminders/:id', auth, async (req, res) => {
  const reminder = await updateDb(db => { const item = db.reminders.find(x => x.id === Number(req.params.id) && x.userId === req.user.sub); if (!item) return null; item.enabled = typeof req.body.enabled === 'boolean' ? req.body.enabled : !item.enabled; return item; });
  if (!reminder) return fail(res, 'Reminder not found', 404); ok(res, reminder);
});

// Notifications
app.get('/api/notifications', auth, async (req, res) => ok(res, (await readDb()).notifications.filter(x => x.userId === req.user.sub)));
app.post('/api/notifications', auth, async (req, res) => {
  const n = await updateDb(db => { const item = { id: Date.now(), userId: req.user.sub, title: req.body.title || 'Care Hub notification', body: req.body.body || '', createdAt: new Date().toISOString(), read: false }; db.notifications.push(item); return item; });
  ok(res, n, 201);
});
app.patch('/api/notifications/:id/read', auth, async (req, res) => {
  const n = await updateDb(db => { const item = db.notifications.find(x => x.id === Number(req.params.id) && x.userId === req.user.sub); if (!item) return null; item.read = true; return item; });
  if (!n) return fail(res, 'Notification not found', 404); ok(res, n);
});

// Patient dashboard
app.get('/api/dashboard', auth, async (req, res) => {
  const db = await readDb(); const uid = req.user.sub;
  const meds = db.medicines.filter(x => x.userId === uid);
  const plan = db.carePlan.filter(x => x.userId === uid);
  const logs = db.careLogs.filter(x => x.userId === uid).sort((a,b) => b.timestamp.localeCompare(a.timestamp));
  ok(res, {
    patient: db.users.find(x => x.id === uid),
    medicineCompletion: meds.length ? Math.round(meds.filter(x => x.status === 'taken').length / meds.length * 100) : 0,
    carePlanCompletion: plan.length ? Math.round(plan.filter(x => x.completed).length / plan.length * 100) : 0,
    loggedEvents: logs.length, recentEvents: logs.slice(0, 10), medicines: meds, carePlan: plan,
    reminders: db.reminders.filter(x => x.userId === uid)
  });
});

// Caregiver endpoints
app.get('/api/caregiver/patients', auth, async (req, res) => {
  if (req.user.role !== 'caregiver' && req.user.role !== 'admin') return fail(res, 'Caregiver access required', 403);
  const db = await readDb();
  const patients = db.users.filter(u => u.role === 'patient' && (req.user.role === 'admin' || u.caregiverIds?.includes(req.user.sub))).map(p => {
    const meds = db.medicines.filter(m => m.userId === p.id);
    const plan = db.carePlan.filter(c => c.userId === p.id);
    const logs = db.careLogs.filter(l => l.userId === p.id).sort((a,b) => b.timestamp.localeCompare(a.timestamp));
    return { ...p, medicineCompletion: meds.length ? Math.round(meds.filter(m => m.status === 'taken').length / meds.length * 100) : 0, carePlanCompletion: plan.length ? Math.round(plan.filter(c => c.completed).length / plan.length * 100) : 0, recentEvents: logs.slice(0,5) };
  });
  ok(res, patients);
});

app.get('/api/caregiver/patients/:id/summary', auth, async (req, res) => {
  if (req.user.role !== 'caregiver' && req.user.role !== 'admin') return fail(res, 'Caregiver access required', 403);
  const db = await readDb(); const patient = db.users.find(u => u.id === req.params.id && u.role === 'patient');
  if (!patient) return fail(res, 'Patient not found', 404);
  if (req.user.role === 'caregiver' && !patient.caregiverIds?.includes(req.user.sub)) return fail(res, 'Patient is not assigned to you', 403);
  ok(res, { patient, medicines: db.medicines.filter(m => m.userId === patient.id), carePlan: db.carePlan.filter(c => c.userId === patient.id), careLogs: db.careLogs.filter(l => l.userId === patient.id).sort((a,b) => b.timestamp.localeCompare(a.timestamp)), reminders: db.reminders.filter(r => r.userId === patient.id), notifications: db.notifications.filter(n => n.userId === patient.id) });
});


// Personalized care features
app.get('/api/about-me', auth, async (req,res) => {
  const db = await readDb();
  ok(res, db.aboutMe?.find(x=>x.userId===req.user.sub) || {userId:req.user.sub,name:(db.users.find(u=>u.id===req.user.sub)||{}).name||'Care Recipient',favoriteMusic:'90s Bollywood',likes:'Morning tea, gardening, cricket',dislikes:'Loud noises, crowded places',helps:'Speak slowly. Give one instruction at a time.'});
});
app.put('/api/about-me', auth, async (req,res) => {
  const item = await updateDb(db=>{ db.aboutMe=db.aboutMe||[]; let x=db.aboutMe.find(v=>v.userId===req.user.sub); if(!x){x={userId:req.user.sub};db.aboutMe.push(x)} Object.assign(x,{name:req.body.name||x.name||'Care Recipient',favoriteMusic:req.body.favoriteMusic||'',likes:req.body.likes||'',dislikes:req.body.dislikes||'',helps:req.body.helps||''}); return x; });
  ok(res,item);
});
app.get('/api/memories', auth, async (req,res)=>ok(res,(await readDb()).memories?.filter(x=>x.userId===req.user.sub)||[]));
app.get('/api/timeline', auth, async (req,res)=>ok(res,(await readDb()).careLogs.filter(x=>x.userId===req.user.sub).sort((a,b)=>b.timestamp.localeCompare(a.timestamp)).slice(0,30)));

app.get('/api/openapi.json', (req, res) => ok(res, { openapi: '3.0.3', info: { title: 'Care Hub API', version: '1.0.0' }, servers: [{ url: `http://localhost:${port}/api` }], paths: { '/health': { get: {} }, '/auth/request-otp': { post: {} }, '/auth/verify-otp': { post: {} }, '/medicines': { get: {}, post: {} }, '/care-plan': { get: {} }, '/care-logs': { get: {}, post: {} }, '/reminders': { get: {}, post: {} }, '/dashboard': { get: {} }, '/caregiver/patients': { get: {} } } }));
app.use((req, res) => fail(res, 'API route not found', 404));
app.listen(port, () => console.log(`Care Hub API running on http://localhost:${port}`));
