import Dexie, { Table } from "dexie";
import type { CareLog, CarePlanItem, Medicine } from "../types";

export class CareHubDB extends Dexie {
  medicines!: Table<Medicine, number>;
  careLogs!: Table<CareLog, number>;
  carePlan!: Table<CarePlanItem, number>;
  constructor() {
    super("CareHubDB");
    this.version(1).stores({ medicines:"id,name,time,status", careLogs:"++id,category,timestamp,syncStatus", carePlan:"id,title,completed" });
  }
}
export const db = new CareHubDB();

export async function seedDatabase(){
  if(await db.medicines.count()===0) await db.medicines.bulkAdd([
    {id:1,name:"Donepezil",time:"08:00 AM",dosage:"1 tablet",status:"pending"},
    {id:2,name:"Medicine B",time:"08:00 PM",dosage:"1 tablet",status:"pending"}
  ]);
  if(await db.carePlan.count()===0) await db.carePlan.bulkAdd([
    {id:1,title:"Give morning medicine",completed:false},
    {id:2,title:"Help with breakfast",completed:false},
    {id:3,title:"20 minute walk",completed:false},
    {id:4,title:"Check hydration",completed:false},
    {id:5,title:"Evening medicine",completed:false}
  ]);
}