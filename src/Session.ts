import { config } from "./config";
import { TypingEngine } from "./engine/TypingEngine";
import type { GameEvent } from "./engine/types";
import type { PlayScene } from "./game/scenes/PlayScene";
import type { Hud } from "./ui/Hud";
import type { Overlay } from "./ui/Overlay";
import type { TextPanel } from "./ui/TextPanel";

// ready:     a message box is up; Enter starts a run
// playing:   keys go to the engine
// finishing: the last letter is done; short pause before the results box
type Phase = "ready" | "playing" | "finishing";

// Connects the pieces: keyboard → engine → events → play field and DOM.
export class Session {
  private phase: Phase = "ready";
  private engine?: TypingEngine;

  constructor(
    private readonly text: string,
    private readonly scene: PlayScene,
    private readonly hud: Hud,
    private readonly panel: TextPanel,
    private readonly overlay: Overlay,
  ) {
    this.panel.setText(text);
    this.overlay.showStart();
  }

  onEnter(): void {
    if (this.phase === "ready") this.start();
  }

  onChar(char: string, timeMs: number): void {
    if (this.phase === "playing" && this.engine)
      this.dispatch(this.engine.key(char, timeMs));
  }

  /** Called every frame. Keeps running after completion so wrong letters still burn. */
  tick(timeMs: number): void {
    if (this.engine) this.dispatch(this.engine.update(timeMs));
  }

  private start(): void {
    this.engine = new TypingEngine(this.text, {
      ...config.stream,
      targetSpm: config.testLevel.targetSpm,
      pointsPerStroke: config.scoring.pointsPerStroke,
    });
    this.engine.start(performance.now());
    this.phase = "playing";
    this.overlay.hide();
    this.scene.startRun(this.engine);
    this.panel.setText(this.text);
    this.refreshDom();
  }

  private dispatch(events: GameEvent[]): void {
    if (events.length === 0 || !this.engine) return;
    this.scene.handleEvents(events);
    this.refreshDom();
    if (events.some((e) => e.type === "levelComplete")) {
      this.phase = "finishing";
      const score = this.engine.score;
      // A UI pause, not a game rule, so a timer is fine here (the engine has none).
      setTimeout(() => {
        this.overlay.showComplete(score);
        this.phase = "ready";
      }, config.ui.completeDelayMs);
    }
  }

  private refreshDom(): void {
    if (!this.engine) return;
    this.hud.setScore(this.engine.score);
    this.panel.update(this.engine.chars, this.engine.cursor);
  }
}
