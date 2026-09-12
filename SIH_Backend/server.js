require("dotenv").config();

const express = require("express");
const supabase = require("./supabaseClient");

const cors = require("cors");
const app = express();

app.use(express.json());

app.use(cors());


//LOGGING MIDDLEWARE HERE
app.use(async (req, res, next) => {
    await supabase.from("access_logs").insert([{
        user_id: req.headers["x-user-id"] || null,
        endpoint: req.path,
        device_id: req.headers["x-device-id"] || null,
        ip_address: req.ip
    }]);
    next();
});

// verifyOwnership function
async function verifyOwnership(caregiver_id, care_recipient_id) {
    const { data } = await supabase
        .from("care_recipients")
        .select("id")
        .eq("id", care_recipient_id)
        .eq("caregiver_id", caregiver_id)
        .maybeSingle();
    return !!data;
}

app.get("/", (req, res) => {
    res.send("SIH Backend is running");
});


// POST a new user
app.post("/users", async (req, res) => {
    const { name, phone, role, preferred_language, region } = req.body;

    const { data, error } = await supabase
        .from("users")
        .insert([{ name, phone, role, preferred_language, region }])
        .select();

    if (error) return res.status(500).json({ error: error.message });

    res.json({ message: "User added successfully", data });
});


// POST a new care recipient
app.post("/care-recipients", async (req, res) => {
    const { name, age, dementia_stage, caregiver_id } = req.body;
    const requestingCaregiverId = req.headers["x-caregiver-id"];

    const allowed = await verifyOwnership(requestingCaregiverId, caregiver_id);
    if (!allowed) return res.status(403).json({ error: "Not authorized to add care recipient" });

    const { data, error } = await supabase
        .from("care_recipients")
        .insert([{ name, age, dementia_stage, caregiver_id }])
        .select();

    if (error) return res.status(500).json({ error: error.message });

    res.json({ message: "Care recipient added successfully", data });
});


//Get meds by care_recipient_id or gets all meds
app.get("/meds", async (req, res) => {
    const { care_recipient_id } = req.query;
    const caregiver_id = req.headers["x-caregiver-id"];

    if (care_recipient_id && caregiver_id) {
        const allowed = await verifyOwnership(caregiver_id, care_recipient_id);
        if (!allowed) return res.status(403).json({ error: "Not authorized to view this patient's data" });
    }

    let query = supabase.from("meds").select("*");
    if (care_recipient_id) query = query.eq("care_recipient_id", care_recipient_id);
    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// POST a new med
app.post("/meds", async (req, res) => {
    const { care_recipient_id, name, dosage, time_of_day, frequency } = req.body;
    const caregiver_id = req.headers["x-caregiver-id"];

    const allowed = await verifyOwnership(caregiver_id, care_recipient_id);
    if (!allowed) return res.status(403).json({ error: "Not authorized to add data for this patient" });

    const { data, error } = await supabase
        .from("meds")
        .insert([{ care_recipient_id, name, dosage, time_of_day, frequency }])
        .select();
    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: "Medicine added successfully", data });
});



//Get care-log by care_recipient_id or get all all care logs
app.get("/care-logs", async (req, res) => {
    const { care_recipient_id } = req.query;
    const caregiver_id = req.headers["x-caregiver-id"];

    if (care_recipient_id && caregiver_id) {
        const allowed = await verifyOwnership(caregiver_id, care_recipient_id);
        if (!allowed) return res.status(403).json({ error: "Not authorized to view this patient's data" });
    }

    let query = supabase.from("care_logs").select("*");
    if (care_recipient_id) {
        query = query.eq("care_recipient_id", care_recipient_id);
    }
    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// POST a new care log
app.post("/care-logs", async (req, res) => {
    const { care_recipient_id, logged_by, entry_text, tag, suggestion, alert_level, game_accuracy } = req.body;
    const caregiver_id = req.headers["x-caregiver-id"];

    const allowed = await verifyOwnership(caregiver_id, care_recipient_id);
    if (!allowed) return res.status(403).json({ error: "Not authorized to add data for this patient" });

    const { data, error } = await supabase
        .from("care_logs")
        .insert([{ care_recipient_id, logged_by, entry_text, tag, suggestion, alert_level, game_accuracy }])
        .select();
    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: "Care log added successfully", data });
});


// UPDATE a med
app.put("/meds/:id", async (req, res) => {
    const { id } = req.params;
    const caregiver_id = req.headers["x-caregiver-id"];
    const { name, dosage, time_of_day, frequency } = req.body;

    const { data: med } = await supabase.from("meds").select("care_recipient_id").eq("id", id).maybeSingle();
    if (!med) return res.status(404).json({ error: "Medicine not found" });

    const allowed = await verifyOwnership(caregiver_id, med.care_recipient_id);
    if (!allowed) return res.status(403).json({ error: "Not authorized to update this record" });

    const { data, error } = await supabase
        .from("meds")
        .update({ name, dosage, time_of_day, frequency })
        .eq("id", id)
        .select();
    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: "Medicine updated successfully", data });
});

// DELETE a med
app.delete("/meds/:id", async (req, res) => {
    const { id } = req.params;
    const caregiver_id = req.headers["x-caregiver-id"];

    // look up which patient this med belongs to
    const { data: med } = await supabase.from("meds").select("care_recipient_id").eq("id", id).maybeSingle();
    if (!med) return res.status(404).json({ error: "Medicine not found" });

    const allowed = await verifyOwnership(caregiver_id, med.care_recipient_id);
    if (!allowed) return res.status(403).json({ error: "Not authorized to delete this record" });

    const { error } = await supabase.from("meds").delete().eq("id", id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: "Medicine deleted successfully" });
});

// UPDATE a care log
app.put("/care-logs/:id", async (req, res) => {
    const { id } = req.params;
    const caregiver_id = req.headers["x-caregiver-id"];
    const { entry_text, tag, suggestion, alert_level } = req.body;

    const { data: log } = await supabase.from("care_logs").select("care_recipient_id").eq("id", id).maybeSingle();
    if (!log) return res.status(404).json({ error: "Care log not found" });

    const allowed = await verifyOwnership(caregiver_id, log.care_recipient_id);
    if (!allowed) return res.status(403).json({ error: "Not authorized to update this record" });

    const { data, error } = await supabase
        .from("care_logs")
        .update({ entry_text, tag, suggestion, alert_level })
        .eq("id", id)
        .select();
    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: "Care log updated successfully", data });
});

// DELETE a care log
app.delete("/care-logs/:id", async (req, res) => {
    const { id } = req.params;
    const caregiver_id = req.headers["x-caregiver-id"];

    const { data: log } = await supabase.from("care_logs").select("care_recipient_id").eq("id", id).maybeSingle();
    if (!log) return res.status(404).json({ error: "Care log not found" });

    const allowed = await verifyOwnership(caregiver_id, log.care_recipient_id);
    if (!allowed) return res.status(403).json({ error: "Not authorized to delete this record" });

    const { error } = await supabase.from("care_logs").delete().eq("id", id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: "Care log deleted successfully" });
});

// Sync Offline mutations to the server with idempotency handling
app.post("/sync", async (req, res) => {
    const { device_id, mutations } = req.body;
    const results = [];

    for (const m of mutations) {
        // 1. check if this idempotency_key was already synced
        const { data: existing } = await supabase
            .from("sync_queue")
            .select("*")
            .eq("idempotency_key", m.idempotency_key)
            .maybeSingle();

        if (existing && existing.status === "synced") {
            results.push({ idempotency_key: m.idempotency_key, status: "already_synced" });
            continue;
        }

        // 2. log the mutation attempt in sync_queue
        await supabase.from("sync_queue").upsert([{
            device_id,
            idempotency_key: m.idempotency_key,
            payload: m.payload,
            status: "pending"
        }]);

        // 3. actually apply it to the target table (meds or care_logs)
        const { error } = await supabase.from(m.table).insert([m.payload]);

        if (error) {
            await supabase.from("sync_queue")
                .update({ status: "failed" })
                .eq("idempotency_key", m.idempotency_key);
            results.push({ idempotency_key: m.idempotency_key, status: "failed", error: error.message });
        } else {
            await supabase.from("sync_queue")
                .update({ status: "synced" })
                .eq("idempotency_key", m.idempotency_key);
            results.push({ idempotency_key: m.idempotency_key, status: "synced" });
        }
    }

    res.json({ results });
});


//Should give only caregiver patient
app.get("/care-recipients", async (req, res) => {
    const { caregiver_id } = req.query;
    let query = supabase.from("care_recipients").select("*");
    if (caregiver_id) {
        query = query.eq("caregiver_id", caregiver_id);
    }
    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});


app.listen(3000, () => {
    console.log("SIH Backend is running on port 3000");
});