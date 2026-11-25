// Page entry point: the only module that runs code at import. Mount order matters only for reveals (last).
import { mount as mountHero } from "./hero-ui.mjs";
import { mount as mountEdge } from "./edge-ui.mjs";
import { mount as mountGrow } from "./grow-ui.mjs";
import { mount as mountOrigins } from "./origins-ui.mjs";
import { mount as mountHunt } from "./hunt-scene-ui.mjs";
import { mount as mountHuntDiagrams } from "./hunt-diagrams-ui.mjs";
import { mount as mountRange } from "./range-ui.mjs";
import { mount as mountDots } from "./dots-ui.mjs";
import { mount as mountNest } from "./nest-ui.mjs";
import { mount as mountHud } from "./hud-ui.mjs";
import { mount as mountChrome } from "./chrome-ui.mjs";

mountHero();
mountOrigins();
mountHunt();
mountHuntDiagrams();
mountRange();
mountDots();
mountEdge();
mountNest();
mountGrow();
mountHud();
mountChrome(); // last: reveals measure layout after everything else has rendered
