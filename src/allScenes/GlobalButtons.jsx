import React, { useState } from "react";
import "../css/GlobalButtons.css";
import { useLanguage } from "./LanguageProvider";

export default function GlobalButtons({
  withSound,
  onToggleSound,
  language,
  onCycleLanguage,
  onToggleTheme,
}) {
  const { t } = useLanguage();
  const [showConfirm, setShowConfirm] = useState(false);

  const handleConfirm = () => {
    window.location.href = "https://colibrity.com";
  };

  return (
    <div className="globalButtonsDiv">
      <button className="globalButton" onClick={onToggleSound}>
        {withSound ? t("soundOn") : t("soundOff")}
      </button>

      <button className="globalButton" onClick={onCycleLanguage}>
        {language.toUpperCase()}
      </button>

      <button className="globalButton" onClick={onToggleTheme}>
        {t("birdColor")}
      </button>

      <button className="globalButton" onClick={() => setShowConfirm(true)}>
        {t("goBack")}
      </button>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="confirmOverlay">
          <div className="confirmBox">
            <p>{t("alert")}</p>
            <div className="confirmActions">
              <button onClick={handleConfirm} className="confirmYes">
               {t("alertYes")}
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                className="confirmNo"
              >
            {t("alertNo")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
