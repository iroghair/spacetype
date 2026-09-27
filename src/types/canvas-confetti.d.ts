// Minimal type description for the parts of canvas-confetti we use
// (the package itself has no TypeScript types).
declare module "canvas-confetti" {
  export interface Options {
    particleCount?: number;
    angle?: number;
    spread?: number;
    startVelocity?: number;
    decay?: number;
    gravity?: number;
    ticks?: number;
    scalar?: number;
    origin?: { x?: number; y?: number };
    colors?: string[];
    shapes?: ("square" | "circle" | "star")[];
  }
  export interface GlobalOptions {
    resize?: boolean;
    useWorker?: boolean;
    disableForReducedMotion?: boolean;
  }
  export type Fire = ((options?: Options) => Promise<void> | null) & {
    reset(): void;
  };
  const confetti: Fire & {
    create(canvas: HTMLCanvasElement, options?: GlobalOptions): Fire;
  };
  export default confetti;
}
