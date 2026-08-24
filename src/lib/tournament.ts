export const tournamentPath = '/7-a-side-tournament/';

/**
 * The annual 7-A-Side tournament is promoted prominently from 1 June through
 * 7 July. The permanent page remains available through Club and the footer for
 * the rest of the year.
 */
export function isTournamentSeason(date = new Date()): boolean {
  const month = date.getUTCMonth();
  const day = date.getUTCDate();

  return month === 5 || (month === 6 && day <= 7);
}
