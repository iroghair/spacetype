import { defineConfig } from "vitest/config";

// GitHub Pages serves the site from /spacetype/, so the deploy workflow sets
// BASE_PATH=/spacetype/. Locally BASE_PATH is unset and the site lives at /.
export default defineConfig({
  base: process.env.BASE_PATH ?? "/",
  build: {
    // Phaser alone is ~1.5 MB; that is expected, so don't warn about it.
    chunkSizeWarningLimit: 2000,
  },
  test: {
    include: ["tests/unit/**/*.test.ts"],
  },
});
