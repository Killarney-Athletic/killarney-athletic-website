interface MatchSummaryInput {
  homeTeam: string;
  awayTeam: string;
  score?: string | null;
  status: 'past' | 'future';
  date: string;
  time: string;
  venue: string;
}

export function normalizeScore(score?: string | null) {
  return score?.trim().replace(/\s*[-–]\s*/, ' – ') || null;
}

export function scoreParts(score?: string | null) {
  const normalized = normalizeScore(score);
  const match = normalized?.match(/^(\d+)\s*–\s*(\d+)$/);
  return match ? { home: Number(match[1]), away: Number(match[2]) } : null;
}

export function clubOutcome(homeTeam: string, awayTeam: string, score?: string | null) {
  const goals = scoreParts(score);
  if (!goals) return null;
  if (goals.home === goals.away) return 'D' as const;

  const athleticIsHome = /killarney\s+athletic/i.test(homeTeam);
  const athleticIsAway = /killarney\s+athletic/i.test(awayTeam);
  if (!athleticIsHome && !athleticIsAway) return null;

  const athleticWon = athleticIsHome ? goals.home > goals.away : goals.away > goals.home;
  return athleticWon ? 'W' as const : 'L' as const;
}

export function matchSummary({ homeTeam, awayTeam, score, status, date, time, venue }: MatchSummaryInput) {
  const normalizedScore = normalizeScore(score);
  const goals = scoreParts(normalizedScore);

  if (status === 'past' && goals) {
    const homeGoals = goals.home;
    const awayGoals = goals.away;
    const result = homeGoals === awayGoals
      ? 'The match ended in a draw.'
      : `${homeGoals > awayGoals ? homeTeam : awayTeam} won by ${Math.abs(homeGoals - awayGoals)} ${Math.abs(homeGoals - awayGoals) === 1 ? 'goal' : 'goals'}.`;

    return `Full time. ${homeTeam} ${homeGoals}, ${awayTeam} ${awayGoals}. ${result}`;
  }

  const fixture = `${homeTeam} versus ${awayTeam}. ${date}${time ? ` at ${time}` : ''}.`;
  return `${fixture}${venue ? ` Venue: ${venue}.` : ''}`;
}
