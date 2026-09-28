import type { FaiMatch, FaiTable, FaiTeam } from '../types/fai';

const cupCompetitionPattern = /\bcup\b|\bMJ[CSY]\b/i;
const leagueCompetitionPattern = /\bleague\b|\bdivision\b|\bpremier\b/i;

export const isLeagueTable = (table: FaiTable) =>
  leagueCompetitionPattern.test(table.competition) && !cupCompetitionPattern.test(table.competition);

const latestCompetitionMatch = (competitionId: number, matches: FaiMatch[]) =>
  matches.reduce((latest, match) => {
    if (match.competitionId !== competitionId) return latest;
    const time = Date.parse(match.date);
    return Number.isFinite(time) ? Math.max(latest, time) : latest;
  }, Number.NEGATIVE_INFINITY);

export const getCurrentLeagueTables = (teams: FaiTeam[], tables: FaiTable[], matches: FaiMatch[]) => {
  const selected = new Map<number, FaiTable>();

  for (const team of teams) {
    const candidates = tables
      .filter((table) => table.teamIds.includes(team.id) && isLeagueTable(table))
      .sort((a, b) => latestCompetitionMatch(b.competitionId, matches) - latestCompetitionMatch(a.competitionId, matches));

    if (candidates[0]) selected.set(team.id, candidates[0]);
  }

  return selected;
};
