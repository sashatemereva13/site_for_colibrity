import { createContext, useContext, useEffect, useMemo, useState } from "react";

export const LanguageCtx = createContext(null);

const SUPPORTED = ["en", "fr", "brd"];

const STRINGS = {
  en: {
    // welcome overlay
    welcomeTitle: "Welcome to the experience",
    welcomeSubtitle: "Choose how you'd like to enter",

    withSound: "With sound",
    noSound: "No sound",

    tip: "Tip: you can toggle the sound later",
    scrollTip: "scroll to join me",
    soundOn: "Sound: On",
    soundOff: "Sound: Off",

    birdColor: "Bird Themes",
    goBack: "Go back to Colibrity website",
    alert: "Are you sure you want to leave?",
    alertYes: "Yes",
    alertNo: "Cancel",

    // corridor portals
    portalAgencyBase: "Colibrity \n digital agency based in Paris",
    portalSince2018: "On the market since 2018",
    portalEntrance: "30+ in the team \n Enter the Colibrity office",

    // TV GAME
    TVdesign: "/TVpics/en/design.png",
    TVdevelopment: "/TVpics/en/development.png",
    TVinnovation: "/TVpics/en/innovation.png",
    TVmarketing: "/TVpics/en/marketing.png",
    TVexit: "/TVpics/en/exit.png",
    TVentrance: "/TVpics/en/entrance.png",

    // TV BUTTON
    up: "fly up!",
    startButton: "C'EST PARTI!",

    // theme picker
    birdLook: "Bird Look",
    bodyMat: "Body Material",
    bodyMatHelp:
      "Changes the bird’s body surface feel (metallic, ceramic, glossy…)",
    color: "Accent color",
    colorHelp: "Colors for beak, eyes & feet",
    randomize: "Randomize",

    // LOGO
    logoComment: "creator of high-end, custom-made, turnkey websites",
    message1: "Ecommerce",
    message2: "Showcase Website",
    message3: "Configurator",
    message4: "Immersive website",
  },
  fr: {
    welcomeTitle: "bienvenue dans l’expérience",
    welcomeSubtitle: "choisissez comment vous souhaitez entrer",

    withSound: "Avec son",
    noSound: "Sans son",

    tip: "astuce : vous pourrez activer/désactiver le son plus tard",
    scrollTip: "défilez pour me rejoindre",
    soundOn: "Son : Activé",
    soundOff: "Son : Désactivé",

    birdColor: "Thèmes d'oiseau",
    goBack: "Retourner au site Colibrity",
    alert: "Êtes-vous sûr de vouloir partir ?",
    alertYes: "Oui",
    alertNo: "Annuler",

    // corridor portals
    portalAgencyBase: "Colibrity \n agence digitale basée à Paris",
    portalSince2018: "Sur le marché depuis 2018",
    portalEntrance: "30+ dans l'équipe \n Entrer chez Colibrity",

    // TV game button
    TVdesign: "/TVpics/en/design.png",
    TVdevelopment: "/TVpics/en/development.png",
    TVinnovation: "/TVpics/en/innovation.png",
    TVmarketing: "/TVpics/en/marketing.png",
    TVexit: "/TVpics/en/exit.png",
    TVentrance: "/TVpics/en/entrance.png",

    // TV BUTTON
    up: "monte en volant",
    startButton: "Start the game",

    // theme picker
    birdLook: "Apparence de l’Oiseau",
    bodyMat: "Matériau du Corps",
    bodyMatHelp:
      "Change la texture de surface du corps de l’oiseau (métallique, céramique, brillant…)",
    color: "Couleur d’Accent",
    colorHelp: "Couleurs pour le bec, les yeux et les pattes",
    randomize: "Aléatoire",

    // LOGO
    logoComment:
      "créateur de sites internet haut de gamme, sur mesure et clés en main",
    message1: "Ecommerce",
    message2: "Site Vitrine",
    message3: "Configurateur",
    message4: "Site Immersif",
  },
  brd: {
    welcomeTitle: "cui-cui trrr-trrr piouuu",
    welcomeSubtitle: "tchip-tchip cui-cui piou",

    withSound: "cui-cui",
    noSound: "trrr-trrr",

    tip: "tchip : cui-cui plus tard trrr piou",
    scrollTip: "frrrt-piouu défile-cui vers moi",
    soundOn: "Son: Activé",
    soundOff: "Son: Désactivé",

    birdColor: "Thèmes d'oiseau",
    goBack: "Retourner au site Colibrity",
    alert: "Êtes-vous sûr de vouloir partir ?",
    alertYes: "Oui",
    alertNo: "Annuler",

    // corridor portals
    portalAgencyBase: "Colibrity \n trrr-diji-tale nidé à Pa-piou",
    portalSince2018: "Tchi-tchi depuis deu-mille-dix-huit",
    portalEntrance:
      "piou-piou 30+ dans l’es-nui \n Entr’-piou chez Coli-brd-city",

    // TV game button

    TVdesign: "/TVpics/en/design.png",
    TVdevelopment: "/TVpics/en/development.png",
    TVinnovation: "/TVpics/en/innovation.png",
    TVmarketing: "/TVpics/en/marketing.png",
    TVexit: "/TVpics/en/exit.png",
    TVentrance: "/TVpics/en/entrance.png",

    // TV button
    up: "flutter-soar skyward!",
    startButton: "pattes-piou",

    // theme picker
    birdLook: "cui-cui look piou-piou",
    bodyMat: "trrr-trrr mat piou",
    bodyMatHelp: "cui-cui change surface piou (métal, trrr, glossy-piou)",
    color: "tchip-tchip color piou",
    colorHelp: "piou bec-cui yeux-trrr pattes-piou",
    randomize: "trrr-piou",

    // LOGO
    logoComment:
      "cui-cui créa-trrr piou-piou site-plum haut-de-cui, sur-mesure trrr",
    message1: "piou-piou",
    message2: "yeux-trr",
    message3: "trrr-diji-tale",
    message4: "tchip-tchip cui-cui",
  },
};

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem("lang") || "en");

  useEffect(() => {
    localStorage.setItem("lang", lang);
  }, [lang]);

  const cycleLanguage = () => {
    const i = SUPPORTED.indexOf(lang);
    setLang(SUPPORTED[(i + 1) % SUPPORTED.length]);
  };

  const t = (key) => STRINGS[lang]?.[key] ?? STRINGS.en[key] ?? key;

  const value = useMemo(
    () => ({ lang, setLang, cycleLanguage, t, SUPPORTED, STRINGS }),
    [lang]
  );

  return <LanguageCtx.Provider value={value}>{children}</LanguageCtx.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageCtx);
  if (!ctx) throw new Error("useLanguage must be used within LangaugeProvider");
  return ctx;
}
