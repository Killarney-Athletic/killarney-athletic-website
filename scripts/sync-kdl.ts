import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fetchKDLData, KDL_SOURCE_URL } from '../src/lib/kdl/finalwhistle';
import type { KDLApiResponse } from '../src/lib/types/kdl';

const outputPath = resolve(process.cwd(), 'public/data/kdl.json');

const emptyPayload = (error: string): KDLApiResponse => ({
  success: false,
  timestamp: new Date().toISOString(),
  isFallback: true,
  error,
  data: {
    latestResults: [],
    upcomingFixtures: [],
    standings: [],
  },
});

async function readLastKnownGood(error: string): Promise<KDLApiResponse> {
  try {
    const existing = JSON.parse(await readFile(outputPath, 'utf8')) as KDLApiResponse;
    if (!existing?.data || !Array.isArray(existing.data.standings)) {
      throw new Error('Existing KDL data is invalid.');
    }

    return {
      ...existing,
      success: false,
      isFallback: true,
      error,
    };
  } catch {
    return emptyPayload(error);
  }
}

async function syncKDL(): Promise<void> {
  await mkdir(dirname(outputPath), { recursive: true });

  let payload: KDLApiResponse;

  try {
    payload = await fetchKDLData();
    console.log(`KDL data refreshed from ${KDL_SOURCE_URL}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown KDL scraper error';
    payload = await readLastKnownGood(message);
    console.warn(`KDL refresh failed; writing fallback data. ${message}`);
  }

  await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  console.log(`KDL data written to ${outputPath}`);
}

await syncKDL();
