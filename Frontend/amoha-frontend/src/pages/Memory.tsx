import {useState} from "react";
import {ArrowLeft,Mic,UserRound,Volume2} from "lucide-react";
import {useNavigate} from "react-router-dom";

export default function Memory(){
  const nav=useNavigate(); const [listening,setListening]=useState(false);
  const [answer,setAnswer]=useState("");
  const ask=()=>{setListening(true);setAnswer("");setTimeout(()=>{setListening(false);setAnswer("This is Meena's family memory space.");},1200)};
  return <div>
    <button className="back-link" onClick={()=>nav("/home")}><ArrowLeft/> Back to Home</button>
    <div className="page-title"><h1>Memory Assistant</h1><p>Simple voice and visual recall support.</p></div>
    <div className="memory-grid">
      <div className="memory-card"><div className="memory-avatar"><UserRound/></div><h2>Family & People</h2><p>Opt-in face/name recall can be connected here.</p><button><UserRound/> Open people</button></div>
      <div className="memory-card"><div className="memory-avatar"><Mic/></div><h2>Ask by Voice</h2><p>Try questions such as “Who is this?” or “What did I do today?”</p><button onClick={ask}>{listening?<><Volume2/> Listening…</>:<><Mic/> Ask Care Hub</>}</button>{answer&&<div className="voice-answer">{answer}</div>}</div>
    </div>
  </div>
}