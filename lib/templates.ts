import type { Language } from "./types";

export function starterTemplates(): Record<Language, string> {
  return {
    javascript: `function generatePattern() {\n  // Write your pattern logic here\n  // Tip: build the pattern line by line, then console.log(output)\n}\n\ngeneratePattern();`,
    c: `#include <stdio.h>\n\nint main(void) {\n    // Write your pattern logic here\n    return 0;\n}\n`,
  };
}
