// Content pipeline: validates content/nl/ and writes sorted JSON to public/content/nl/.
//
// Phase 1 placeholder: the real validation and sorting arrive in phase 3.
// For now it only makes sure the output folder exists, so `npm run build` works.

import { mkdirSync } from "node:fs";

const outDir = "public/content/nl";
mkdirSync(outDir, { recursive: true });
console.log(
  `content: nothing to process yet (pipeline arrives in phase 3); ${outDir}/ is ready.`,
);
