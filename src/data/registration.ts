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
    priceFormatted: '€80',
    pricePeriod: 'per season',
    ageBracket: 'U6 – U10 (Boys & Girls)',
    description: 'Fundamental skills development, small-sided games, and FAI insurance coverage every Saturday morning at Woodlawn.',
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
    priceFormatted: '€100',
    pricePeriod: 'per season',
    ageBracket: 'U11 – U17 (League & Cup)',
    description: 'Competitive Kerry District Youth League (KDYL) campaign, league registration, training slots, and match kits.',
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
    priceFormatted: '€120',
    pricePeriod: 'per season',
    ageBracket: 'Adults (18+)',
    description: 'Kerry District League (KDL) Senior Men and Women teams. Covers league affiliations, facilities, and referee fees.',
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
    priceFormatted: '€10',
    pricePeriod: 'per month',
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
