# Site image library

Images placed under `src/assets/images` are owned by the Astro frontend. Astro can
optimise, resize, fingerprint, and bundle these files when they are imported into
an `.astro` component.

Do not copy WordPress news photographs here. News and article images should be
uploaded to WordPress and supplied through the REST API.

## Folders

- `brand/` — official club crest, wordmarks, and brand graphics.
- `sponsors/` — approved sponsor logos. Prefer SVG; otherwise use transparent WebP or PNG.
- `site/` — permanent photography and graphics used in heroes, calls to action, and page sections.
- `backgrounds/` — decorative textures and background artwork.

## File rules

- Use lowercase, descriptive, hyphenated names: `woodlawn-main-pitch.webp`.
- Prefer SVG for logos and WebP for photographs.
- Keep the original high-quality master outside this project; store the web-ready version here.
- Every meaningful image must have useful alt text where it is rendered.
- Do not place videos, raw camera files, or duplicate WordPress uploads here.
