import { config } from "../config";

// Scales the fixed-size stage to fit the window, keeping the 16:9 shape.
export function fitStageToWindow(stage: HTMLElement): void {
  const fit = () => {
    const scale = Math.min(
      window.innerWidth / config.layout.width,
      window.innerHeight / config.layout.height,
    );
    stage.style.transform = `translate(-50%, -50%) scale(${scale})`;
  };
  fit();
  window.addEventListener("resize", fit);
}
