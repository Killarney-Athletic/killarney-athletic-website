import * as cheerio from 'cheerio';
import type { KDLApiResponse, KDLMatch, KDLMatchStatus, KDLStandingsRow } from '../types/kdl';

export const KDL_SOURCE_URL = 'https://www.finalwhistle.ie/soccer/kerry-dl-premier-a/';
export const KDL_CACHE_CONTROL = 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400';
const KDL_REQUEST_TIMEOUT_MS = 6_000;

const COMPETITION_NAME = 'Kerry District League Premier A';
const KILLARNEY_RE = /killarney\s+athletic(?:\s+afc)?/i;

const normaliseText = (value: string) => value.replace(/\s+/g, ' ').trim();

const toNumber = (value: string) => {
  const parsed = Number.parseInt(normaliseText(value), 10);
  return Number.isFinite(parsed) ? parsed : 0;
};

const slugify = (value: string) =>
  normaliseText(value)
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/’/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const getLocalCrestPath = (club: string) =>
  KILLARNEY_RE.test(club)
    ? '/images/team-crests/killarney-athletic-afc.svg'
    : `/images/team-crests/${slugify(club)}.png`;

const parseScore = (rawValue: string) => {
  const raw = normaliseText(rawValue);
  const match = raw.match(/(\d+)\s*[-–]\s*(\d+)/);

  return {
    home: match ? Number.parseInt(match[1], 10) : null,
    away: match ? Number.parseInt(match[2], 10) : null,
    raw,
  };
};

const parseStatus = (rawValue: string): KDLMatchStatus => {
  const raw = normaliseText(rawValue);

  if (/postponed|cancelled|abandoned/i.test(raw)) {
    return 'POSTPONED';
  }

  if (/^\d+\s*[-–]\s*\d+$/.test(raw)) {
    return 'FULL_TIME';
  }

  return 'UPCOMING';
};

const parseDate = (rawValue: string) => {
  const raw = normaliseText(rawValue);
  const isoMatch = raw.match(/\d{4}-\d{2}-\d{2}(?:\s+\d{2}:\d{2}:\d{2})?/);

  if (isoMatch) {
    return isoMatch[0].replace(' ', 'T');
  }

  return raw;
};

const makeMatchId = (match: Omit<KDLMatch, 'id'>) =>
  slugify(`${match.date}-${match.homeTeam}-vs-${match.awayTeam}`);

const getTableHeading = ($: cheerio.CheerioAPI, table: cheerio.Element) => {
  const heading = $(table).prevAll('h1,h2,h3,h4,h5,h6').first().text();
  return normaliseText(heading);
};

const getRows = ($: cheerio.CheerioAPI, table: cheerio.Element) =>
  $(table)
    .find('tr')
    .toArray()
    .map((row) =>
      $(row)
        .find('th,td')
        .toArray()
        .map((cell) => normaliseText($(cell).text())),
    )
    .filter((cells) => cells.length > 0);

const parseStandings = ($: cheerio.CheerioAPI): KDLStandingsRow[] => {
  for (const table of $('table').toArray()) {
    const rows = getRows($, table);
    const header = rows[0]?.map((cell) => cell.toLowerCase()) ?? [];
    const looksLikeStandings =
      header.includes('pos') &&
      header.includes('club') &&
      header.includes('pts') &&
      header.some((cell) => cell === 'gd');

    if (!looksLikeStandings) continue;

    const bodyRows = $(table).find('tbody tr').toArray();

    return rows.slice(1).map((cells, index) => {
      const row = bodyRows[index];
      const club = cells[1] ?? '';

      return {
        position: toNumber(cells[0] ?? ''),
        club,
        crestUrl: getLocalCrestPath(club),
        played: toNumber(cells[2] ?? ''),
        won: toNumber(cells[3] ?? ''),
        drawn: toNumber(cells[4] ?? ''),
        lost: toNumber(cells[5] ?? ''),
        goalsFor: toNumber(cells[6] ?? ''),
        goalsAgainst: toNumber(cells[7] ?? ''),
        goalDifference: toNumber(cells[8] ?? ''),
        points: toNumber(cells[9] ?? ''),
        isKillarneyAthletic: KILLARNEY_RE.test(club),
      };
    });
  }

  return [];
};

const parseMatches = ($: cheerio.CheerioAPI): KDLMatch[] => {
  const matches: KDLMatch[] = [];

  for (const table of $('table').toArray()) {
    const rows = getRows($, table);
    const header = rows[0]?.map((cell) => cell.toLowerCase()) ?? [];
    const looksLikeGamesTable =
      header.includes('date') &&
      header.includes('home') &&
      header.includes('details') &&
      header.includes('away') &&
      header.includes('ground');

    if (!looksLikeGamesTable) continue;

    const heading = getTableHeading($, table);

    for (const cells of rows.slice(1)) {
      const date = parseDate(cells[0] ?? '');
      const homeTeam = cells[1] ?? '';
      const details = cells[2] ?? '';
      const awayTeam = cells[3] ?? '';
      const ground = cells[4] ?? '';
      const isKillarneyAthletic = KILLARNEY_RE.test(homeTeam) || KILLARNEY_RE.test(awayTeam);

      if (!date || !homeTeam || !awayTeam || !isKillarneyAthletic) continue;

      const score = parseScore(details);
      const status = parseStatus(details);
      const matchWithoutId = {
        date,
        homeTeam,
        awayTeam,
        score,
        status,
        ground,
        competition: heading || COMPETITION_NAME,
        isKillarneyAthletic,
        isHomeMatch: KILLARNEY_RE.test(homeTeam),
      };

      matches.push({
        id: makeMatchId(matchWithoutId),
        ...matchWithoutId,
      });
    }
  }

  return matches;
};

export const parseKDLHtml = (html: string, timestamp = new Date().toISOString()): KDLApiResponse => {
  const $ = cheerio.load(html);
  const matches = parseMatches($);
  const standings = parseStandings($);
  const latestResults = matches
    .filter((match) => match.status === 'FULL_TIME')
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 6);
  const upcomingFixtures = matches
    .filter((match) => match.status === 'UPCOMING' || match.status === 'POSTPONED')
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 6);

  if (!matches.length && !standings.length) {
    throw new Error('No KDL tables could be parsed from Final Whistle.');
  }

  return {
    success: true,
    timestamp,
    isFallback: false,
    data: {
      latestResults,
      upcomingFixtures,
      standings,
    },
  };
};

export const fetchKDLData = async () => {
  const response = await fetch(KDL_SOURCE_URL, {
    headers: {
      Accept: 'text/html,application/xhtml+xml',
      'User-Agent':
        'Mozilla/5.0 (compatible; KillarneyAthleticAFC/1.0; +https://www.killarneyathletic.com)',
    },
    signal: AbortSignal.timeout(KDL_REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Final Whistle returned HTTP ${response.status}`);
  }

  return parseKDLHtml(await response.text());
};
