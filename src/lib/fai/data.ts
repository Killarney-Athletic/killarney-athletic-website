import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { FaiSnapshot } from '../types/fai';

export const emptyFaiSnapshot: FaiSnapshot = {
  version: 1,
  generatedAt: new Date(0).toISOString(),
  sourceUpdatedAt: new Date(0).toISOString(),
  isFallback: true,
  teams: [],
  matches: [],
  tables: [],
};

export async function readFaiSnapshot(): Promise<FaiSnapshot> {
  try {
    const raw = await readFile(resolve(process.cwd(), 'public/data/fai.json'), 'utf8');
    const parsed = JSON.parse(raw) as FaiSnapshot;
    if (parsed.version !== 1 || !Array.isArray(parsed.matches)) return emptyFaiSnapshot;
    return parsed;
  } catch {
    return emptyFaiSnapshot;
  }
}
