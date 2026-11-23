# ORBIT + Member Settings

The Settings page is available to every **approved** ORBIT + member. It takes its
profile/status controls from the original ORBIT implementation in
`yualan480/Silk-Road-History-Project/chat/app.js`, while keeping ORBIT + text-only.

## Where to find Settings
- Sign in to ORBIT +.
- In the left sidebar, select **Settings**, underneath **Orbit Studio**.
- You can also click your display name / status at the foot of the sidebar.
- **Approvals** remains exclusive to the site's designated administrator.

## What members can change

**My Account:** See your nickname, your school email (only you and administrators
can use this information), your approval status, profile photo and role.

**Presence & Status:**
- **Online** (green): available for messages.
- **Idle** (yellow): away.
- **Do Not Disturb** (red): busy; suppresses optional browser notifications.
- **Invisible** (gray): appears offline, while still allowing you to use the site.
- **Custom status:** Up to 80 characters, shown below your name to approved members.
- Save with **Save status**. Setting Invisible also removes your recent online
  heartbeat. It doesn't hide messages you send or anonymize your account.

**About Me:** Set a bio of up to 190 characters and a fallback avatar color.
Your bio and color appear to other approved members. The same language filter
used for chats applies to public status and bio fields.

**Appearance:** A shortcut to **Orbit Studio**, where photos, rings, name fonts,
home themes and full-site colors are free.

**Notifications:** Choose alerts for direct messages and optionally shared
Chat. Click **Allow browser notifications** to request permission. Alerts work
while ORBIT + remains open as a browser tab; they are *not* offline push
notifications. Do Not Disturb suppresses pop-up alerts. Settings are private
and saved across devices.

**Security:** Update your ORBIT + account password and sign out. Never share
your password or use your school-account password for ORBIT +. Supabase can
require additional verification for sensitive account changes.

## Member list and profiles
The right-hand member panel uses the same Online/Idle/Do Not Disturb/Offline
display rules. Members can click a nickname to view its public profile:
avatar, chosen name font, availability, custom status, and bio. The profile
includes a shortcut to open a private DM.

## Data model and permissions
- Public (approved members only): `public.profiles.member_status`,
  `custom_status`, `bio`, `avatar_color`. Only the owner can update them
  through existing RLS policies.
- Private: `public.orbit_member_preferences` stores DM and Chat notification
  toggles. RLS allows each approved account to read and change only its own row.
- The existing bans, sign-in gate and admin-approval policies remain enforced.
- Profanity checks are applied to new public status and bio updates on the
  database server as well as ordinary messaging.
- UI state refresh is periodic; online badges may lag briefly.

## Logo update
The glossy blue-to-lavender `+` beside the Orbit wordmark is now rendered
at an 86px desktop font size (72px on narrow screens) so it visually matches
the lettering rather than looking like a small superscript.

## Testing
SQL transactions confirmed the authenticated administrator can save a
status, bio, avatar color and notification preferences; invalid public text
is rejected; private notification settings are not readable by another
account. All test mutations were rolled back.

The GitHub source passes JavaScript syntax, DOM-reference and CSS-balance
checks. A real two-account Render/browser visual test has not been completed;
test online/idle/invisible status with two approved accounts before launch.
