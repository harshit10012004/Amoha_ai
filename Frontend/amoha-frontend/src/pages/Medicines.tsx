import { CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { db } from "../db/database";
import type { Medicine } from "../types";
import MedicineCard from "../components/MedicineCard";
import SyncStatus from "../components/SyncStatus";
import { api } from "../services/api";

export default function Medicines() {
  const { t } = useTranslation();
  const [meds, setMeds] = useState<Medicine[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    db.medicines.toArray().then(setMeds);
    if(navigator.onLine && localStorage.getItem("carehub-token")) api.getMedicines().then(async remote=>{if(remote?.length){await db.medicines.clear();await db.medicines.bulkAdd(remote);setMeds(remote)}}).catch(()=>{});
  }, []);

  const updateMedicine = async (id: number, status: "taken" | "skipped") => {
    await db.medicines.update(id, { status });
    if(navigator.onLine && localStorage.getItem("carehub-token")) { try { status === "taken" ? await api.markMedicineTaken(id) : await api.markMedicineSkipped(id); } catch {} }
    setMeds(await db.medicines.toArray());
    setMessage(status === "taken" ? t("taken") : "Medicine skipped");
    window.setTimeout(() => setMessage(""), 2200);
  };

  const taken = meds.filter((medicine) => medicine.status === "taken").length;

  return (
    <>
      <div className="page-title">
        <h1>{t("meds")}</h1>
        <p>Today’s medication list</p>
      </div>

      <div className="progress-strip">
        <CheckCircle2 />
        <div>
          <b>
            {taken} / {meds.length} {t("done")}
          </b>
          <span>Medication adherence today</span>
        </div>
      </div>

      {message && <div className="success-banner">✓ {message}</div>}

      <div className="stack">
        {meds.length > 0 ? (
          meds.map((medicine) => (
            <MedicineCard
              key={medicine.id}
              m={medicine}
              onTake={() => updateMedicine(medicine.id, "taken")}
              onSkip={() => updateMedicine(medicine.id, "skipped")}
            />
          ))
        ) : (
          <div className="empty">
            {t("noMeds")}
            <button type="button">{t("addMedicine")}</button>
          </div>
        )}
      </div>

      <SyncStatus online={navigator.onLine} />
    </>
  );
}
