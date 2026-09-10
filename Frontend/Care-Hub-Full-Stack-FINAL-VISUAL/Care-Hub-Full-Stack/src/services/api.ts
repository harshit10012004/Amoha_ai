const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

async function request(path:string, options:RequestInit={}){
  const token=localStorage.getItem('carehub-token');
  const headers=new Headers(options.headers||{});
  headers.set('Content-Type','application/json');
  if(token) headers.set('Authorization',`Bearer ${token}`);
  const res=await fetch(`${API_URL}${path}`,{...options,headers});
  const body=await res.json().catch(()=>({}));
  if(!res.ok) throw new Error(body.message||'Request failed');
  return body.data ?? body;
}
export const api={
  requestOtp:(phone:string)=>request('/auth/request-otp',{method:'POST',body:JSON.stringify({phone})}),
  verifyOtp:(phone:string,otp:string)=>request('/auth/verify-otp',{method:'POST',body:JSON.stringify({phone,otp})}),
  me:()=>request('/me'),
  getMedicines:()=>request('/medicines'),
  createMedicine:(payload:unknown)=>request('/medicines',{method:'POST',body:JSON.stringify(payload)}),
  markMedicineTaken:(id:number)=>request(`/medicines/${id}/taken`,{method:'POST'}),
  markMedicineSkipped:(id:number)=>request(`/medicines/${id}/skipped`,{method:'POST'}),
  createCareLog:(payload:unknown)=>request('/care-logs',{method:'POST',body:JSON.stringify(payload)}),
  getCareLogs:()=>request('/care-logs'),
  getCarePlan:()=>request('/care-plan'),
  updateCarePlanItem:(id:number)=>request(`/care-plan/${id}`,{method:'PATCH'}),
  getReminders:()=>request('/reminders'),
  createReminder:(payload:unknown)=>request('/reminders',{method:'POST',body:JSON.stringify(payload)}),
  toggleReminder:(id:number,enabled:boolean)=>request(`/reminders/${id}`,{method:'PATCH',body:JSON.stringify({enabled})}),
  getDashboard:()=>request('/dashboard'),
  getNotifications:()=>request('/notifications'),
  markNotificationRead:(id:number)=>request(`/notifications/${id}/read`,{method:'PATCH'}),
  getAboutMe:()=>request('/about-me'),
  updateAboutMe:(payload:unknown)=>request('/about-me',{method:'PUT',body:JSON.stringify(payload)}),
  getMemories:()=>request('/memories'),
  getTimeline:()=>request('/timeline')
};
