import { useEffect, useRef } from "react";
import "../css/WelcomeOverlay.css";
import { useLanguage } from "../allScenes/LanguageProvider";

export default function WelcomeOverlay({ onSelect }) {
  const { t } = useLanguage();
  const withSoundBtn = useRef(null);

  // for keyboard
  useEffect(() => {
    withSoundBtn.current?.focus();
  }, []);

  return (
    <div className="welcomeOverlay" role="dialog" aria-modal="true">
      <div className="welcomeCard">
        <h1 className="welcomeTitle"> {t("welcomeTitle")}</h1>
        <p className="welcomeSubtitle">{t("welcomeSubtitle")}</p>
        <div className="welcomeActions">
          <button
            ref={withSoundBtn}
            className="welcomeBtn"
            onClick={() => onSelect(true)}
          >
            {t("withSound")}
          </button>
          <button
            ref={withSoundBtn}
            className="welcomeBtn"
            onClick={() => onSelect(false)}
          >
            {t("noSound")}
          </button>
        </div>
        <p className="hint"> {t("tip")}</p>
        <p className="scrollHint"> {t("scrollTip")} </p>
      </div>
    </div>
  );
}
