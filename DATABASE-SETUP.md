# ORBIT + database setup (Supabase)

The website is deployed from `Gymmer12/Orbit-` through Render. GitHub updates should automatically deploy when Render auto-deploy is enabled.

## Setup
1. Visit https://supabase.com/dashboard and create a project. An adult should review terms and privacy settings if required.
2. In **SQL Editor**, paste the complete contents of `supabase-setup.sql` and run once. Review the SQL before running.
3. In **Authentication → Providers**, keep email/password enabled. Keep email confirmation on. In URL configuration, set your Render website as the Site URL and add its full URL to redirect URLs if needed.
4. In **Project Settings → API**, get the Project URL and **publishable key** (or legacy **anon** key). NEVER use a `service_role` or secret key in website files.
5. Edit `config.js` in your GitHub repository. Set `url` and `anonKey` to those public values. Commit the changes.
6. Visit your Render website. Create two separate test accounts, confirm their emails, and sign in. In Social → Direct Messages, each user must check **Show my nickname in the directory** to be listed.
7. Test sending General Chat messages between devices and sending private messages. Test blocking and reporting. Check the reports table in Supabase dashboard.

## How it works
- **Social → Announcements**: read-only to members; insert announcements using the Supabase SQL Editor or dashboard.
- **Social → General Chat**: signed-in registered users can send and read shared messages.
- **Social → Direct Messages**: registered users who opt in appear by nickname; email addresses are never exposed in the directory.
- **Security**: database Row Level Security (RLS) restricts DMs to sender and recipient. Users can block and report other members.
- **Refresh**: messages poll every 6 seconds; this is a starter implementation, not websocket live typing.
- **Offline mode**: if public config is blank, General Chat is still a local demo. Announcements and DMs explain why they're disabled.
- **Leaderboard/shop**: still browser-local and not protected by accounts. Secure server-side rewards would need separate work.

## Privacy/safety before inviting other students
Use a small invited group first; review reports regularly, decide retention rules, and make sure the site has a clear contact/reporting process. Real names, school schedules, addresses, and other personal details should not be posted in a public chat. Passwords belong only in the website's own sign-in form.
