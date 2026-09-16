import { ShieldCheck } from "lucide-react";
import Button from "../components/Button";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { api } from "../services/api";
import ConsentScreen from "./ConsentScreen";

export default function OTP() {
  const { t } = useTranslation();
  const nav = useNavigate();

  const [otp, setOtp] = useState(
    localStorage.getItem("carehub-demo-otp") || "123456"
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  return (
    <div className="flow-page">
      <div className="flow-title">
        <span>
          <ShieldCheck />
        </span>

        <h1>{t("otp")}</h1>
      </div>

      <label className="field">
        OTP

        <input
          value={otp}
          onChange={(e) => setOtp(e.target.value)}
          maxLength={6}
          placeholder="123456"
          inputMode="numeric"
        />
      </label>

      {error && <div className="error-banner">{error}</div>}

      <Button
        disabled={loading}
        onClick={async () => {
          try {
            setLoading(true);
            setError("");

            const r = await api.verifyOtp(
              localStorage.getItem("carehub-phone") || "9876543210",
              otp
            );

            if (r.token) {
              localStorage.setItem("carehub-token", r.token);
              localStorage.setItem("carehub-name", r.user.name);
              nav("/consent");
            }
          } catch (e) {
            setError(
              e instanceof Error ? e.message : "Verification failed"
            );
          } finally {
            setLoading(false);
          }
        }}
      >
        {loading ? "Verifying…" : t("verify")}
      </Button>
    </div>
  );
}
