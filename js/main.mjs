// Page entry point: the only module that runs code at import. Mount order matters only for reveals (last).
import { mount as mountHero } from "./hero-ui.mjs";
import { mount as mountSizes } from "./sizes-ui.mjs";
import { mount as mountGrow } from "./grow-ui.mjs";
import { mount as mountOrigins } from "./origins-ui.mjs";
import { mount as mountPlayer } from "./player-ui.mjs";
import { huntFilm } from "./hunt-film.mjs";
import { deepFilm } from "./deep-film.mjs";
import { mount as mountHuntDiagrams } from "./hunt-diagrams-ui.mjs";
import { mount as mountLedger } from "./ledger-ui.mjs";
import { mount as mountRanch } from "./ranch-ui.mjs";
import { mount as mountTimeline } from "./timeline-ui.mjs";
import { mount as mountSurvey } from "./survey-ui.mjs";
import { mount as mountNest } from "./nest-ui.mjs";
import { mount as mountHud } from "./hud-ui.mjs";
import { mount as mountLore } from "./lore-ui.mjs";
import { mount as mountBackdrop } from "./backdrop-ui.mjs";
import { mount as mountChrome } from "./chrome-ui.mjs";

mountHero();
mountOrigins();
mountPlayer({ prefix: "film", film: huntFilm, caption: ["h-roman", "h-body"] });
mountPlayer({ prefix: "dt", film: deepFilm, caption: ["dt-roman", "dt-body"] });
mountHuntDiagrams();
mountLedger();
mountRanch();
mountTimeline();
mountSurvey();
mountSizes();
mountNest();
mountGrow();
mountHud();
mountLore();
mountBackdrop();
mountChrome(); // last: reveals measure layout after everything else has rendered
