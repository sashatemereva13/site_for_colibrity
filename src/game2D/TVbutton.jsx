import "../css/TVbutton.css";
import { useLanguage } from "../allScenes/LanguageProvider";

const TVbutton = ({ armed = false, onClick }) => {
  const { t } = useLanguage();
  return (
    <>
      <div id="tvButtonSlot" className="gameOverlay">
        <button
          className={`tvButton ${armed ? "armed" : "disabled"}`}
          disabled={!armed}
          aria-disabled={!armed}
          onClick={armed ? onClick : undefined}
        >
          {t("up")}
        </button>
      </div>
    </>
  );
};

export default TVbutton;
