import type { FaiMatch, FaiTable, FaiTeam } from '../types/fai';

const cupCompetitionPattern = /\bcup\b|\bMJ[CSY]\b/i;
const leagueCompetitionPattern = /\bleague\b|\bdivision\b|\bpremier\b/i;
const teamFilterOrder = [
  'Senior A Men',
  'Senior B Men',
  'U18A Boys',
  'U17A Boys',
  'U17B Boys',
  'U17A Girls',
  'U16A Girls',
];

export const teamFilterLabel = (team: FaiTeam) => team.label === 'U17B' ? 'U17B Boys' : team.label;

export const getTeamFilterOptions = (teams: FaiTeam[]) => [...teams].sort((a, b) => {
  const aIndex = teamFilterOrder.indexOf(teamFilterLabel(a));
  const bIndex = teamFilterOrder.indexOf(teamFilterLabel(b));
  const aOrder = aIndex === -1 ? teamFilterOrder.length : aIndex;
  const bOrder = bIndex === -1 ? teamFilterOrder.length : bIndex;
  return aOrder - bOrder || teamFilterLabel(a).localeCompare(teamFilterLabel(b));
});

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
