import React, { useState } from "react";
import "../css/GlobalButtons.css";
import { useLanguage } from "./LanguageProvider";
import BackArrow from "/imgs/BackArrow.svg";
import SingingBird from "/imgs/SingingBird.svg";
import SilentBird from "/imgs/SilentBird.svg";
import SittingBurd from "/imgs/SittingBird.svg";
import SettingsIcon from "/imgs/Settings.svg";

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
      <button
        className="globalButton soundToggle"
        onClick={onToggleSound}
        aria-label={withSound ? "Sound on" : "Sound off"}
        title={withSound ? "Sound on" : "Sound off"}
      >
        <span className="iconWrap">
          {withSound ? <img src={SingingBird} /> : <img src={SilentBird} />}

          <span
            className={`eqBars ${withSound ? "playing" : ""}`}
            aria-hidden="true"
          >
            <span className="bar" />
            <span className="bar" />
            <span className="bar" />
            <span className="bar" />
            <span className="bar" />
          </span>
        </span>
      </button>

      <button className="globalButton" onClick={onCycleLanguage}>
        {language === "brd" ? (
          <img src={SittingBurd} alt="bird" />
        ) : (
          language.toUpperCase()
        )}
      </button>

      <button className="globalButton" onClick={onToggleTheme}>
        <img src={SettingsIcon} /> &nbsp; {t("birdColor")}
      </button>

      <button className="globalButton" onClick={() => setShowConfirm(true)}>
        <img src={BackArrow} />
        &nbsp; {t("goBack")}
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
