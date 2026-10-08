import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const outputDirectory = path.join(root, 'public', 'brand-kit');

const crests = [
  ['src/assets/images/brand/crest/svg/Club Crest Default.svg', 'killarney-athletic-crest-default.png'],
  ['src/assets/images/brand/crest/svg/Club Crest Alt.svg', 'killarney-athletic-crest-alternative.png'],
  ['src/assets/images/brand/crest/svg/Club Crest Blue.svg', 'killarney-athletic-crest-blue.png'],
  ['src/assets/images/brand/crest/svg/Club Crest Black.svg', 'killarney-athletic-crest-black.png'],
  ['src/assets/images/brand/crest/svg/Club Crest White.svg', 'killarney-athletic-crest-white.png'],
];

await mkdir(outputDirectory, { recursive: true });

await Promise.all(crests.map(async ([source, filename]) => {
  await sharp(path.join(root, source), { density: 192 })
    .resize({ width: 1046, height: 1550, fit: 'contain' })
    .png({ compressionLevel: 9 })
    .toFile(path.join(outputDirectory, filename));
}));

console.log(`Generated ${crests.length} transparent PNG crests in public/brand-kit.`);
