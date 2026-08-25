<?php
/**
 * Plugin Name: Killarney Athletic Team Notices
 * Description: Polls the club's Titan mailbox and automatically publishes authenticated, approved team notices with structured timing metadata.
 * Version: 0.2.0
 * Author: Killarney Athletic A.F.C.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

const KA_TEAM_NOTICES_SETTINGS  = 'ka_team_notices_settings';
const KA_TEAM_NOTICES_CRON_HOOK = 'ka_team_notices_poll_mailbox';

function ka_team_notices_defaults() {
	return array(
		'imap_host'       => 'imap0101.titan.email',
		'imap_port'       => 993,
		'mailbox_address' => 'updates@killarneyathletic.com',
		'allowed_senders' => '',
		'require_dmarc'   => 1,
		'github_owner'    => 'Killarney-Athletic',
		'github_repo'     => 'killarney-athletic-website',
	);
}

function ka_team_notices_settings() {
	return wp_parse_args( get_option( KA_TEAM_NOTICES_SETTINGS, array() ), ka_team_notices_defaults() );
}

function ka_team_notices_register_meta() {
	$fields = array(
		'ka_notice_team'       => 'The team or club section responsible for the notice.',
		'ka_notice_starts_at'  => 'RFC 3339 date and time when the notice becomes active.',
		'ka_notice_expires_at' => 'RFC 3339 date and time when the notice expires.',
	);
	foreach ( $fields as $key => $description ) {
		register_post_meta( 'post', $key, array( 'type' => 'string', 'description' => $description, 'single' => true, 'show_in_rest' => true, 'sanitize_callback' => 'sanitize_text_field' ) );
	}
	foreach ( array( '_ka_notice_submitted_by', '_ka_notice_source_message_id', '_ka_notice_received_at' ) as $key ) {
		register_post_meta( 'post', $key, array( 'type' => 'string', 'single' => true, 'show_in_rest' => false, 'sanitize_callback' => 'sanitize_text_field' ) );
	}
}
add_action( 'init', 'ka_team_notices_register_meta' );

function ka_team_notices_cron_schedules( $schedules ) {
	$schedules['ka_every_minute'] = array( 'interval' => 60, 'display' => 'Every minute' );
	return $schedules;
}
add_filter( 'cron_schedules', 'ka_team_notices_cron_schedules' );

function ka_team_notices_schedule() {
	if ( ! wp_next_scheduled( KA_TEAM_NOTICES_CRON_HOOK ) ) {
		wp_schedule_event( time() + 60, 'ka_every_minute', KA_TEAM_NOTICES_CRON_HOOK );
	}
}
add_action( 'init', 'ka_team_notices_schedule' );

function ka_team_notices_activate() {
	if ( ! term_exists( 'Team Notices', 'category' ) ) {
		wp_insert_term( 'Team Notices', 'category', array( 'slug' => 'team-notices' ) );
	}
	ka_team_notices_schedule();
}
register_activation_hook( __FILE__, 'ka_team_notices_activate' );

function ka_team_notices_deactivate() {
	wp_clear_scheduled_hook( KA_TEAM_NOTICES_CRON_HOOK );
}
register_deactivation_hook( __FILE__, 'ka_team_notices_deactivate' );

function ka_team_notices_parse_allowlist( $value ) {
	$allowed = array();
	foreach ( preg_split( '/\r\n|\r|\n/', (string) $value ) as $line ) {
		$parts = array_map( 'trim', explode( '|', $line, 2 ) );
		if ( 2 === count( $parts ) && is_email( $parts[0] ) && '' !== $parts[1] ) {
			$allowed[ strtolower( $parts[0] ) ] = $parts[1];
		}
	}
	return $allowed;
}

function ka_team_notices_parse_template( $body ) {
	$fields = array();
	$lines = preg_split( '/\r\n|\r|\n/', trim( (string) $body ) );
	$message = array();
	$reading_message = false;
	foreach ( $lines as $line ) {
		if ( $reading_message ) {
			$message[] = $line;
			continue;
		}
		if ( preg_match( '/^(Team|Title|Starts|Expires|Message):\s*(.*)$/i', $line, $matches ) ) {
			$key = strtolower( $matches[1] );
			if ( 'message' === $key ) {
				$reading_message = true;
				$message[] = $matches[2];
			} else {
				$fields[ $key ] = trim( $matches[2] );
			}
		}
	}
	$fields['message'] = trim( implode( "\n", $message ) );
	foreach ( array( 'team', 'title', 'starts', 'expires', 'message' ) as $required ) {
		if ( empty( $fields[ $required ] ) ) {
			return new WP_Error( 'ka_notice_missing_field', sprintf( 'Missing required field: %s.', $required ) );
		}
	}
	return $fields;
}

function ka_team_notices_parse_date( $value, $label ) {
	if ( ! is_string( $value ) || ! preg_match( '/T.*(?:Z|[+-]\d{2}:\d{2})$/', $value ) ) {
		return new WP_Error( 'ka_notice_invalid_date', sprintf( '%s must use RFC 3339 format with an explicit timezone.', $label ) );
	}
	try {
		return new DateTimeImmutable( $value );
	} catch ( Exception $error ) {
		return new WP_Error( 'ka_notice_invalid_date', sprintf( '%s is not a valid date.', $label ) );
	}
}

function ka_team_notices_find_duplicate( $message_id ) {
	$posts = get_posts( array( 'post_type' => 'post', 'post_status' => array( 'publish', 'draft', 'pending', 'private', 'trash' ), 'posts_per_page' => 1, 'fields' => 'ids', 'meta_key' => '_ka_notice_source_message_id', 'meta_value' => $message_id ) );
	return $posts ? (int) $posts[0] : 0;
}

function ka_team_notices_publish( $sender, $message_id, $fields ) {
	$allowed = ka_team_notices_parse_allowlist( ka_team_notices_settings()['allowed_senders'] );
	$sender = strtolower( sanitize_email( $sender ) );
	$message_id = sanitize_text_field( $message_id );
	if ( ! isset( $allowed[ $sender ] ) ) {
		return new WP_Error( 'ka_notice_sender_forbidden', 'This sender is not approved to publish notices.' );
	}
	if ( 0 !== strcasecmp( $allowed[ $sender ], $fields['team'] ) ) {
		return new WP_Error( 'ka_notice_team_forbidden', 'This sender cannot publish for the requested team.' );
	}
	$duplicate = ka_team_notices_find_duplicate( $message_id );
	if ( $duplicate ) {
		return array( 'created' => false, 'post_id' => $duplicate, 'link' => get_permalink( $duplicate ) );
	}
	$starts_at = ka_team_notices_parse_date( $fields['starts'], 'Starts' );
	$expires_at = ka_team_notices_parse_date( $fields['expires'], 'Expires' );
	if ( is_wp_error( $starts_at ) ) {
		return $starts_at;
	}
	if ( is_wp_error( $expires_at ) ) {
		return $expires_at;
	}
	if ( $starts_at >= $expires_at ) {
		return new WP_Error( 'ka_notice_invalid_window', 'Expires must be later than Starts.' );
	}
	if ( $expires_at <= new DateTimeImmutable( 'now' ) ) {
		return new WP_Error( 'ka_notice_expired', 'Expires must be in the future.' );
	}
	$category = term_exists( 'team-notices', 'category' );
	if ( ! $category ) {
		$category = wp_insert_term( 'Team Notices', 'category', array( 'slug' => 'team-notices' ) );
	}
	if ( is_wp_error( $category ) ) {
		return $category;
	}
	$category_id = is_array( $category ) ? (int) $category['term_id'] : (int) $category;
	$message = sanitize_textarea_field( $fields['message'] );
	$post_id = wp_insert_post(
		array(
			'post_type' => 'post', 'post_status' => 'publish', 'post_title' => sanitize_text_field( $fields['title'] ),
			'post_content' => wpautop( esc_html( $message ) ), 'post_excerpt' => wp_trim_words( $message, 45, '…' ), 'post_category' => array( $category_id ),
			'meta_input' => array(
				'ka_notice_team' => sanitize_text_field( $allowed[ $sender ] ), 'ka_notice_starts_at' => $starts_at->format( DATE_RFC3339 ),
				'ka_notice_expires_at' => $expires_at->format( DATE_RFC3339 ), '_ka_notice_submitted_by' => $sender,
				'_ka_notice_source_message_id' => $message_id, '_ka_notice_received_at' => gmdate( DATE_RFC3339 ),
			),
		),
		true
	);
	if ( is_wp_error( $post_id ) ) {
		return $post_id;
	}
	return array( 'created' => true, 'post_id' => $post_id, 'link' => get_permalink( $post_id ) );
}

function ka_team_notices_decode_body( $body, $encoding ) {
	if ( 3 === (int) $encoding ) {
		$decoded = base64_decode( $body, true );
		return false === $decoded ? '' : $decoded;
	}
	return 4 === (int) $encoding ? quoted_printable_decode( $body ) : (string) $body;
}

function ka_team_notices_find_text_part( $inbox, $uid, $structure, $part_number = '' ) {
	if ( 0 === (int) $structure->type && 'PLAIN' === strtoupper( $structure->subtype ?? '' ) ) {
		$body = '' === $part_number ? imap_body( $inbox, $uid, FT_UID | FT_PEEK ) : imap_fetchbody( $inbox, $uid, $part_number, FT_UID | FT_PEEK );
		return ka_team_notices_decode_body( $body, $structure->encoding ?? 0 );
	}
	if ( ! empty( $structure->parts ) ) {
		foreach ( $structure->parts as $index => $part ) {
			$number = '' === $part_number ? (string) ( $index + 1 ) : $part_number . '.' . ( $index + 1 );
			$text = ka_team_notices_find_text_part( $inbox, $uid, $part, $number );
			if ( '' !== trim( $text ) ) {
				return $text;
			}
		}
	}
	return '';
}

function ka_team_notices_sender_from_overview( $overview ) {
	$addresses = imap_rfc822_parse_adrlist( $overview->from ?? '', '' );
	if ( ! $addresses || empty( $addresses[0]->mailbox ) || empty( $addresses[0]->host ) ) {
		return '';
	}
	return strtolower( $addresses[0]->mailbox . '@' . $addresses[0]->host );
}

function ka_team_notices_trigger_deployment( $post_id ) {
	if ( ! defined( 'KA_TEAM_NOTICES_GITHUB_TOKEN' ) || '' === KA_TEAM_NOTICES_GITHUB_TOKEN ) {
		return new WP_Error( 'ka_notice_no_github_token', 'Published, but the GitHub deployment token is not configured.' );
	}
	$settings = ka_team_notices_settings();
	$url = sprintf( 'https://api.github.com/repos/%s/%s/dispatches', rawurlencode( $settings['github_owner'] ), rawurlencode( $settings['github_repo'] ) );
	$response = wp_remote_post( $url, array( 'timeout' => 15, 'headers' => array( 'Accept' => 'application/vnd.github+json', 'Authorization' => 'Bearer ' . KA_TEAM_NOTICES_GITHUB_TOKEN, 'Content-Type' => 'application/json', 'X-GitHub-Api-Version' => '2022-11-28' ), 'body' => wp_json_encode( array( 'event_type' => 'wordpress-content-updated', 'client_payload' => array( 'post_id' => $post_id, 'source' => 'titan-team-notice' ) ) ) ) );
	if ( is_wp_error( $response ) ) {
		return $response;
	}
	return 204 === wp_remote_retrieve_response_code( $response ) ? true : new WP_Error( 'ka_notice_github_failed', 'GitHub rejected the deployment request.' );
}

function ka_team_notices_reply( $recipient, $subject, $message ) {
	if ( is_email( $recipient ) ) {
		wp_mail( $recipient, $subject, $message, array( 'From: Killarney Athletic Updates <updates@killarneyathletic.com>' ) );
	}
}

function ka_team_notices_set_status( $status, $detail, $processed = 0 ) {
	update_option( 'ka_team_notices_last_run', array( 'time' => gmdate( DATE_RFC3339 ), 'status' => $status, 'detail' => $detail, 'processed' => $processed ), false );
}

function ka_team_notices_poll() {
	if ( get_transient( 'ka_team_notices_poll_lock' ) ) {
		return;
	}
	set_transient( 'ka_team_notices_poll_lock', 1, 55 );
	if ( ! function_exists( 'imap_open' ) ) {
		ka_team_notices_set_status( 'error', 'The PHP IMAP extension is not available on this server.' );
		delete_transient( 'ka_team_notices_poll_lock' );
		return;
	}
	if ( ! defined( 'KA_TEAM_NOTICES_IMAP_PASSWORD' ) || '' === KA_TEAM_NOTICES_IMAP_PASSWORD ) {
		ka_team_notices_set_status( 'error', 'KA_TEAM_NOTICES_IMAP_PASSWORD is not configured in wp-config.php.' );
		delete_transient( 'ka_team_notices_poll_lock' );
		return;
	}
	$settings = ka_team_notices_settings();
	$mailbox = sprintf( '{%s:%d/imap/ssl}INBOX', $settings['imap_host'], (int) $settings['imap_port'] );
	$inbox = @imap_open( $mailbox, $settings['mailbox_address'], KA_TEAM_NOTICES_IMAP_PASSWORD, 0, 1 );
	if ( false === $inbox ) {
		ka_team_notices_set_status( 'error', 'Titan IMAP connection failed. Check the mailbox, password and third-party access.' );
		delete_transient( 'ka_team_notices_poll_lock' );
		return;
	}
	$uids = imap_search( $inbox, 'UNSEEN', SE_UID ) ?: array();
	$processed = 0;
	foreach ( array_slice( $uids, 0, 10 ) as $uid ) {
		$overview_rows = imap_fetch_overview( $inbox, (string) $uid, FT_UID );
		$overview = $overview_rows[0] ?? null;
		if ( ! $overview ) {
			continue;
		}
		$sender = ka_team_notices_sender_from_overview( $overview );
		$allowlist = ka_team_notices_parse_allowlist( $settings['allowed_senders'] );
		$raw_header = imap_fetchheader( $inbox, $uid, FT_UID );
		$message_id = trim( $overview->message_id ?? '' ) ?: hash( 'sha256', $raw_header );
		if ( ! isset( $allowlist[ $sender ] ) ) {
			imap_setflag_full( $inbox, (string) $uid, '\\Seen', ST_UID );
			continue;
		}
		if ( ! empty( $settings['require_dmarc'] ) && ! preg_match( '/\bdmarc\s*=\s*pass\b/i', $raw_header ) ) {
			ka_team_notices_reply( $sender, 'Team notice not published', 'Your message was received but did not pass DMARC authentication.' );
			imap_setflag_full( $inbox, (string) $uid, '\\Seen', ST_UID );
			continue;
		}
		$structure = imap_fetchstructure( $inbox, $uid, FT_UID );
		$body = $structure ? ka_team_notices_find_text_part( $inbox, $uid, $structure ) : '';
		$fields = ka_team_notices_parse_template( $body );
		$result = is_wp_error( $fields ) ? $fields : ka_team_notices_publish( $sender, $message_id, $fields );
		if ( is_wp_error( $result ) ) {
			ka_team_notices_reply( $sender, 'Team notice not published', $result->get_error_message() );
		} else {
			$deployment = ! empty( $result['created'] ) ? ka_team_notices_trigger_deployment( $result['post_id'] ) : true;
			$detail = is_wp_error( $deployment ) ? "\n\n" . $deployment->get_error_message() : "\n\nThe website refresh has been requested.";
			ka_team_notices_reply( $sender, 'Published: ' . $fields['title'], 'Your notice has been published: ' . $result['link'] . $detail );
		}
		imap_setflag_full( $inbox, (string) $uid, '\\Seen', ST_UID );
		++$processed;
	}
	@imap_close( $inbox );
	ka_team_notices_set_status( 'ok', $processed ? 'Mailbox checked and messages processed.' : 'Mailbox checked; no unread approved notices found.', $processed );
	delete_transient( 'ka_team_notices_poll_lock' );
}
add_action( KA_TEAM_NOTICES_CRON_HOOK, 'ka_team_notices_poll' );

function ka_team_notices_sanitize_settings( $input ) {
	$defaults = ka_team_notices_defaults();
	return array(
		'imap_host' => sanitize_text_field( $input['imap_host'] ?? $defaults['imap_host'] ), 'imap_port' => max( 1, min( 65535, absint( $input['imap_port'] ?? 993 ) ) ),
		'mailbox_address' => sanitize_email( $input['mailbox_address'] ?? $defaults['mailbox_address'] ), 'allowed_senders' => sanitize_textarea_field( $input['allowed_senders'] ?? '' ),
		'require_dmarc' => empty( $input['require_dmarc'] ) ? 0 : 1, 'github_owner' => sanitize_text_field( $input['github_owner'] ?? $defaults['github_owner'] ),
		'github_repo' => sanitize_text_field( $input['github_repo'] ?? $defaults['github_repo'] ),
	);
}

function ka_team_notices_admin_init() {
	register_setting( 'ka_team_notices', KA_TEAM_NOTICES_SETTINGS, array( 'sanitize_callback' => 'ka_team_notices_sanitize_settings' ) );
}
add_action( 'admin_init', 'ka_team_notices_admin_init' );

function ka_team_notices_admin_menu() {
	add_options_page( 'Team Notice Mailbox', 'Team Notice Mailbox', 'manage_options', 'ka-team-notices', 'ka_team_notices_settings_page' );
}
add_action( 'admin_menu', 'ka_team_notices_admin_menu' );

function ka_team_notices_manual_check() {
	if ( ! current_user_can( 'manage_options' ) ) {
		wp_die( 'You do not have permission to check this mailbox.' );
	}
	check_admin_referer( 'ka_team_notices_check_now' );
	ka_team_notices_poll();
	wp_safe_redirect( add_query_arg( 'checked', '1', admin_url( 'options-general.php?page=ka-team-notices' ) ) );
	exit;
}
add_action( 'admin_post_ka_team_notices_check_now', 'ka_team_notices_manual_check' );

function ka_team_notices_settings_page() {
	if ( ! current_user_can( 'manage_options' ) ) {
		return;
	}
	$settings = ka_team_notices_settings();
	$last_run = get_option( 'ka_team_notices_last_run', array() );
	?>
	<div class="wrap">
		<h1>Team Notice Mailbox</h1>
		<?php if ( isset( $_GET['checked'] ) ) : ?><div class="notice notice-success is-dismissible"><p>Mailbox check completed. Review the status below.</p></div><?php endif; ?>
		<h2>System status</h2>
		<ul>
			<li>PHP IMAP extension: <strong><?php echo function_exists( 'imap_open' ) ? 'Available' : 'Missing — ask Blacknight to enable it'; ?></strong></li>
			<li>Mailbox password constant: <strong><?php echo defined( 'KA_TEAM_NOTICES_IMAP_PASSWORD' ) && KA_TEAM_NOTICES_IMAP_PASSWORD ? 'Configured' : 'Missing'; ?></strong></li>
			<li>GitHub token constant: <strong><?php echo defined( 'KA_TEAM_NOTICES_GITHUB_TOKEN' ) && KA_TEAM_NOTICES_GITHUB_TOKEN ? 'Configured' : 'Missing'; ?></strong></li>
			<li>Next scheduled check: <strong><?php $next = wp_next_scheduled( KA_TEAM_NOTICES_CRON_HOOK ); echo $next ? esc_html( wp_date( 'j M Y H:i:s', $next ) ) : 'Not scheduled'; ?></strong></li>
			<li>Last check: <strong><?php echo ! empty( $last_run['time'] ) ? esc_html( $last_run['time'] . ' — ' . $last_run['detail'] ) : 'Not run yet'; ?></strong></li>
		</ul>
		<form action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" method="post"><input type="hidden" name="action" value="ka_team_notices_check_now"><?php wp_nonce_field( 'ka_team_notices_check_now' ); ?><?php submit_button( 'Check mailbox now', 'secondary', 'submit', false ); ?></form>
		<h2>Configuration</h2>
		<form method="post" action="options.php">
			<?php settings_fields( 'ka_team_notices' ); ?>
			<table class="form-table" role="presentation">
				<tr><th scope="row"><label for="ka-mailbox">Mailbox</label></th><td><input id="ka-mailbox" class="regular-text" type="email" name="<?php echo esc_attr( KA_TEAM_NOTICES_SETTINGS ); ?>[mailbox_address]" value="<?php echo esc_attr( $settings['mailbox_address'] ); ?>"></td></tr>
				<tr><th scope="row"><label for="ka-host">IMAP host</label></th><td><input id="ka-host" class="regular-text code" name="<?php echo esc_attr( KA_TEAM_NOTICES_SETTINGS ); ?>[imap_host]" value="<?php echo esc_attr( $settings['imap_host'] ); ?>"></td></tr>
				<tr><th scope="row"><label for="ka-port">IMAP port</label></th><td><input id="ka-port" type="number" min="1" max="65535" name="<?php echo esc_attr( KA_TEAM_NOTICES_SETTINGS ); ?>[imap_port]" value="<?php echo esc_attr( $settings['imap_port'] ); ?>"></td></tr>
				<tr><th scope="row"><label for="ka-senders">Approved senders</label></th><td><textarea id="ka-senders" class="large-text code" rows="7" name="<?php echo esc_attr( KA_TEAM_NOTICES_SETTINGS ); ?>[allowed_senders]"><?php echo esc_textarea( $settings['allowed_senders'] ); ?></textarea><p class="description">One per line: <code>manager@example.com|Senior A</code></p></td></tr>
				<tr><th scope="row">Email authentication</th><td><label><input type="checkbox" name="<?php echo esc_attr( KA_TEAM_NOTICES_SETTINGS ); ?>[require_dmarc]" value="1" <?php checked( $settings['require_dmarc'], 1 ); ?>> Require a DMARC pass before publishing</label></td></tr>
				<tr><th scope="row"><label for="ka-owner">GitHub owner</label></th><td><input id="ka-owner" class="regular-text" name="<?php echo esc_attr( KA_TEAM_NOTICES_SETTINGS ); ?>[github_owner]" value="<?php echo esc_attr( $settings['github_owner'] ); ?>"></td></tr>
				<tr><th scope="row"><label for="ka-repo">GitHub repository</label></th><td><input id="ka-repo" class="regular-text" name="<?php echo esc_attr( KA_TEAM_NOTICES_SETTINGS ); ?>[github_repo]" value="<?php echo esc_attr( $settings['github_repo'] ); ?>"></td></tr>
			</table>
			<?php submit_button(); ?>
		</form>
		<h2>Secrets</h2>
		<p>Add these constants to <code>wp-config.php</code> above the line that says <code>That's all, stop editing!</code>. Never paste real values into this plugin or Git.</p>
		<pre><code>define( 'KA_TEAM_NOTICES_IMAP_PASSWORD', 'your-updates-mailbox-password' );
define( 'KA_TEAM_NOTICES_GITHUB_TOKEN', 'your-fine-grained-github-token' );</code></pre>
	</div>
	<?php
}

function ka_team_notices_add_meta_box() {
	add_meta_box( 'ka-team-notice-details', 'Team Notice Details', 'ka_team_notices_render_meta_box', 'post', 'side', 'default' );
}
add_action( 'add_meta_boxes', 'ka_team_notices_add_meta_box' );

function ka_team_notices_render_meta_box( WP_Post $post ) {
	if ( ! get_post_meta( $post->ID, 'ka_notice_team', true ) ) {
		echo '<p>This is not a timed team notice.</p>';
		return;
	}
	wp_nonce_field( 'ka_team_notice_meta', 'ka_team_notice_nonce' );
	foreach ( array( 'ka_notice_team' => 'Team', 'ka_notice_starts_at' => 'Starts (RFC 3339)', 'ka_notice_expires_at' => 'Expires (RFC 3339)' ) as $key => $label ) {
		printf( '<p><label for="%1$s"><strong>%2$s</strong></label><br><input class="widefat" id="%1$s" name="%1$s" value="%3$s"></p>', esc_attr( $key ), esc_html( $label ), esc_attr( get_post_meta( $post->ID, $key, true ) ) );
	}
	echo '<p><strong>Submitted by</strong><br>' . esc_html( get_post_meta( $post->ID, '_ka_notice_submitted_by', true ) ) . '</p>';
}

function ka_team_notices_save_meta( $post_id ) {
	if ( ! isset( $_POST['ka_team_notice_nonce'] ) || ! wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['ka_team_notice_nonce'] ) ), 'ka_team_notice_meta' ) || ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) || ! current_user_can( 'edit_post', $post_id ) ) {
		return;
	}
	foreach ( array( 'ka_notice_team', 'ka_notice_starts_at', 'ka_notice_expires_at' ) as $key ) {
		if ( isset( $_POST[ $key ] ) ) {
			update_post_meta( $post_id, $key, sanitize_text_field( wp_unslash( $_POST[ $key ] ) ) );
		}
	}
}
add_action( 'save_post_post', 'ka_team_notices_save_meta' );
