import {LockKeyhole} from "lucide-react";
import Button from "../components/Button";
import {useTranslation} from "react-i18next";
import {useNavigate} from "react-router-dom";
import {useState} from "react";
import {api} from "../services/api";
export default function Login(){const {t}=useTranslation(),nav=useNavigate(),[phone,setPhone]=useState("9876543210"),[loading,setLoading]=useState(false),[error,setError]=useState("");return <div className="flow-page"><div className="flow-title"><span><LockKeyhole/></span><h1>{t("login")}</h1></div><label className="field">{t("phone")}<input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="9876543210" inputMode="numeric"/></label>{error&&<div className="error-banner">{error}</div>}<Button disabled={loading} onClick={async()=>{try{setLoading(true);setError("");const r=await api.requestOtp(phone);localStorage.setItem('carehub-phone',phone);if(r.demoOtp)localStorage.setItem('carehub-demo-otp',r.demoOtp);nav("/otp")}catch(e){setError(e instanceof Error?e.message:'Unable to send OTP')}finally{setLoading(false)}}}>{loading?'Sending…':t("sendOtp")}</Button><p className="muted">Demo OTP is <b>123456</b>.</p></div>}
