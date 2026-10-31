import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

export function createDataReader() {
  const cache = new Map<string, { revision: string; value: unknown }>();

  return function readData<T>(dataDir: string, fileName: string): T {
    const path = join(dataDir, fileName);
    const stat = statSync(path, { bigint: true });
    const revision = `${stat.ino}:${stat.size}:${stat.mtimeNs}:${stat.ctimeNs}`;
    const cached = cache.get(path);
    if (cached?.revision === revision) return cached.value as T;

    // Never fall back to stale rules when an edited file cannot be parsed.
    const value: unknown = JSON.parse(readFileSync(path, 'utf8'));
    cache.set(path, { revision, value });
    return value as T;
  };
}
