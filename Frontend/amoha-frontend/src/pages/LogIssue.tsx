import {useState} from "react";
import {useTranslation} from "react-i18next";
import {db} from "../db/database";
import {queueForSync} from "../services/syncQueue";
import IssueCard from "../components/IssueCard";
import Button from "../components/Button";
import {CheckCircle2} from "lucide-react";
import {api} from "../services/api";

const issues=[
  ["agitation","Agitation","😟"],
  ["sleep","Sleep Problem","🌙"],
  ["eating","Eating Problem","🍲"],
  ["wandering","Wandering","🚶"],
  ["other","Other","📝"]
];

export default function LogIssue(){
  const {t}=useTranslation();
  const [type,setType]=useState("");
  const [note,setNote]=useState("");
  const [saved,setSaved]=useState(false);

  const save=async()=>{
    if(!type)return;

    const timestamp=new Date().toISOString();

    const payload={
      category:type,
      note,
      timestamp
    };

    const localId=await db.careLogs.add({
      category:type,
      note,
      timestamp,
      syncStatus:navigator.onLine ? "pending" : "offline"
    });

    if(navigator.onLine && localStorage.getItem("carehub-token")){
      try{
        await api.createCareLog(payload);

        await db.careLogs.update(localId,{
          syncStatus:"synced"
        });
      }catch{
        await queueForSync("care-log",payload);

        await db.careLogs.update(localId,{
          syncStatus:"pending"
        });
      }
    }else{
      await queueForSync("care-log",payload);
    }

    setSaved(true);
    setTimeout(()=>setSaved(false),2500);
    setType("");
    setNote("");
  };

  return <>
    <div className="page-title">
      <h1>{t("issue")}</h1>
      <p>{t("chooseIssue")}</p>
    </div>

    <div className="issue-grid">
      {issues.map(i=>
        <IssueCard
          key={i[0]}
          label={i[1]}
          emoji={i[2]}
          selected={type===i[0]}
          onClick={()=>setType(i[0])}
        />
      )}
    </div>

    {type&&
      <div className="note-box">
        <label>
          {t("optionalNote")}
          <textarea
            value={note}
            onChange={e=>setNote(e.target.value)}
            placeholder="Add a short note…"
          />
        </label>

        <Button onClick={save}>
          {t("save")}
        </Button>
      </div>
    }

    {saved&&
      <div className="success-banner">
        <CheckCircle2/> {t("issueSaved")}
      </div>
    }
  </>;
}
