import assert from 'node:assert/strict';
import test from 'node:test';
import { cleanTeamLabel, displayVenue, dublinOffsetMinutes, fixtureStatus } from '../scripts/sync-fai';
import { getCurrentLeagueTables, isLeagueTable } from '../src/lib/fai/tables';
import type { FaiMatch, FaiTable, FaiTeam } from '../src/lib/types/fai';

test('cleans the club prefix and season from squad labels', () => {
  assert.equal(cleanTeamLabel('Killarney Athletic AFC Senior A Men 26/27'), 'Senior A Men');
  assert.equal(cleanTeamLabel('Killarney Athletic AFC U16A Girls'), 'U16A Girls');
});

test('uses the API offset convention for Dublin daylight saving time', () => {
  assert.equal(dublinOffsetMinutes(new Date('2026-01-15T12:00:00Z')), 0);
  assert.equal(dublinOffsetMinutes(new Date('2026-07-15T12:00:00Z')), -60);
});

test('uses Ferndale for recognised Killarney Athletic home venue aliases', () => {
  assert.equal(displayVenue('Killarney Athletic A.F.C.', 'Woodlawn'), 'Ferndale');
  assert.equal(displayVenue('Killarney Athletic AFC Senior A', 'Killarney Ath.'), 'Ferndale');
  assert.equal(displayVenue('Killarney Athletic AFC', 'Killarney Athletic Club Grounds'), 'Ferndale');
});

test('preserves neutral and away venues', () => {
  assert.equal(displayVenue('Killarney Athletic A.F.C.', 'Mounthawk Park'), 'Mounthawk Park');
  assert.equal(displayVenue('Listowel Celtic', 'Woodlawn'), 'Woodlawn');
});

test('derives fixture status from kickoff time instead of the API result bucket', () => {
  const now = new Date('2026-09-25T12:00:00Z');
  assert.equal(fixtureStatus('2026-09-27T11:00:00Z', now), 'future');
  assert.equal(fixtureStatus('2026-09-20T11:00:00Z', now), 'past');
});

test('distinguishes league standings from cup standings', () => {
  assert.equal(isLeagueTable({ competition: 'Kerry and District League 26/27 Premier A' } as FaiTable), true);
  assert.equal(isLeagueTable({ competition: 'McCarthy Insurance Group MJC 26/27 - Kerry District League' } as FaiTable), false);
  assert.equal(isLeagueTable({ competition: 'FAI Junior Cup 2026' } as FaiTable), false);
});

test('selects the most recently active league table associated with each team', () => {
  const team = { id: 1, name: 'Killarney Athletic', label: 'Senior A' } satisfies FaiTeam;
  const oldLeague = { competitionId: 10, competition: 'Kerry and District League 2025/26 Division 1', teamIds: [1], rows: [] } satisfies FaiTable;
  const cup = { competitionId: 20, competition: 'FAI Junior Cup 2026', teamIds: [1], rows: [] } satisfies FaiTable;
  const currentLeague = { competitionId: 30, competition: 'Kerry and District League 26/27 Premier A', teamIds: [1], rows: [] } satisfies FaiTable;
  const match = (competitionId: number, date: string) => ({ competitionId, date } as FaiMatch);

  const selected = getCurrentLeagueTables(
    [team],
    [oldLeague, cup, currentLeague],
    [match(10, '2026-04-01T12:00:00Z'), match(20, '2026-09-30T12:00:00Z'), match(30, '2026-09-20T12:00:00Z')],
  );

  assert.equal(selected.get(team.id), currentLeague);
});
