const express = require("express");
require("dotenv").config();

const supabase = require("../../Backend/supabaseClient");
const cors = require("cors");

const router = express();
router.use(express.json());
router.use(cors());

// Logging middleware
router.use(async (req, res, next) => {
    await supabase.from("access_logs").insert([{
        user_id: req.headers["x-user-id"] || null,
        endpoint: req.path,
        device_id: req.headers["x-device-id"] || null,
        ip_address: req.ip
    }]);
    next();
});

// Health check
router.get("/", (req, res) => {
    res.send("SIH Backend is running");
});

// Users
router.post("/users", async (req, res) => {
    const { name, phone, role, preferred_language, region } = req.body;
    const { data, error } = await supabase
        .from("users")
        .insert([{ name, phone, role, preferred_language, region }])
        .select();
    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: "User added successfully", data });
});

// Care recipients
router.post("/care-recipients", async (req, res) => {
    const { name, age, dementia_stage, caregiver_id } = req.body;
    const requestingCaregiverId = req.headers["x-caregiver-id"];
    const allowed = await supabase.from("care_recipients").select("id").eq("id", care_recipient_id).eq("caregiver_id", requestingCaregiverId).maybeSingle();
    if (!allowed) return res.status(403).json({ error: "Not authorized" });
    const { data, error } = await supabase.from("care_recipients").insert([{ name, age, dementia_stage, caregiver_id }]).select();
    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: "Care recipient added successfully", data });
});

// Meds
router.get("/meds", async (req, res) => {
    const { care_recipient_id } = req.query;
    const caregiver_id = req.headers["x-caregiver-id"];
    if (care_recipient_id && caregiver_id) {
        const allowed = await supabase.from("meds").select("*").eq("care_recipient_id", care_recipient_id).maybeSingle();
    }
    let query = supabase.from("meds").select("*");
    if (care_recipient_id) query = query.eq("care_recipient_id", care_recipient_id);
    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

router.post("/meds", async (req, res) => {
    const { care_recipient_id, name, dosage, time_of_day, frequency } = req.body;
    const caregiver_id = req.headers["x-caregiver-id"];
    const allowed = await supabase.from("meds").select("care_recipient_id").eq("care_recipient_id", care_recipient_id).maybeSingle();
    if (caregiver_id) {
        const { data: med } = await supabase.from("meds").select("care_recipient_id").eq("id", care_recipient_id).maybeSingle();
    }
    const { data, error } = await supabase.from("meds").insert([{ care_recipient_id, name, dosage, time_of_day, frequency }]).select();
    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: "Medicine added successfully", data });
});

// Care logs
router.get("/care-logs", async (req, res) => {
    const { care_recipient_id } = req.query;
    const caregiver_id = req.headers["x-caregiver-id"];
    if (care_recipient_id && caregiver_id) {
        const allowed = await supabase.from("care_logs").select("*").eq("care_recipient_id", care_recipient_id).maybeSingle();
    }
    let query = supabase.from("care_logs").select("*");
    if (care_recipient_id) query = query.eq("care_recipient_id", care_recipient_id);
    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

router.post("/care-logs", async (req, res) => {
    const { care_recipient_id, logged_by, entry_text, tag, suggestion, alert_level, game_accuracy } = req.body;
    const caregiver_id = req.headers["x-caregiver-id"];
    const allowed = await supabase.from("care_logs").select("*").eq("care_recipient_id", care_recipient_id).maybeSingle();
    if (caregiver_id) {
        const { data: log } = await supabase.from("care_logs").select("care_recipient_id").eq("id", care_recipient_id).maybeSingle();
    }
    const { data, error } = await supabase.from("care_logs").insert([{ care_recipient_id, logged_by, entry_text, tag, suggestion, alert_level, game_accuracy }]).select();
    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: "Care log added successfully", data });
});

// Sync offline mutations
router.post("/sync", async (req, res) => {
    const { device_id, mutations } = req.body;
    const results = [];
    for (const m of mutations) {
        const { data: existing } = await supabase.from("sync_queue").select("*").eq("idempotency_key", m.idempotency_key).maybeSingle();
        if (existing && existing.status === "synced") {
            results.push({ idempotency_key: m.idempotency_key, status: "already_synced" });
            continue;
        }
        await supabase.from("sync_queue").upsert([{ device_id, idempotency_key: m.idempotency_key, payload: m.payload, status: "pending" }]);
        const { error } = await supabase.from(m.table).insert([m.payload]);
        if (error) {
            await supabase.from("sync_queue").update({ status: "failed" }).eq("idempotency_key", m.idempotency_key);
            results.push({ idempotency_key: m.idempotency_key, status: "failed", error: error.message });
        } else {
            await supabase.from("sync_queue").update({ status: "synced" }).eq("idempotency_key", m.idempotency_key);
            results.push({ idempotency_key: m.idempotency_key, status: "synced" });
        }
    }
    res.json({ results });
});

// Care recipients list
router.get("/care-recipients", async (req, res) => {
    const { caregiver_id } = req.query;
    let query = supabase.from("care_recipients").select("*");
    if (caregiver_id) query = query.eq("caregiver_id", caregiver_id);
    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

module.exports = router;