# ORBIT + Account Approval (Site Owner Setup)

## What this does
- Every new account remains **Pending Approval**, even if Supabase immediately signs them in.
- Pending students cannot see the main site; database RLS also blocks access to existing chat data.
- Applicants can exchange private verification messages with the authorized administrator.
- The administrator sees the queue, first/last name, school email, nickname, and the chat.
- The administrator can **Approve** or **Reject**. Sign-in is remembered using Supabase's normal browser session.
- Verification chat is between the applicant and administrator only. Do not ask for passwords, student IDs, home addresses, or other sensitive information.
- If you want to know who someone really is, confirm with them **in person at school**. Their submitted name and email are not proof by themselves.

## Mandatory one-time step: choose the real administrator

**Do not skip this:** We deliberately have not automatically promoted any user to administrator. Only the owner of the Supabase project should run this.

1. Create your own ORBIT + account with **your** school email first. You may need to disable email confirmation under Supabase Authentication → Providers → Email → Confirm email to permit immediate signup.
2. Sign into the Supabase Dashboard as the project owner and open SQL Editor.
3. Replace the quoted placeholder below with **your own ORBIT + signup email**. Don't send your password or email in this chat.
4. Run:

\`\`\`sql
insert into public.orbit_admins (user_id)
select id from auth.users where lower(email) = lower('YOUR_OWN_SCHOOL_EMAIL@tesdk12.net')
on conflict (user_id) do nothing;
\`\`\`

5. Verify exactly one person was made an admin:

\`\`\`sql
select count(*) as administrators from public.orbit_admins;
\`\`\`

6. Refresh ORBIT +. The **Approvals** tab will appear only for your authorized account.

If your account isn't yet registered, the INSERT will add zero rows. Don't assign admin status to any unverified person.

## Optional no-email-link signup
Your site itself cannot change Supabase's email confirmation policy. In the Supabase Dashboard, go to Authentication → Providers → Email and (if you accept the identity-verification tradeoff) turn off **Confirm email**. The ORBIT + approval gate still prevents unapproved students from entering. Do **not** disable the existing school-email-format restriction in Authentication Hooks.

## Before schoolwide launch
- Manually review each applicant; speak to them in person at school when possible.
- A person can type any name; a password protects their account but does not prove who they are.
- Review requests regularly and treat names/emails as private student data.
- Coordinate with school administrators/IT about school email usage, permission and moderation.
- Use rate limiting / CAPTCHA if applications are spammed. Supabase email-confirmation-off signup requires extra care.

## Test
1. Sign in as the admin and confirm Approvals appears.
2. Create another new account in another browser.
3. That account should see Pending Approval, **not** the rest of ORBIT +.
4. Send a verification message as the applicant and reply from the Approvals tab as the admin.
5. Approve the account and verify the applicant enters the main website.
6. Test Rejected for a third applicant: they must remain outside.
7. For logged-in users, the website checks status regularly; the approved student should enter without signing in again.
