import { config, cssColor } from "../config";

// Copies colours and sizes from config.ts into CSS variables, so style.css
// never needs its own copy of these values.
export function applyTheme(root: HTMLElement = document.documentElement): void {
  const { layout, colors, fonts, panel } = config;
  const vars: Record<string, string> = {
    "--stage-width": `${layout.width}px`,
    "--stage-height": `${layout.height}px`,
    "--hud-height": `${layout.hudHeight}px`,
    "--panel-height": `${layout.panelHeight}px`,
    "--field-height": `${layout.fieldHeight}px`,
    "--color-background": cssColor(colors.background),
    "--color-panel-background": cssColor(colors.panelBackground),
    "--color-text": cssColor(colors.text),
    "--color-text-dim": cssColor(colors.textDim),
    "--color-correct": cssColor(colors.correct),
    "--color-wrong": cssColor(colors.wrong),
    "--color-arrow": cssColor(colors.arrow),
    "--font-family": `"${fonts.family}"`,
    "--panel-size": `${fonts.panelSize}px`,
    "--mark-size": `${fonts.markSize}px`,
    "--arrow-slide-ms": `${panel.arrowSlideMs}ms`,
  };
  for (const [name, value] of Object.entries(vars))
    root.style.setProperty(name, value);
}
