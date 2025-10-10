import { useLanguage } from "../allScenes/LanguageProvider";

const StartButton = ({ armed = false, onClick }) => {
  const { t } = useLanguage();

  return (
    <div id="tvButtonSlot" className="gameOverlay">
      <button
        className={`ctaStart ${armed ? "is-armed" : "is-disabled"}`}
        aria-disabled={!armed}
        onClick={armed ? onClick : undefined}
      >
        <span className="label">{t("startButton")}</span>
        <span className="arrowChip" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </span>
      </button>
    </div>
  );
};

export default StartButton;
