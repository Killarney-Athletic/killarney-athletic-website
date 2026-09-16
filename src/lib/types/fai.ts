export interface FaiTeam {
  id: number;
  name: string;
  label: string;
}

export interface FaiMatch {
  id: number;
  teamId: number;
  teamLabel: string;
  homeTeam: string;
  awayTeam: string;
  homeCrest: string | null;
  awayCrest: string | null;
  homeColour: string;
  awayColour: string;
  competitionId: number;
  competition: string;
  date: string;
  venue: string;
  status: 'future' | 'past';
  score: string | null;
  details?: FaiMatchDetails;
}

export interface FaiPlayer {
  name: string;
  shirtNumber: number | null;
  starting: boolean;
  captain: boolean;
  position: string | null;
}

export interface FaiLineup {
  formation: string | null;
  players: FaiPlayer[];
  officials: string[];
}

export interface FaiMatchEvent {
  type: string;
  minute: string;
  player: string | null;
  relatedPlayer: string | null;
  side: 'home' | 'away' | null;
}

export interface FaiMatchDetails {
  homeLineup: FaiLineup | null;
  awayLineup: FaiLineup | null;
  events: FaiMatchEvent[];
}

export interface FaiStanding {
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

export interface FaiTable {
  competitionId: number;
  competition: string;
  teamIds: number[];
  rows: FaiStanding[];
}

export interface FaiSnapshot {
  version: 1;
  generatedAt: string;
  sourceUpdatedAt: string;
  isFallback: boolean;
  teams: FaiTeam[];
  matches: FaiMatch[];
  tables: FaiTable[];
}
