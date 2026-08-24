export const contentBadgeTones = [
  'cool-blue',
  'soft-indigo',
  'lavender',
  'muted-purple',
  'dusty-orchid',
  'soft-mauve',
  'blush-pink',
  'warm-peach',
  'soft-apricot',
  'warm-sand',
  'soft-amber',
  'warm-neutral',
  'slate-gray',
  'cool-sky',
  'deep-ice',
] as const;

export type ContentBadgeTone = typeof contentBadgeTones[number];

const permanentMappings: Record<string, ContentBadgeTone> = {
  news: 'cool-blue',
  'club notes': 'soft-indigo',
  'club policy': 'lavender',
  committee: 'muted-purple',
  gallery: 'dusty-orchid',
  galleries: 'dusty-orchid',
  'senior a': 'cool-sky',
  'senior b': 'deep-ice',
  'team news': 'soft-apricot',
  academy: 'lavender',
  underage: 'soft-amber',
  youths: 'cool-blue',
  'over 35': 'slate-gray',
  'fixtures & results': 'soft-amber',
  fixtures: 'soft-amber',
  results: 'warm-sand',
  'summer camp': 'warm-peach',
  '7-a-side tournament': 'soft-apricot',
  '300 club': 'soft-mauve',
  'child welfare': 'blush-pink',
  'irish football': 'deep-ice',
  membership: 'soft-mauve',
  facilities: 'warm-neutral',
};

export function getContentBadgeTone(label: string): ContentBadgeTone {
  const normalized = label.trim().toLowerCase();
  const mappedTone = permanentMappings[normalized];
  if (mappedTone) return mappedTone;

  let hash = 0;
  for (const character of normalized) {
    hash = ((hash << 5) - hash + character.charCodeAt(0)) | 0;
  }

  return contentBadgeTones[Math.abs(hash) % contentBadgeTones.length];
}
