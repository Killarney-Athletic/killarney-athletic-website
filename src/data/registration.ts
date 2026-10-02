export type RegistrationCategory = 'all' | 'academy' | 'underage' | 'senior' | 'supporter';

export interface RegistrationTier {
  id: string;
  name: string;
  category: Exclude<RegistrationCategory, 'all'>;
  priceFormatted: string;
  pricePeriod?: string;
  ageBracket?: string;
  description: string;
  keyBenefits: string[];
  clubforceUrl: string;
  badge?: string;
  highlighted?: boolean;
}

const CLUBFORCE_MEMBERSHIP_URL = 'https://killarneyathletic.clubforce.com/products/membership';

export const REGISTRATION_TIERS: RegistrationTier[] = [
  {
    id: 'academy-u6-u10',
    name: 'Saturday Academy',
    category: 'academy',
    priceFormatted: '€120–€135',
    pricePeriod: 'per season',
    ageBracket: 'U5 – U10 (Boys & Girls)',
    description: 'U5–U9 registration is €120 and U10 registration is €135. The seasonal fee includes training sessions, fundamental skills development, small-sided games, and FAI insurance.',
    keyBenefits: [
      'Weekly training sessions at Woodlawn pitches',
      'Official FAI player registration & insurance',
      'End-of-season academy blitz & participation medal',
    ],
    clubforceUrl: CLUBFORCE_MEMBERSHIP_URL,
    badge: 'Most Popular',
    highlighted: true,
  },
  {
    id: 'underage-competitive',
    name: 'Underage Competitive Squads',
    category: 'underage',
    priceFormatted: '€135–€150',
    pricePeriod: 'per season',
    ageBracket: 'U11 – U18 (League & Cup)',
    description: 'U11 registration is €135 and U12–U18 registration is €150. The seasonal fee includes training sessions and the competitive Kerry District Youth League campaign.',
    keyBenefits: [
      'Full Kerry District League match fixture programme',
      'Qualified coaching staff & midweek tactical sessions',
      'Matchday team kit provided for competitive fixtures',
    ],
    clubforceUrl: CLUBFORCE_MEMBERSHIP_URL,
  },
  {
    id: 'senior-mens-ladies',
    name: 'Senior Competitive Player',
    category: 'senior',
    priceFormatted: '€170',
    pricePeriod: 'per season',
    ageBracket: 'Adults (18+)',
    description: 'Kerry District League (KDL) Senior Men and Women teams. The seasonal fee includes training sessions, league affiliations, facilities, and referee fees.',
    keyBenefits: [
      'Full Kerry District League & Cup entries',
      'Access to floodlit training facilities at Woodlawn',
      'Player support and physio fund access',
    ],
    clubforceUrl: CLUBFORCE_MEMBERSHIP_URL,
  },
  {
    id: '300-club-draw',
    name: '300 Club Monthly Draw',
    category: 'supporter',
    priceFormatted: '€120',
    pricePeriod: 'per year',
    ageBracket: 'Supporters & Parents',
    description: 'Directly support pitch maintenance, floodlights, and clubhouse developments while entering our monthly cash prize draws.',
    keyBenefits: [
      'Entry into all guaranteed monthly cash prize draws',
      'Full social membership & voting rights at Club AGM',
      'Direct contribution to ongoing pitch drainage & facilities',
    ],
    clubforceUrl: CLUBFORCE_MEMBERSHIP_URL,
    badge: 'Club Fundraiser',
  },
];
