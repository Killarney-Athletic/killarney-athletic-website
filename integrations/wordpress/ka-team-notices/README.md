# Killarney Athletic Team Notices

This WordPress plugin checks the club's Titan mailbox and automatically publishes valid notices from approved managers as ordinary WordPress posts.

## Requirements

- The `updates@killarneyathletic.com` Titan mailbox and its password.
- PHP's IMAP extension enabled on the WordPress server.
- Permission to install a custom WordPress plugin and edit `wp-config.php`.
- A fine-grained GitHub token for the website repository, with **Contents: Read and write** permission, so WordPress can request a Pages rebuild.

## Install

1. Zip the `ka-team-notices` directory and upload it under **WordPress → Plugins → Add New → Upload Plugin**.
2. Activate **Killarney Athletic Team Notices**.
3. Add these constants to `wp-config.php`, above the `That's all, stop editing!` line:

   ```php
   define( 'KA_TEAM_NOTICES_IMAP_PASSWORD', 'the-updates-mailbox-password' );
   define( 'KA_TEAM_NOTICES_GITHUB_TOKEN', 'the-fine-grained-github-token' );
   ```

4. Open **Settings → Team Notice Mailbox**.
5. Confirm the mailbox is `updates@killarneyathletic.com`, the host is `imap0101.titan.email`, and the port is `993`.
6. Add the pilot manager under **Approved senders**, one mapping per line:

   ```text
   manager@example.com|Senior A
   ```

7. Keep **Require a DMARC pass** enabled and save.
8. Select **Check mailbox now**. The status panel will report missing IMAP support, incorrect credentials, or a successful connection.

Do not commit either secret to this repository or enter it into the plugin settings page.

## Manager email format

Send plain text to `updates@killarneyathletic.com`. The team must exactly match the team assigned to the sender.

```text
Team: Senior A
Title: Training moved to Thursday
Starts: 2026-08-25T18:00:00+01:00
Expires: 2026-08-28T20:00:00+01:00
Message: This week's training has moved to Thursday at 7pm.
Please arrive 15 minutes early.
```

`Starts` and `Expires` must be RFC 3339 timestamps with an explicit timezone. A valid notice is published immediately, remains in the News archive, and is promoted only during its active window. The source email message ID prevents duplicate posts.

## Scheduling

The plugin schedules a mailbox check every minute with WP-Cron. WP-Cron only runs when WordPress receives traffic, so production should also use Blacknight's scheduled-task facility to request `wp-cron.php` every minute. Disable WordPress's page-load cron only after that server-side task has been confirmed working.

## Pilot checks

1. Send a valid notice from the approved manager.
2. Use **Check mailbox now** during initial testing instead of waiting for cron.
3. Confirm the post appears in WordPress and a GitHub Pages workflow starts.
4. Send the same email again and confirm it does not create a second post.
5. Try an unapproved sender, a different team, and invalid dates.
6. Confirm the notice disappears from promotional areas after expiry but remains in News.

WordPress administrators can correct the timing metadata in the post's **Team Notice Details** box or unpublish the post at any time.
