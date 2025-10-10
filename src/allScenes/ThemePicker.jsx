import { useTheme } from "./BirdThemes";
import "../css/ThemePicker.css";
import { useLanguage } from "./LanguageProvider";
import Randomize from "/imgs/Randomize.svg";

export default function ThemePicker() {
  const {
    mats,
    tints,
    matcapIndex,
    tintIndex,
    setMatcapIndex,
    setTintIndex,
    randomize,
  } = useTheme();

  const { t } = useLanguage();

  return (
    <div
      className="themePicker"
      role="region"
      aria-label="Bird Look theme controls"
    >
      <div className="themePicker-title"> {t("birdLook")} </div>

      {/* Matcaps */}
      <div className="themePicker-label"> {t("bodyMat")} </div>
      <div className="themePicker-help">{t("bodyMatHelp")}</div>
      <div className="themePicker-grid6">
        {mats.map((m, i) => (
          <button
            type="button"
            key={m + i}
            onClick={() => setMatcapIndex(i)}
            title={`Matcap ${i + 1}`}
            aria-pressed={i === matcapIndex}
            className={`themePicker-mat ${i === matcapIndex ? "selected" : ""}`}
          >
            {i + 1}
          </button>
        ))}
      </div>

      <div className="themePicker-divider" />

      {/* Tints */}
      <div className="themePicker-label">{t("color")}</div>
      <div className="themePicker-help">{t("colorHelp")}</div>
      <div className="themePicker-grid6">
        {tints.map((hex, i) => (
          <button
            type="button"
            key={hex + i}
            onClick={() => setTintIndex(i)}
            title={hex}
            aria-pressed={i === tintIndex}
            className={`themePicker-swatch ${
              i === tintIndex ? "selected" : ""
            }`}
            style={{ background: hex }}
          />
        ))}
      </div>

      {/* Randomize */}
      <button type="button" onClick={randomize} className="themePicker-random">
        {t("randomize")} &nbsp; <img src={Randomize} />
      </button>
    </div>
  );
}
