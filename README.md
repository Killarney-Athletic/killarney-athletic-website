# Killarney Athletic A.F.C. website

The official Astro frontend for Killarney Athletic A.F.C.

The site is statically generated. Club news is ingested from the existing WordPress REST API, WordPress continues to serve legacy media, and current KDL data is refreshed during the build.

## Local development

Requires Node.js 22.12 or newer.

```sh
npm install
npm run dev
```

Astro serves the local site at `http://localhost:4321/` by default.

## Production build

```sh
npm run build
npm run preview
```

The build refreshes KDL data and generates the static website in `dist/`.

## GitHub Pages preview

Pushing to `main` runs `.github/workflows/deploy-pages.yml`. The workflow builds and publishes the site at:

`https://killarney-athletic.github.io/killarney-athletic-website/`

The workflow supplies the GitHub Pages `site` and `base` values at build time. Local development and the eventual production domain continue to use `/` as their base path.

Repository administrators must select **GitHub Actions** as the publishing source under **Settings → Pages** before the first deployment.

## Useful commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Astro development server |
| `npm run sync:kdl` | Refresh `public/data/kdl.json` |
| `npm run build` | Refresh data and build the static site |
| `npm run preview` | Preview the latest production build |
