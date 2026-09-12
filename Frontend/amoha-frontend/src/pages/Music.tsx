import {useEffect,useRef,useState} from "react";
import {ArrowLeft,Pause,Play,Volume2,VolumeX,Music2,Heart,Headphones} from "lucide-react";
import {useNavigate} from "react-router-dom";
import {speak} from "../services/tts";

type Track={id:string;title:string;subtitle:string;bpm:number;wave:"sine"|"triangle"|"sawtooth"};
const tracks:Track[]=[
 {id:"memories",title:"90s Memory Groove",subtitle:"Warm synths • gentle beat • nostalgic",bpm:82,wave:"sine"},
 {id:"morning",title:"90s Morning Drive",subtitle:"Bright keys • soft bass • easy rhythm",bpm:96,wave:"triangle"},
 {id:"retro",title:"Retro Evening",subtitle:"Smooth synth pad • slow groove",bpm:74,wave:"sawtooth"},
];

function noteHz(note:number){return 440*Math.pow(2,(note-69)/12)}

export default function Music(){
 const nav=useNavigate();
 const [selected,setSelected]=useState(tracks[0]);
 const [playing,setPlaying]=useState(false);
 const [muted,setMuted]=useState(false);
 const [volume,setVolume]=useState(0.18);
 const ctx=useRef<AudioContext|null>(null);
 const master=useRef<GainNode|null>(null);
 const timer=useRef<number|undefined>(undefined);
 const step=useRef(0);
 const current=useRef<Track>(tracks[0]);

 const ensure=()=>{
  if(!ctx.current){
   const Ctx=(window.AudioContext||(window as any).webkitAudioContext); if(!Ctx)return null;
   ctx.current=new Ctx(); master.current=ctx.current.createGain(); master.current.gain.value=volume; master.current.connect(ctx.current.destination);
  }
  if(ctx.current.state==='suspended')ctx.current.resume();
  return ctx.current;
 };
 const tone=(freq:number,dur:number,type:OscillatorType,when:number,gain=0.08)=>{
  const c=ctx.current,m=master.current;if(!c||!m)return;
  const o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(0.0001,when);g.gain.exponentialRampToValueAtTime(gain,when+0.015);g.gain.exponentialRampToValueAtTime(0.0001,when+dur);o.connect(g);g.connect(m);o.start(when);o.stop(when+dur+0.03);
 };
 const kick=(when:number)=>tone(82,0.12,"sine",when,0.12);
 const hat=(when:number)=>tone(2600,0.035,"square",when,0.018);
 const tick=()=>{
  const c=ensure(); if(!c)return;
  const t=c.currentTime;
  const i=step.current++%16; const root=selected.wave==='sawtooth'?45:48;
  if(i%4===0)kick(t);
  if(i%2===0)hat(t);
  const bass=[root,root,root+7,root+5,root,root+7,root+10,root+5][Math.floor(i/2)];
  tone(noteHz(bass),0.22,selected.wave,t,0.055);
  const melody=[72,74,76,74,79,76,74,72][Math.floor(i/2)];
  if(i%2===0)tone(noteHz(melody),0.18,"sine",t+0.02,0.045);
  if(i%8===0){tone(noteHz(root+12),0.8,"sine",t,0.018);tone(noteHz(root+19),0.8,"sine",t,0.012);}
 };
 const start=()=>{ensure(); if(!ctx.current)return; if(timer.current)window.clearInterval(timer.current); current.current=selected; step.current=0; tick(); timer.current=window.setInterval(tick,(60/selected.bpm/2)*1000); setPlaying(true); speak(`Playing ${selected.title}.`)};
 const stop=()=>{if(timer.current)window.clearInterval(timer.current);timer.current=undefined;setPlaying(false)};
 const toggle=()=>playing?stop():start();
 useEffect(()=>()=>{if(timer.current)window.clearInterval(timer.current);ctx.current?.close()},[]);
 useEffect(()=>{if(master.current)master.current.gain.value=muted?0:volume},[muted,volume]);
 useEffect(()=>{if(playing){stop();start()}},[selected.id]);
 return <div className="page music-page">
  <button className="back-link" onClick={()=>nav('/home')}><ArrowLeft/> Back to Home</button>
  <section className="music-hero"><div><span className="eyebrow">MEMORY & MUSIC</span><h1>90s Music</h1><p>Familiar retro-inspired sounds for a calm, enjoyable moment.</p></div><div className="music-orb"><Music2/></div></section>
  <div className="music-note"><Heart/> Music can be a meaningful way to reconnect with familiar moments. Choose what feels comfortable and keep the volume gentle.</div>
  <section className="music-list">{tracks.map(track=><button key={track.id} className={`music-track ${selected.id===track.id?'selected':''}`} onClick={()=>{setSelected(track);speak(track.title)}}><span className="track-icon"><Music2/></span><span><b>{track.title}</b><small>{track.subtitle}</small></span><span className="track-bpm">{track.bpm} BPM</span></button>)}</section>
  <section className="music-player"><div className="player-title"><Headphones/><div><b>{selected.title}</b><small>90s-inspired • instrumental</small></div></div><button className="play-main" onClick={toggle} aria-label={playing?'Pause music':'Play music'}>{playing?<Pause/>:<Play/>}</button><div className="volume"><button onClick={()=>setMuted(!muted)}>{muted?<VolumeX/>:<Volume2/>}</button><input aria-label="Volume" type="range" min="0" max="0.4" step="0.01" value={volume} onChange={e=>{setVolume(Number(e.target.value));setMuted(false)}}/></div></section>
  <p className="music-disclaimer">This player creates a lightweight original retro-inspired instrumental in your browser; it does not include commercial 90s songs.</p>
 </div>
}
