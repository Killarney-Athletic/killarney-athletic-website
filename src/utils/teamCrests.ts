const LOCAL_TEAM_CRESTS = [
  {
    matches: (name: string) => /^classic(?:\s+f\s*c)?(?:\s|$)/.test(name),
    path: '/images/team-crests/classic-fc.png',
    round: true,
  },
  {
    matches: (name: string) => /^avenue\s+united(?:\s|$)/.test(name),
    path: '/images/team-crests/avenue-united-fc.png',
    round: true,
  },
] as const;

const comparableTeamName = (team: string) => team
  .toLowerCase()
  .replace(/&/g, 'and')
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

const localTeam = (team: string) => {
  const name = comparableTeamName(team);
  return LOCAL_TEAM_CRESTS.find(({ matches }) => matches(name));
};

export const localCrestForTeam = (team: string) => localTeam(team)?.path ?? null;
export const hasRoundTeamCrest = (team: string) => localTeam(team)?.round ?? false;
