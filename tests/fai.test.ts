import assert from 'node:assert/strict';
import test from 'node:test';
import { cleanTeamLabel, dublinOffsetMinutes } from '../scripts/sync-fai';

test('cleans the club prefix and season from squad labels', () => {
  assert.equal(cleanTeamLabel('Killarney Athletic AFC Senior A Men 26/27'), 'Senior A Men');
  assert.equal(cleanTeamLabel('Killarney Athletic AFC U16A Girls'), 'U16A Girls');
});

test('uses the API offset convention for Dublin daylight saving time', () => {
  assert.equal(dublinOffsetMinutes(new Date('2026-01-15T12:00:00Z')), 0);
  assert.equal(dublinOffsetMinutes(new Date('2026-07-15T12:00:00Z')), -60);
});
