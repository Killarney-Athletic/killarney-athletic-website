import assert from 'node:assert/strict';
import test from 'node:test';
import { clubOutcome, matchSummary, normalizeScore, scoreParts } from '../src/utils/matchPresentation';

test('normalizes score separators', () => {
  assert.equal(normalizeScore('3-1'), '3 – 1');
  assert.equal(normalizeScore('3 – 1'), '3 – 1');
  assert.equal(normalizeScore(null), null);
});

test('extracts the home and away score', () => {
  assert.deepEqual(scoreParts('4-2'), { home: 4, away: 2 });
  assert.equal(scoreParts('postponed'), null);
});

test('calculates the outcome from Killarney Athletic’s perspective', () => {
  assert.equal(clubOutcome('Killarney Athletic A.F.C.', 'Moyne Villa FC', '2-4'), 'L');
  assert.equal(clubOutcome('Castleisland AFC', 'Killarney Athletic A.F.C.', '0-3'), 'W');
  assert.equal(clubOutcome('Killarney Athletic', 'Tralee Dynamos', '1-1'), 'D');
  assert.equal(clubOutcome('Castleisland AFC', 'Moyne Villa FC', '1-0'), null);
});

test('announces the winner and margin for a completed match', () => {
  assert.equal(
    matchSummary({ homeTeam: 'Killarney Athletic', awayTeam: 'Tralee Dynamos', score: '3-1', status: 'past', date: 'Sunday', time: '2 pm', venue: 'Woodlawn' }),
    'Full time. Killarney Athletic 3, Tralee Dynamos 1. Killarney Athletic won by 2 goals.',
  );
});

test('announces a drawn result', () => {
  assert.match(
    matchSummary({ homeTeam: 'Killarney Athletic', awayTeam: 'Tralee Dynamos', score: '2 – 2', status: 'past', date: 'Sunday', time: '2 pm', venue: 'Woodlawn' }),
    /ended in a draw/,
  );
});

test('announces date, time and venue for an upcoming fixture', () => {
  assert.equal(
    matchSummary({ homeTeam: 'Killarney Athletic', awayTeam: 'Tralee Dynamos', status: 'future', date: 'Sunday, 18 Oct', time: '2 pm', venue: 'Woodlawn' }),
    'Killarney Athletic versus Tralee Dynamos. Sunday, 18 Oct at 2 pm. Venue: Woodlawn.',
  );
});
