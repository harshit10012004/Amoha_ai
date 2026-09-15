import {Shield} from "lucide-react";
import Button from "../components/Button";
import {useTranslation} from "react-i18next";
import {useNavigate} from "react-router-dom";
import {useState, useEffect} from "react";
import {api} from "../services/api";

export default function ConsentScreen() {
  const {t} = useTranslation();
  const nav = useNavigate();
  const [consentGiven, setConsentGiven] = useState(false);
  const [consentVersion, setConsentVersion] = useState("consent-v1.0");
  const [consentRecorded, setConsentRecorded] = useState(false);

  useEffect(() => {
    const recorded = localStorage.getItem("carehub-consent-given");
    setConsentRecorded(recorded === "1");
    const version = localStorage.getItem("carehub-consent-version");
    if (version) setConsentVersion(version);
  }, []);

  const handleGiveConsent = async () => {
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

  const handleWithdrawConsent = async () => {
    if (!window.confirm(t("consent.withdrawConfirm"))) return;
    setConsentGiven(false);
    localStorage.removeItem("carehub-consent-given");
    localStorage.removeItem("carehub-consent-version");
    localStorage.removeItem("carehub-onboarded");
    try {
      await api.withdrawConsent();
      nav("/welcome");
    } catch (e) {
      console.error('Failed to withdraw consent', e);
      setConsentGiven(true);
      localStorage.setItem("carehub-consent-given", "1");
    }
  };

  return (
    <div className="flow-page">
      <div className="flow-title">
        <Shield/> <h1>{t("consent")}</h1>
      </div>
      {consentRecorded ? (
        <div>
          <p>{t("consent.alreadyGiven", {version: consentVersion})}</p>
          <Button onClick={handleWithdrawConsent} disabled={!consentGiven}>
            {t("consent.withdraw")}
          </Button>
        </div>
      ) : (
        <>
          <p>{t("consent.affirmative")}</p>
          <p>{t("consent.specific")}</p>
          <p>{t("consent.informed")}</p>
          <p>{t("consent.revocable")}</p>
          <Button onClick={handleGiveConsent} disabled={consentGiven}>
            {consentGiven ? t("continue") : t("giveConsent")}
          </Button>
          <p className="muted">
            {t("consent.version", {version: consentVersion})}
          </p>
        </>
      )}
    </div>
  );
}