# Editing The Life Office website

The website text and the hero photo are managed through a simple online editor
(Sanity Studio). No code, no developers, no deploys.

---

## One-time setup (Sam — do these three things first)

Megan can't edit until these are done once:

1. **Turn the editor on.** Go to <https://the-life-office-two.vercel.app/studio>,
   log in with your Sanity account, and on the "Connect this studio" screen click
   **Register this studio**.
2. **Load the current text in.** In a terminal, in the project folder, run:
   ```
   npx sanity login
   npx sanity exec scripts/seed.ts --with-user-token
   ```
   This fills the editor with the site's current wording, so Megan edits real text
   rather than blank boxes.
3. **Invite Megan.** Go to <https://manage.sanity.io> → project **the-life-office**
   (`stnrkz1n`) → **Members** → invite Megan's email with the **Editor** role.

---

## How Megan edits the site

1. **Open the editor:** <https://the-life-office-two.vercel.app/studio>
2. **Log in** with the email Sam invited you with.
3. Click **Landing Page**. This is the whole page's text, split into **tabs** that
   match the sections of the website — Hero, The Load, Signature Offer, How It
   Works, Pricing, and so on.
4. Click a tab and change the words in any box.
   - **Lists** (the bulleted points): use **Add item** to add a line, the bin icon
     to remove one, or drag the handle to reorder.
   - **Hero photo:** Hero tab → **Background image** → upload a new image.
5. When you're happy, click **Publish** (top right).
   - Until you click Publish, nothing changes on the live site — your edits are
     saved privately as a draft.
6. **Done.** The live website updates on its own within about a minute. Refresh the
   page to see your changes.

---

## What happens when you publish

```
You edit  →  click Publish  →  the live site refreshes (~60 seconds)  →  visitors see it
```

No deploy, no waiting on anyone. You publish, it goes live a minute later.

## Good to know

- **You can't break it.** The layout, colours, fonts and section order are fixed.
  You're only editing words and the hero photo, inside labelled boxes.
- **Mistakes are safe.** If you ever clear a box by accident, the site quietly shows
  the original wording for that bit until you fill it back in — it never goes blank.
- **Drafts are private.** Edits only go public when you press Publish, so you can
  work on changes and leave them unpublished.
- **No technical bits.** You never touch code, hosting, or anything to do with
  Vercel or developers.
