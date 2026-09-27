import Phaser from "phaser";
import { config, cssColor } from "../../config";
import { TEX } from "../textures";

// Tier-up and record moments in the play field: big popup text, a sprite
// flying across, and the mascot popping up with a speech bubble.
export class Celebrations {
  private readonly mascot: Phaser.GameObjects.Container;
  private readonly bubbleText: Phaser.GameObjects.Text;
  private mascotTween?: Phaser.Tweens.TweenChain;

  constructor(private readonly scene: Phaser.Scene) {
    const { layout } = config;
    // The mascot lives in the empty space right of the on-screen keyboard.
    const bubbleBg = scene.add.graphics();
    this.bubbleText = scene.add
      .text(34, -104, "", {
        fontFamily: config.fonts.family,
        fontSize: "22px",
        fontStyle: "bold",
        color: cssColor(config.colors.background),
      })
      .setOrigin(1, 0.5);
    this.mascot = scene.add
      .container(layout.width - 110, layout.height - 90, [
        bubbleBg,
        this.bubbleText,
        scene.add.image(0, 0, TEX.mascot),
      ])
      .setDepth(20)
      .setScale(0)
      .setVisible(false);
    this.mascot.setData("bubble", bubbleBg);
  }

  /** Big text in the middle of the letter band that pops in and fades. */
  popup(text: string, color: number): void {
    const { layout } = config;
    const label = this.scene.add
      .text(layout.width / 2, layout.fieldTop + 40, text, {
        fontFamily: config.fonts.family,
        fontSize: `${config.fonts.popupSize}px`,
        fontStyle: "bold",
        color: cssColor(color),
        stroke: cssColor(config.colors.background),
        strokeThickness: 8,
      })
      .setOrigin(0.5)
      .setDepth(25)
      .setScale(0.3);
    this.scene.tweens.chain({
      targets: label,
      tweens: [
        { scale: 1.15, duration: 180, ease: "Back.easeOut" },
        { scale: 1, duration: 120 },
        {
          alpha: 0,
          y: label.y - 30,
          duration: 400,
          delay: config.effects.popupMs - 700,
        },
      ],
      onComplete: () => label.destroy(),
    });
  }

  /** A rocket, UFO or astronaut drifts across the top of the letter band. */
  flyBy(): void {
    const { layout, effects } = config;
    const kinds: string[] = [TEX.rocket, TEX.ufo, TEX.astronaut];
    const kind: string = Phaser.Utils.Array.GetRandom(kinds);
    const leftToRight = kind === TEX.rocket || Math.random() < 0.5;
    const y = layout.fieldTop + Phaser.Math.Between(20, 60);
    const sprite = this.scene.add
      .image(leftToRight ? -60 : layout.width + 60, y, kind)
      .setDepth(5)
      .setFlipX(!leftToRight && kind === TEX.rocket);
    this.scene.tweens.add({
      targets: sprite,
      x: leftToRight ? layout.width + 60 : -60,
      y: y + Phaser.Math.Between(-20, 20),
      angle: kind === TEX.astronaut ? 360 : Phaser.Math.Between(-8, 8),
      duration: effects.flyByMs,
      ease: "Sine.easeInOut",
      onComplete: () => sprite.destroy(),
    });
  }

  /** The mascot pops up from below with a short message. */
  mascotSays(text: string): void {
    const { effects } = config;
    this.bubbleText.setText(text);
    const bubble = this.mascot.getData("bubble") as Phaser.GameObjects.Graphics;
    const w = this.bubbleText.width + 28;
    bubble.clear();
    // Bubble above the mascot, its right edge near the screen edge.
    bubble
      .fillStyle(config.colors.text)
      .fillRoundedRect(48 - w, -126, w, 44, 14);
    bubble.fillTriangle(-6, -84, 14, -84, 2, -64);

    this.mascotTween?.stop();
    this.mascot.setVisible(true).setScale(0);
    this.mascotTween = this.scene.tweens.chain({
      targets: this.mascot,
      tweens: [
        { scale: 1, duration: 300, ease: "Back.easeOut" },
        {
          scale: 0,
          duration: 250,
          ease: "Quad.easeIn",
          delay: effects.mascotMs,
        },
      ],
      onComplete: () => this.mascot.setVisible(false),
    });
  }
}
