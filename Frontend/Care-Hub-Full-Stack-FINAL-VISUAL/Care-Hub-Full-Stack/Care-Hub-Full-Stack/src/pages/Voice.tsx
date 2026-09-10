import { useState } from "react";
import { ArrowLeft, Mic, Volume2, LoaderCircle, Square } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { speak, stopSpeaking } from "../services/tts";

export default function Voice(){
  const nav=useNavigate();
  const [state,setState]=useState<'idle'|'listening'|'processing'|'response'>('idle');
  const [speaking,setSpeaking]=useState(false);
  const answer="Today’s care activities and reminders are available on your Home screen.";
  const ask=()=>{
    stopSpeaking();
    setState('listening');
    setTimeout(()=>setState('processing'),1100);
    setTimeout(()=>setState('response'),2100);
  };
  const readAnswer=()=>{
    const ok=speak(answer);
    if(ok){setSpeaking(true); window.setTimeout(()=>setSpeaking(false), Math.max(2200, answer.length*65));}
  };
  return <div>
    <button className="back-link" onClick={()=>nav('/home')}><ArrowLeft/> Back</button>
    <div className="page-title"><h1>Voice / Ask</h1><p>Speak a simple question or listen to Care Hub.</p></div>
    <div className="voice-panel">
      <div className={`voice-circle ${state}`}><Mic/></div>
      {state==='idle'&&<><h2>Ask Care Hub</h2><p>Try “What did I do today?”</p><button className="big-action" onClick={ask}><Mic/> Start Listening</button></>}
      {state==='listening'&&<><h2>Listening…</h2><p>Take your time.</p><div className="voice-state"><Mic/> Listening</div></>}
      {state==='processing'&&<><h2>Thinking…</h2><p>One moment.</p><div className="voice-state"><LoaderCircle className="spin"/> Processing</div></>}
      {state==='response'&&<><h2>Here is your answer</h2><p>{answer}</p><div className="voice-answer"><Volume2/> Response ready</div><div className="voice-actions"><button className="big-action" onClick={readAnswer}>{speaking?<><Square/> Stop Voice</>:<><Volume2/> Read Aloud</>}</button><button className="big-action secondary-action" onClick={()=>{stopSpeaking();setSpeaking(false);setState('idle')}}>Ask Again</button></div></>}
    </div>
  </div>
}
