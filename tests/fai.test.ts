import assert from 'node:assert/strict';
import test from 'node:test';
import { cleanTeamLabel, displayVenue, dublinOffsetMinutes, fixtureStatus } from '../scripts/sync-fai';
import { getCurrentLeagueTables, getTeamFilterOptions, isLeagueTable, teamFilterLabel } from '../src/lib/fai/tables';
import type { FaiMatch, FaiTable, FaiTeam } from '../src/lib/types/fai';
import { hasRoundTeamCrest, localCrestForTeam } from '../src/utils/teamCrests';

test('uses local round crests for every Classic and Avenue United team variant', () => {
  assert.equal(localCrestForTeam('Classic F.C'), '/images/team-crests/classic-fc.png');
  assert.equal(localCrestForTeam('Classic F.C B'), '/images/team-crests/classic-fc.png');
  assert.equal(localCrestForTeam('Avenue United FC'), '/images/team-crests/avenue-united-fc.png');
  assert.equal(localCrestForTeam('Avenue United U17 LWSSL 2026'), '/images/team-crests/avenue-united-fc.png');
  assert.equal(hasRoundTeamCrest('Classic FC'), true);
  assert.equal(hasRoundTeamCrest('Avenue United CDSL U17'), true);
  assert.equal(localCrestForTeam('Another Club'), null);
});

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

test('orders and labels team filter options without changing their API IDs', () => {
  const teams = [
    { id: 7, name: 'u16', label: 'U16A Girls' },
    { id: 5, name: 'u17a', label: 'U17A Boys' },
    { id: 1, name: 'senior-a', label: 'Senior A Men' },
    { id: 6, name: 'u17b', label: 'U17B' },
    { id: 3, name: 'u18', label: 'U18A Boys' },
    { id: 2, name: 'senior-b', label: 'Senior B Men' },
    { id: 4, name: 'girls', label: 'U17A Girls' },
  ] satisfies FaiTeam[];

  const options = getTeamFilterOptions(teams);
  assert.deepEqual(options.map((team) => team.id), [1, 2, 3, 5, 6, 4, 7]);
  assert.deepEqual(options.map(teamFilterLabel), [
    'Senior A Men',
    'Senior B Men',
    'U18A Boys',
    'U17A Boys',
    'U17B Boys',
    'U17A Girls',
    'U16A Girls',
  ]);
});
