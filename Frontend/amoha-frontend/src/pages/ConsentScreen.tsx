import {Shield} from "lucide-react";
import Button from "../components/Button";
import {useTranslation} from "react-i18next";
import {useNavigate} from "react-router-dom";
import {useState} from "react";
import {api} from "../services/api";

export default function ConsentScreen() {
  const {t} = useTranslation();
  const nav = useNavigate();
  const [consentGiven, setConsentGiven] = useState(false);
  const [consentVersion, setConsentVersion] = useState("consent-v1.0");

  const handleConsent = async () => {
    setConsentGiven(true);
    localStorage.setItem("carehub-consent-version", consentVersion);
    localStorage.setItem("carehub-consent-given", "1");
    localStorage.setItem("carehub-onboarded", "1");
    try {
      await api.updateConsent(consentVersion);
    } catch (e) {
      console.error('Failed to update consent', e);
    }
    nav("/home");
  };

  return (
    <div className="flow-page">
      <div className="flow-title">
        <Shield/> <h1>{t("consent")}</h1>
      </div>
      <p>{t("consent.affirmative")}</p>
      <p>{t("consent.specific")}</p>
      <p>{t("consent.informed")}</p>
      <p>{t("consent.revocable")}</p>
      <Button onClick={handleConsent} disabled={consentGiven}>
        {consentGiven ? t("continue") : t("giveConsent")}
      </Button>
      <p className="muted">
        {t("consent.version", {version: consentVersion})}
      </p>
    </div>
  );
}