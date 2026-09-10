import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { db } from "../db/database";
import type { CarePlanItem as CarePlanItemType } from "../types";
import CarePlanItemView from "../components/CarePlanItem";
import { api } from "../services/api";

export default function CarePlan() {
  const { t } = useTranslation();
  const [items, setItems] = useState<CarePlanItemType[]>([]);

  useEffect(() => {
    db.carePlan.toArray().then(setItems);
    if(navigator.onLine && localStorage.getItem("carehub-token")) api.getCarePlan().then(async remote=>{if(remote?.length){await db.carePlan.clear();await db.carePlan.bulkAdd(remote);setItems(remote)}}).catch(()=>{});
  }, []);

  const toggle = async (id: number) => {
    const item = items.find((current) => current.id === id);
    if (!item) return;

    await db.carePlan.update(id, { completed: !item.completed });
    if(navigator.onLine && localStorage.getItem("carehub-token")) { try { await api.updateCarePlanItem(id); } catch {} }
    setItems(await db.carePlan.toArray());
  };

  const done = items.filter((item) => item.completed).length;
  const percent = items.length ? (done / items.length) * 100 : 0;

  return (
    <>
      <div className="page-title">
        <h1>{t("plan")}</h1>
        <p>{t("todayProgress")}</p>
      </div>

      <div className="plan-progress">
        <div>
          <b>
            {done} / {items.length}
          </b>
          <span>{t("completed")}</span>
        </div>
        <div className="progress">
          <i style={{ width: `${percent}%` }} />
        </div>
      </div>

      <div className="stack">
        {items.map((item) => (
          <CarePlanItemView
            key={item.id}
            item={item}
            onClick={() => toggle(item.id)}
          />
        ))}
      </div>
    </>
  );
}
