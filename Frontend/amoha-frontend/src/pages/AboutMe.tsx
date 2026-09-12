import {ArrowLeft,Heart,Music2,Coffee,Leaf,Volume2,Save} from 'lucide-react';
import {useNavigate} from 'react-router-dom';
import {useEffect,useState} from 'react';
import {api} from '../services/api';
import {speak} from '../services/tts';

export default function AboutMe(){
 const nav=useNavigate(); const [saving,setSaving]=useState(false); const [profile,setProfile]=useState({name:localStorage.getItem('carehub-name')||'Meena Sharma',favoriteMusic:'90s Bollywood',likes:'Morning tea, gardening, cricket',dislikes:'Loud noises, crowded places',helps:'Speak slowly. Give one instruction at a time.'});
 useEffect(()=>{api.getAboutMe?.().then((p:any)=>p&&setProfile({...profile,...p})).catch(()=>{});},[]);
 const save=async()=>{setSaving(true);localStorage.setItem('carehub-name',profile.name);try{await api.updateAboutMe?.(profile)}catch{}setSaving(false);speak('Your About Me profile has been saved.');};
 return <div><button className="back-link" onClick={()=>nav('/home')}><ArrowLeft/> Back to Home</button><div className="page-title"><span className="eyebrow">PERSONAL CARE</span><h1>❤️ About Me</h1><p>Helpful details that make care more personal and familiar.</p></div><section className="about-hero"><div className="about-avatar">{profile.name.charAt(0)}</div><div><h2>{profile.name}</h2><p>My preferences and the little things that help me feel comfortable.</p></div><button onClick={()=>speak(profile.helps)}><Volume2/> Read</button></section><div className="about-grid"><Card icon={<Music2/>} title="Favorite music" value={profile.favoriteMusic} onChange={v=>setProfile({...profile,favoriteMusic:v})}/><Card icon={<Coffee/>} title="Things I like" value={profile.likes} onChange={v=>setProfile({...profile,likes:v})}/><Card icon={<Leaf/>} title="Things to avoid" value={profile.dislikes} onChange={v=>setProfile({...profile,dislikes:v})}/><Card icon={<Heart/>} title="What helps me" value={profile.helps} onChange={v=>setProfile({...profile,helps:v})}/></div><button className="btn primary save-wide" onClick={save}><Save/> {saving?'Saving...':'Save About Me'}</button></div>
}
function Card({icon,title,value,onChange}:{icon:any;title:string;value:string;onChange:(v:string)=>void}){return <label className="about-card"><span>{icon}</span><b>{title}</b><textarea value={value} onChange={e=>onChange(e.target.value)}/></label>}
