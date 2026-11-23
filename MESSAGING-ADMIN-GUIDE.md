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
