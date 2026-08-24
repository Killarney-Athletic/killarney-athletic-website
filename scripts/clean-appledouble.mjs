import { readdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('../dist/', import.meta.url));

function cleanAppleDoubleFiles(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);

    if (entry.name.startsWith('._')) {
      rmSync(path, { recursive: true, force: true });
      continue;
    }

    if (entry.isDirectory()) {
      cleanAppleDoubleFiles(path);
    }
  }
}

try {
  cleanAppleDoubleFiles(root);
} catch {
  // dist may not exist for non-build script runs.
}
