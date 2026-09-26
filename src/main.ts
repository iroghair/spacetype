import Phaser from "phaser";
import "./style.css";
import { config } from "./config";
import { loadContent } from "./content/load";
import { PlayScene } from "./game/scenes/PlayScene";
import { t } from "./i18n";
import { attachKeyboard } from "./input/keyboard";
import { Session } from "./Session";
import { SaveStore } from "./storage/storage";
import { Hud } from "./ui/Hud";
import { Overlay } from "./ui/Overlay";
import { messageScreen } from "./ui/screens";
import { fitStageToWindow } from "./ui/stage";
import { TextPanel } from "./ui/TextPanel";
import { applyTheme } from "./ui/theme";

function byId(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`#${id} missing from index.html`);
  return el;
}

// A phone or tablet without a mouse/trackpad almost certainly has no keyboard either.
function isTouchOnly(): boolean {
  return (
    navigator.maxTouchPoints > 0 &&
    !window.matchMedia("(any-pointer: fine)").matches
  );
}

async function main(): Promise<void> {
  applyTheme();
  fitStageToWindow(byId("stage"));
  const overlay = new Overlay(byId("overlay"));

  if (isTouchOnly()) {
    overlay.show(messageScreen(t("warning.keyboardNeeded")), () => {});
    return;
  }

  let content;
  try {
    content = await loadContent();
  } catch (error) {
    console.error(error);
    overlay.show(messageScreen(t("error.content")), () => {});
    return;
  }

  // Phaser draws text on a canvas, which only uses a font once it has loaded.
  await document.fonts.load(
    `${config.fonts.flyingSize}px "${config.fonts.family}"`,
  );

  const scene = new PlayScene();
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: "field",
    width: config.layout.width,
    height: config.layout.fieldHeight,
    backgroundColor: config.colors.background,
    // The stage (see ui/stage.ts) does the scaling, so Phaser keeps its own size.
    scale: { mode: Phaser.Scale.NONE },
    scene: [scene],
  });
  await scene.ready;

  const session = new Session(
    content,
    scene,
    new Hud(byId("hud")),
    new TextPanel(byId("panel")),
    overlay,
    new SaveStore(window.localStorage),
  );

  // STEP fires every frame before the scene draws, so the engine is always up to date.
  game.events.on(Phaser.Core.Events.STEP, () =>
    session.tick(performance.now()),
  );

  const capsWarning = byId("caps-warning");
  capsWarning.textContent = t("warning.capsLock");
  attachKeyboard(window, {
    onChar: (char, timeMs) => session.onChar(char, timeMs),
    onEnter: () => session.onEnter(),
    onEscape: () => session.onEscape(),
    onNav: (direction) => session.onNav(direction),
    onCapsLock: (on) => (capsWarning.hidden = !on),
  });
}

void main();
