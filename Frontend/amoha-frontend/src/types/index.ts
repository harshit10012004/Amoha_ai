export type Role = "caregiver" | "recipient" | "healthWorker";
export type SyncStatus = "synced" | "offline" | "failed" | "pending";

export interface Medicine { id:number; name:string; time:string; dosage:string; status:"pending"|"taken"|"skipped"; }
export interface CareLog { id?:number; category:string; note:string; timestamp:string; syncStatus:SyncStatus; }
export interface CarePlanItem { id:number; title:string; completed:boolean; }
export interface UserSession { name:string; role:Role; language:"en"|"hi"; onboarded:boolean; }