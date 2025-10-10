import { useLanguage } from "../allScenes/LanguageProvider";

const WinButton = ({ armed = false, onClick }) => {
  const { t } = useLanguage();

  return (
    <div id="tvButtonSlot" className="gameOverlay">
      <button
        className={`FlyUpButton ctaStart ${armed ? "is-armed" : "is-disabled"}`}
        aria-disabled={!armed}
        onClick={armed ? onClick : undefined}
      >
        <span className="label">{t("up")}</span>
        <span className="arrowChip" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d="M12 19V5M5 12l7-7 7 7" />
          </svg>
        </span>
      </button>
    </div>
  );
};

export default WinButton;
