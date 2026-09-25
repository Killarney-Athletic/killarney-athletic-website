import assert from 'node:assert/strict';
import test from 'node:test';
import { cleanTeamLabel, displayVenue, dublinOffsetMinutes, fixtureStatus } from '../scripts/sync-fai';

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
