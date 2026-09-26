import Phaser from "phaser";
import { config } from "./config";
import { PlayScene } from "./game/scenes/PlayScene";

new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game",
  width: config.width,
  height: config.height,
  backgroundColor: config.colors.background,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [PlayScene],
});
