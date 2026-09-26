// Hard-coded level-1 content for phase 2. Replaced by the content pipeline in phase 3.
// `?raw` makes Vite import the file's text as a string.
import raw from "../../content/nl/test-level1.txt?raw";

export const testLevelText = raw.trim();
