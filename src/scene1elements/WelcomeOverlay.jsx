import { useEffect, useRef } from "react";
import "../css/WelcomeOverlay.css";
import { useLanguage } from "../allScenes/LanguageProvider";
import SingingBird from "/imgs/SingingBird.svg";
import SilentBird from "/imgs/SilentBird.svg";

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
        <p className="hint">
          {t("tip")} {t("scrollTip")}
        </p>

        <div className="welcomeActions">
          <button
            ref={withSoundBtn}
            className="welcomeBtn"
            onClick={() => onSelect(true)}
          >
            <img className="birdSVG" src={SingingBird} />

            {t("withSound")}
          </button>
          <button
            ref={withSoundBtn}
            className="welcomeBtn"
            onClick={() => onSelect(false)}
          >
            <img className="birdSVG" src={SilentBird} />

            {t("noSound")}
          </button>
        </div>
      </div>
    </div>
  );
}
