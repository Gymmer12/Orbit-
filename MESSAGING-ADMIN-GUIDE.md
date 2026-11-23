# ORBIT + Messaging Administration

ORBIT + is messaging-only. The UI is inspired by the original ORBIT project's deep-blue layout.

## Sidebar
- **Chat:** Everyone with an approved account can read and send short text messages. The right panel groups approved members into Online and Offline using a recent-activity signal (approximately 90 seconds).
- **Announcements:** All approved members can read. Only admins and moderators can create, edit, and pin announcements. Text only.
- **Direct Messages:** Click Direct Messages to expand the scrollable list of approved members; select a nickname to open a private conversation. Blocking and reporting remain supported.
- **Approvals:** Only the administrator sees account requests, applicant verification chats, and the moderator assignment section.

## Add a moderator
1. Sign in with the existing ORBIT + admin account.
2. Click **Approvals** in the left sidebar.
3. Open **Announcement Moderators**, choose an *approved member* by nickname, and click **Make Moderator**.
4. They can now create/edit/pin announcements (but cannot approve accounts or give other users moderator rights).
5. To revoke the role, click **Remove moderator** beside their nickname.

The moderator role is stored in `public.orbit_moderators` and enforced by Supabase Row Level Security, not just hidden UI controls. No moderators are automatically assigned.

## Privacy and reliability
- The online indicator is based on a recent heartbeat while a browser tab is visible; it is approximate, not a guarantee the person is reading. Members go Offline shortly after leaving or closing the tab.
- Member lists show public nicknames only; full names and school email addresses are not displayed to other members.
- Unapproved members cannot access shared chats, presence or announcements through the database.
- Messages currently refresh by periodic checks, so they are near-live, not instant delivery.
- The administrator should review reports regularly and confirm student identities outside the app when feasible.
- Existing login, admin approval, and school-email signup requirements are kept. Email confirmation is controlled separately in Supabase Authentication settings.

## Deployment
Changes were committed on the main branch of `Gymmer12/Orbit-`. Render should deploy the static site automatically if auto-deploy is enabled.

## Ban and unban an account
1. Sign into ORBIT + with the administrator account and open **Approvals**.
2. Scroll to **Ban or unban accounts**.
3. Choose a registered account, enter a brief explanation, and click **Ban account**.
4. The account loses database access to Chat, Direct Messages, Announcements, presence, and applicant verification chat. They see an Account suspended screen when logged in.
5. To restore access, select **Unban** from the list. A user's existing approval status is preserved.

Only the administrator can ban or unban users; moderators cannot. You cannot ban yourself or another administrator through this interface. Bans do not delete old messages or permanently revoke Supabase authentication, but database row-level security immediately denies membership features. The website checks current ban status regularly; a banned member may need to refresh or wait briefly for the ban screen to appear. Their existing session remains usable only for signing out and seeing the ban reason.

## Message box and language rules
- The bottom composer is a rounded, text-only messaging field with a send arrow.
- Press **Enter** to send and **Shift+Enter** for a new line. Longer messages wrap automatically.
- A Supabase database trigger prevents new messages containing common profanity and abusive slurs, including some deliberately punctuated spellings.
- The filter applies to general Chat, DMs, private applicant verification chat, announcement titles/bodies, and new or changed public nicknames. Staff are subject to the same language rules.
- The sender receives a request-to-rewrite error if a message is rejected. Filtering is imperfect: it may miss creative variants or flag harmless contexts. Keep reviewing user reports and adjust the filter as needed.
- The filter does not automatically delete historic messages or block words typed outside these fields.

## Password protection
Supabase's Security Advisor currently warns that **Leaked Password Protection** is disabled. Consider enabling it under Supabase Authentication password security settings before inviting more members.
