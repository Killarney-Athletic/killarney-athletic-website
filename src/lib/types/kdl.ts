export type KDLMatchStatus = 'FULL_TIME' | 'UPCOMING' | 'POSTPONED';

export interface KDLMatch {
  id: string;
  date: string;
  homeTeam: string;
  awayTeam: string;
  score: {
    home: number | null;
    away: number | null;
    raw: string;
  };
  status: KDLMatchStatus;
  ground: string;
  competition: string;
  isKillarneyAthletic: boolean;
  isHomeMatch: boolean;
}

export interface KDLStandingsRow {
  position: number;
  club: string;
  crestUrl: string | null;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  isKillarneyAthletic: boolean;
}

export interface KDLApiResponse {
  success: boolean;
  timestamp: string;
  isFallback: boolean;
  data: {
    latestResults: KDLMatch[];
    upcomingFixtures: KDLMatch[];
    standings: KDLStandingsRow[];
  };
  error?: string;
}
