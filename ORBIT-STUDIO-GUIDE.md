# ORBIT + / Orbit Studio

## Design references
This is an ORBIT + original adaptation of features present in Alan's
`yualan480/Silk-Road-History-Project`: the deep-blue Orbit visual language,
glowing avatar frames, display-name fonts, and home themes.
The original shop used a virtual Orbit currency; **Orbit Studio is 100% free**.
There are no prices, purchases, or gaming/leaderboard features.

## Where it appears
- **Home:** A classic Orbit space scene with quick links to Chat, Announcements,
  Direct Messages and Orbit Studio. Your personal home theme is applied here.
- **Orbit Studio:** A free appearance gallery. Click a tile to equip it.
- **Sidebar avatar:** Click your profile picture to open Studio.
- **Approvals:** The button is not displayed for regular members or moderators.
  Only the administrator can read or update pending applications.

## Appearance options
- **Profile picture:** Free planet, moon, comet, starlight, aurora and galaxy
  presets; or upload your own JPG, PNG or WebP image.
- **Avatar rings:** Classic, Orbit, Electric, Solar Flare, Frost and Royal.
- **Display-name fonts:** Original, Rounded, Elegant, Terminal, Space Tech
  and Handwritten. The font appears to other approved members in Chat, DM
  contacts, the online member list, and announcement author names.
- **Home themes:** Classic Orbit, Aurora, Solar Sunset, Rose Nebula, Arctic,
  Midnight, and Deep Nebula. Your home theme is personal; it doesn't change
  everyone else's screen.

## Photo privacy and limits
- Uploaded pictures are cropped to 256 × 256 in the browser and saved as a
  compressed WebP image (up to 1 MB).
- Supabase bucket `orbit-member-avatars` is **private**. Only the owner of an
  approved account can change their own photo. Approved members can obtain
  temporary signed links to view the images.
- A signed link can be forwarded and remains usable until its short expiry.
  Never upload private or sensitive photos.
- Unapproved or banned members cannot list stored profile pictures, or browse
  the approved member directory.

## How members use it
1. Sign in with your approved ORBIT + account.
2. Open **Orbit Studio** in the sidebar.
3. Select any free picture, frame, font or theme. Changes save to Supabase.
4. To upload a custom photo, select **Upload profile picture**.
5. To remove an uploaded photo, select **Use selected avatar instead**.

## Admin verification
- Supabase table `orbit_admins` holds the designated administrator role.
- `orbit_applications` uses RLS so regular members only read their own
  application. Only the administrator can review other applications.
- The Approvals sidebar control requires both a verified session and
  `adminApproved`; hiding the control is not the sole security measure.
- No accounts are automatically made administrators.

## Deployment and testing
- Site files: `index.html`, `orbit-studio.js`, `orbit-studio.css`,
  `orbit-community.css`.
- Database setup: `orbit-studio-setup.sql`.
- GitHub `main` is the source for your Render deployment if auto-deploy is on.
- After deployment, test two different approved accounts in two browsers:
  profile font/ring visible to each other, avatar signed URLs and photo
  replacement, personal homepage theme, and absence of Approvals for members.
- Running a query in Supabase verifies database rules, but is not a substitute
  for a live two-account browser test.

## Customize the colors of the entire ORBIT + website
1. Open **Orbit Studio → Whole website colors**.
2. Try a quick combination: Classic Orbit, Aurora, Solar Sunset, Rose Nebula,
   Arctic, Midnight or Daylight.
3. To create your own, click any of the **six color swatches** to open your
   browser's built-in color picker: Background, Sidebar, Cards & chat,
   Buttons & highlights, Text, and Borders.
4. The website changes **instantly** as you choose colors. The miniature
   chat mockup also previews the combination.
5. Click **Save my palette** to keep the colors on your account across devices.
   **Undo changes** restores the last saved combination; **Original ORBIT + colors**
   removes the custom palette and restores the original website style.
6. A contrast warning appears when text is difficult to read against your
   background, sidebar, or cards. The send button automatically uses a readable
   contrasting foreground color.

Your saved colors apply to the sidebar, Chat, Direct Messages, Announcements,
Home, Orbit Studio, cards, input fields, buttons, and the Admin Approvals window.
They are **personal**: other users keep their own colors. Home-background themes
and uploaded profile pictures continue working separately. The login screen
(before an account can be identified) remains the original ORBIT + design.

Technical notes: palettes are stored as six validated hex colors in
`orbit_appearance.site_palette`, where owner-only RLS policies apply. Invalid
or extra values are rejected server-side. A blank JSON object (`{}`) means
no custom palette. The CSS file `orbit-palette.css` loads after all other
site styles; live preview changes never enter the database until saved (except
when using the explicitly labeled original-colors reset).
