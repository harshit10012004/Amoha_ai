import {Bell,CalendarClock,ArrowLeft,CheckCircle2} from "lucide-react";
import {useNavigate} from "react-router-dom";
export default function Reminders(){
 const nav=useNavigate();
 const items=[["08:00 AM","Medicine","Donepezil — 1 tablet"],["10:30 AM","Routine","20 minute walk"],["08:00 PM","Medicine","Medicine B — 1 tablet"]];
 return <div><button className="back-link" onClick={()=>nav("/home")}><ArrowLeft/> Back to Home</button>
 <div className="page-title"><h1>Reminders</h1><p>Medication, appointments and daily routines.</p></div>
 <div className="stack">{items.map((x,i)=><div className="reminder-card" key={i}><span className="reminder-time">{x[0]}</span><div><b>{x[1]}</b><p>{x[2]}</p></div><CheckCircle2/></div>)}</div>
 </div>
}