import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import sharp from 'sharp';
import type { FaiLineup, FaiMatch, FaiMatchEvent, FaiSnapshot, FaiStanding, FaiTable, FaiTeam } from '../src/lib/types/fai';

const API = 'https://api-fai.analyticom.de/api/live/FAI';
const CLUB_ID = Number(process.env.FAI_CLUB_ID ?? 11184);
const OUTPUT = resolve(process.cwd(), 'public/data/fai.json');
const IMAGE_DIR = resolve(process.cwd(), 'public/images/fai');
const ATHLETIC_CREST = '/images/team-crests/killarney-athletic-afc.svg';
const PAGE_SIZE = 50;

type Json = Record<string, any>;

const isAthletic = (name: string) => /killarney\s+athletic/i.test(name);
const publicTeamName = (team: Json) => isAthletic(team.name ?? '')
  ? 'Killarney Athletic A.F.C.'
  : (team.parent?.name ?? team.name ?? 'Opponent TBC');
const slugify = (value: string) => value.toLowerCase().replace(/&/g, 'and').replace(/[’']/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const knownColours: Record<string, string> = {
  'ballyheigue-athletic-fc': '#078b21', 'castleisland-afc': '#56aeda', 'classic-fc': '#bd242c',
  'killarney-celtic-fc': '#08723e', 'killorglin-afc': '#242650', 'listowel-celtic-afc': '#087c5c',
  'mastergeeha-fc': '#5874ad', 'st-brendans-park-fc': '#d92830', 'tralee-dynamos': '#b31f2b',
};
const knownCrests = new Set(Object.keys(knownColours));
const derivedColours = new Map<number, string>();
const knownSlugFor = (name: string) => {
  const slug = slugify(name); const base = slug.replace(/-(?:a?fc)$/i, '');
  return [...knownCrests].find((known) => known === slug || known.replace(/-(?:a?fc)$/i, '') === base) ?? null;
};

async function dominantColour(buffer: Buffer) {
  const { data } = await sharp(buffer).ensureAlpha().resize(48, 48, { fit: 'inside' }).raw().toBuffer({ resolveWithObject: true });
  const buckets = new Map<string, { count: number; r: number; g: number; b: number; saturation: number }>();
  for (let index = 0; index < data.length; index += 4) {
    const [r, g, b, alpha] = [data[index], data[index + 1], data[index + 2], data[index + 3]];
    const maximum = Math.max(r, g, b); const minimum = Math.min(r, g, b); const saturation = maximum - minimum;
    if (alpha < 150 || maximum > 238 || maximum < 28 || saturation < 22) continue;
    const key = `${Math.round(r / 24)},${Math.round(g / 24)},${Math.round(b / 24)}`;
    const bucket = buckets.get(key) ?? { count: 0, r: 0, g: 0, b: 0, saturation: 0 };
    bucket.count += 1; bucket.r += r; bucket.g += g; bucket.b += b; bucket.saturation += saturation; buckets.set(key, bucket);
  }
  const winner = [...buckets.values()].sort((a, b) => (b.count * (1 + b.saturation / b.count / 255)) - (a.count * (1 + a.saturation / a.count / 255)))[0];
  if (!winner) return null;
  const hex = (value: number) => Math.round(value / winner.count).toString(16).padStart(2, '0');
  return `#${hex(winner.r)}${hex(winner.g)}${hex(winner.b)}`;
}

export const cleanTeamLabel = (name: string) => name
  .replace(/^Killarney Athletic AFC\s*/i, '')
  .replace(/\s+\d{2}\/\d{2}$/i, '')
  .replace(/\s+/g, ' ')
  .trim() || 'First Team';

export const dublinOffsetMinutes = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Dublin', timeZoneName: 'longOffset' }).formatToParts(date);
  const zone = parts.find((part) => part.type === 'timeZoneName')?.value ?? 'GMT';
  const match = zone.match(/GMT([+-])(\d{2}):?(\d{2})?/);
  if (!match) return 0;
  const minutes = Number(match[2]) * 60 + Number(match[3] ?? 0);
  if (minutes === 0) return 0;
  return (match[1] === '+' ? -1 : 1) * minutes;
};

async function api(path: string, token?: string): Promise<any> {
  const response = await fetch(`${API}${path}`, {
    headers: token ? { API_KEY: token, Accept: 'application/json' } : { Accept: 'application/json' },
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(`FAI request failed (${response.status})`);
  return response.json();
}

async function paginated(path: string, token: string) {
  const rows: Json[] = [];
  for (let page = 1; page <= 20; page += 1) {
    const payload = await api(`${path}${path.includes('?') ? '&' : '?'}page=${page}&pageSize=${PAGE_SIZE}`, token);
    const result = Array.isArray(payload.result) ? payload.result : [];
    rows.push(...result);
    if (result.length < PAGE_SIZE) break;
  }
  return rows;
}

async function crestFor(team: Json, token: string) {
  if (isAthletic(team.name ?? '')) return ATHLETIC_CREST;
  const slug = slugify(publicTeamName(team));
  const knownSlug = knownSlugFor(publicTeamName(team));
  if (knownSlug) {
    const localPath = resolve(process.cwd(), 'public/images/team-crests', `${knownSlug}.png`);
    const colour = await readFile(localPath).then(dominantColour).catch(() => null);
    if (colour) derivedColours.set(team.id, colour);
    return `/images/team-crests/${knownSlug}.png`;
  }
  if (!team.picture) return null;
  const image = await api(`/images/${encodeURIComponent(team.picture)}`, token);
  if (!image?.value || !/^image\/(png|jpeg|webp)$/i.test(image.contentType ?? '')) return null;
  const extension = image.contentType.toLowerCase() === 'image/jpeg' ? 'jpg' : image.contentType.split('/')[1].toLowerCase();
  const filename = `${slug}-${team.id}.${extension}`;
  await mkdir(IMAGE_DIR, { recursive: true });
  const buffer = Buffer.from(image.value, 'base64');
  await writeFile(resolve(IMAGE_DIR, filename), buffer);
  const colour = await dominantColour(buffer).catch(() => null);
  if (colour) derivedColours.set(team.id, colour);
  return `/images/fai/${filename}`;
}

function colourFor(team: Json) {
  if (isAthletic(team.name ?? '')) return '#0b2e78';
  const knownSlug = knownSlugFor(publicTeamName(team));
  return derivedColours.get(team.id) ?? (knownSlug ? knownColours[knownSlug] : null) ?? '#52657d';
}

function normalizeLineup(side: Json | undefined): FaiLineup | null {
  if (!side || !Array.isArray(side.players) || side.players.length === 0) return null;
  return {
    formation: typeof side.formation === 'string' ? side.formation : null,
    players: side.players.map((player: Json) => ({
      name: player.shortName || player.name || 'Player',
      shirtNumber: Number.isFinite(player.shirtNumber) ? player.shirtNumber : null,
      starting: Boolean(player.starting), captain: Boolean(player.captain),
      position: player.formationPositionDisplayName || player.position || null,
    })),
    officials: Array.isArray(side.officials) ? side.officials.map((official: Json) => official.shortName || official.name).filter(Boolean) : [],
  };
}

function normalizeEvents(events: Json[]): FaiMatchEvent[] {
  return events.filter((event) => event.eventType?.name).map((event) => ({
    type: event.eventType.name,
    minute: event.displayMinute || (Number.isFinite(event.minute) ? `${event.minute}'` : ''),
    player: event.player?.shortName || event.player?.name || null,
    relatedPlayer: event.player2?.shortName || event.player2?.name || null,
    side: event.homeTeam === true ? 'home' : event.homeTeam === false ? 'away' : null,
  }));
}

async function buildSnapshot(): Promise<FaiSnapshot> {
  const preferences = await api('/preferences');
  const token = preferences.mobileAppToken;
  if (typeof token !== 'string' || token.length < 20) throw new Error('FAI application credential unavailable');
  const rawTeams = await api(`/team/${CLUB_ID}/teams`, token) as Json[];
  const teams: FaiTeam[] = rawTeams.map((team) => ({ id: team.id, name: team.name, label: cleanTeamLabel(team.name) }));
  const offset = dublinOffsetMinutes();
  const detailCache = new Map<number, Json>();
  const crestCache = new Map<number, string | null>();
  const getCrest = async (team: Json) => {
    if (!crestCache.has(team.id)) crestCache.set(team.id, await crestFor(team, token));
    return crestCache.get(team.id) ?? null;
  };
  const matches: FaiMatch[] = [];
  for (const team of teams) {
    const [future, past] = await Promise.all([
      paginated(`/team/${team.id}/matches/paginated/future/${offset}`, token),
      paginated(`/team/${team.id}/matches/paginated/past/${offset}`, token),
    ]);
    for (const [status, rows] of [['future', future], ['past', past]] as const) {
      for (const row of rows) {
        let detail = detailCache.get(row.id);
        if (!detail) { detail = await api(`/match/${row.id}`, token); detailCache.set(row.id, detail); }
        const home = detail.homeTeam ?? row.homeTeam;
        const away = detail.awayTeam ?? row.awayTeam;
        const includeLineups = /^Senior\b/i.test(team.label);
        const [lineups, events] = await Promise.all([
          includeLineups ? api(`/match/${row.id}/lineups`, token).catch(() => null) : Promise.resolve(null),
          api(`/match/${row.id}/events?showComments=false`, token).catch(() => []),
        ]);
        matches.push({
          id: row.id, teamId: team.id, teamLabel: team.label,
          homeTeam: publicTeamName(home), awayTeam: publicTeamName(away),
          homeCrest: await getCrest(home), awayCrest: await getCrest(away),
          homeColour: colourFor(home), awayColour: colourFor(away),
          competitionId: row.competition.id, competition: row.competition.name,
          date: new Date(row.dateTimeUTC).toISOString(), venue: detail.facility?.name ?? detail.facility?.place ?? 'Venue to be confirmed',
          status, score: status === 'past' && Number.isFinite(row.homeTeamResult?.current) && Number.isFinite(row.awayTeamResult?.current)
            ? `${row.homeTeamResult.current} – ${row.awayTeamResult.current}` : null,
          details: { homeLineup: normalizeLineup(lineups?.home), awayLineup: normalizeLineup(lineups?.away), events: normalizeEvents(Array.isArray(events) ? events : []) },
        });
      }
    }
  }
  const uniqueMatches = [...new Map(matches.map((match) => [`${match.id}:${match.teamId}`, match])).values()]
    .sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
  const competitionIds = [...new Set(uniqueMatches.map((match) => match.competitionId))];
  const tables: FaiTable[] = [];
  for (const competitionId of competitionIds) {
    try {
      const competition = await api(`/competition/${competitionId}`, token);
      if (!competition.showStandings) continue;
      const rawRows = await api(`/competition/${competitionId}/standings/unofficial`, token) as Json[];
      if (!Array.isArray(rawRows) || rawRows.length < 2) continue;
      const teamIds = teams.filter((team) => rawRows.some((row) => row.team?.id === team.id)).map((team) => team.id);
      if (!teamIds.length) continue;
      const rows: FaiStanding[] = [];
      for (const row of rawRows) rows.push({
        position: row.position, club: row.team.name, crestUrl: await getCrest(row.team),
        played: row.played, won: row.wins, drawn: row.draws, lost: row.losses,
        goalsFor: row.goalsFor, goalsAgainst: row.goalsAgainst, goalDifference: row.goalsFor - row.goalsAgainst,
        points: row.points, isKillarneyAthletic: isAthletic(row.team.name),
      });
      tables.push({ competitionId, competition: competition.name, teamIds, rows });
    } catch { /* A competition may legitimately have no published table. */ }
  }
  const now = new Date().toISOString();
  return { version: 1, generatedAt: now, sourceUpdatedAt: now, isFallback: false, teams, matches: uniqueMatches, tables };
}

async function main() {
  await mkdir(dirname(OUTPUT), { recursive: true });
  try {
    const snapshot = await buildSnapshot();
    const temporary = `${OUTPUT}.tmp`;
    await writeFile(temporary, `${JSON.stringify(snapshot, null, 2)}\n`);
    await rename(temporary, OUTPUT);
    console.log(`FAI snapshot: ${snapshot.matches.length} matches, ${snapshot.teams.length} teams, ${snapshot.tables.length} tables.`);
  } catch (error) {
    try {
      const previous = JSON.parse(await readFile(OUTPUT, 'utf8')) as FaiSnapshot;
      previous.isFallback = true;
      previous.generatedAt = new Date().toISOString();
      await writeFile(OUTPUT, `${JSON.stringify(previous, null, 2)}\n`);
      console.warn('FAI unavailable; retained the last known-good snapshot.');
    } catch {
      throw new Error('FAI synchronization failed and no saved snapshot exists.', { cause: error });
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
