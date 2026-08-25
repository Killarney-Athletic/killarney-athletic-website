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

## Email-to-WordPress team notice pilot

The pilot uses the WordPress plugin in `integrations/wordpress/ka-team-notices/`. It polls the existing Titan mailbox over IMAP, checks email authentication and sender/team permissions, prevents duplicates, publishes timed notices, and requests a GitHub Pages rebuild.

The Astro frontend reads the public `team`, `starts_at` and `expires_at` post metadata and promotes only notices active at build time. Expired notices remain in the News archive. Private sender and source-message audit values stay inside WordPress.

### Pilot setup order

1. Install and configure the WordPress plugin using its README.
2. Confirm PHP IMAP is available and add the mailbox and GitHub credentials to `wp-config.php`.
3. Configure the approved manager/team mapping and test with **Check mailbox now**.
4. Merge the repository-dispatch workflow change to `main`.
5. Configure a Blacknight scheduled task for reliable one-minute WP-Cron checks.
6. Send a notice from the configured test manager and confirm WordPress publication, GitHub Pages deployment and automatic expiry.
