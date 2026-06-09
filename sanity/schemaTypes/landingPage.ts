import { defineArrayMember, defineField, defineType } from "sanity";

// The whole landing page is one document, organised into tabbed groups that
// mirror the sections of the page. The section order, layout, fonts and colours
// live in code — Megan edits the words (and the hero image) only.

export const landingPage = defineType({
  name: "landingPage",
  title: "Landing Page",
  type: "document",
  groups: [
    { name: "hero", title: "Hero" },
    { name: "load", title: "The Load" },
    { name: "offer", title: "Signature Offer" },
    { name: "how", title: "How It Works" },
    { name: "changes", title: "What Changes" },
    { name: "who", title: "Who This Is For" },
    { name: "delivery", title: "Delivery Model" },
    { name: "pricing", title: "Pricing" },
    { name: "closing", title: "Closing CTA" },
  ],
  fields: [
    // ── Hero ──────────────────────────────────────────────
    defineField({ name: "heroHeadline", title: "Headline", type: "string", group: "hero" }),
    defineField({ name: "heroLine1", title: "Supporting line 1", type: "text", rows: 2, group: "hero" }),
    defineField({ name: "heroLine2", title: "Supporting line 2", type: "text", rows: 2, group: "hero" }),
    defineField({
      name: "heroImage",
      title: "Background image",
      type: "image",
      options: { hotspot: true },
      description: "Optional. Leave empty to use the built-in image.",
      group: "hero",
    }),

    // ── The Load ──────────────────────────────────────────
    defineField({ name: "loadHeadline", title: "Headline", type: "string", group: "load" }),
    defineField({ name: "loadBody", title: "Paragraph", type: "text", rows: 5, group: "load" }),
    defineField({ name: "loadLine1", title: "Closing line 1", type: "text", rows: 2, group: "load" }),
    defineField({ name: "loadLine2", title: "Closing line 2", type: "text", rows: 3, group: "load" }),

    // ── Signature Offer ───────────────────────────────────
    defineField({ name: "offerLabel", title: "Label", type: "string", group: "offer" }),
    defineField({ name: "offerTitle", title: "Title", type: "string", group: "offer" }),
    defineField({ name: "offerItalic1", title: "Italic line 1", type: "string", group: "offer" }),
    defineField({ name: "offerItalic2", title: "Italic line 2", type: "string", group: "offer" }),
    defineField({ name: "offerIntro", title: "Intro line", type: "string", group: "offer" }),
    defineField({
      name: "offerColumns",
      title: "Columns",
      type: "array",
      group: "offer",
      of: [
        defineArrayMember({
          type: "object",
          name: "offerColumn",
          fields: [
            defineField({ name: "heading", title: "Heading", type: "string" }),
            defineField({ name: "note", title: "Sub-note (optional)", type: "string" }),
            defineField({ name: "items", title: "List items", type: "array", of: [{ type: "string" }] }),
          ],
          preview: { select: { title: "heading" } },
        }),
      ],
    }),

    // ── How It Works ──────────────────────────────────────
    defineField({ name: "howHeadline", title: "Headline", type: "string", group: "how" }),
    defineField({
      name: "howSteps",
      title: "Steps",
      type: "array",
      group: "how",
      description: "Step numbers (Step 1, Step 2…) are added automatically.",
      of: [
        defineArrayMember({
          type: "object",
          name: "step",
          fields: [
            defineField({ name: "title", title: "Title", type: "string" }),
            defineField({ name: "body", title: "Description", type: "text", rows: 3 }),
          ],
          preview: { select: { title: "title" } },
        }),
      ],
    }),

    // ── What Changes ──────────────────────────────────────
    defineField({ name: "changesHeadline", title: "Headline", type: "string", group: "changes" }),
    defineField({ name: "changesIntro", title: "Intro line", type: "string", group: "changes" }),
    defineField({ name: "changesItems", title: "List items", type: "array", of: [{ type: "string" }], group: "changes" }),

    // ── Who This Is For ───────────────────────────────────
    defineField({ name: "whoHeadline", title: "Headline", type: "string", group: "who" }),
    defineField({ name: "whoIntro", title: "Intro line", type: "string", group: "who" }),
    defineField({ name: "whoItems", title: "List items", type: "array", of: [{ type: "string" }], group: "who" }),
    defineField({ name: "whoClosing", title: "Closing line", type: "text", rows: 2, group: "who" }),
    defineField({ name: "whoClosingItalic", title: "Closing line (italic)", type: "text", rows: 2, group: "who" }),

    // ── Delivery Model ────────────────────────────────────
    defineField({ name: "deliveryHeadline", title: "Headline", type: "string", group: "delivery" }),
    defineField({ name: "deliveryIntro", title: "Intro line", type: "string", group: "delivery" }),
    defineField({
      name: "deliveryColumns",
      title: "Lists",
      type: "array",
      group: "delivery",
      of: [
        defineArrayMember({
          type: "object",
          name: "deliveryColumn",
          fields: [
            defineField({ name: "heading", title: "Heading", type: "string" }),
            defineField({ name: "items", title: "List items", type: "array", of: [{ type: "string" }] }),
          ],
          preview: { select: { title: "heading" } },
        }),
      ],
    }),
    defineField({ name: "deliveryBackbone", title: "Closing statement", type: "text", rows: 2, group: "delivery" }),

    // ── Pricing ───────────────────────────────────────────
    defineField({ name: "pricingHeadline", title: "Headline", type: "string", group: "pricing" }),
    defineField({ name: "pricingIntro", title: "Intro line", type: "string", group: "pricing" }),
    defineField({ name: "pricingFigure", title: "Figure", type: "string", group: "pricing" }),
    defineField({ name: "pricingClosing", title: "Closing line", type: "text", rows: 3, group: "pricing" }),

    // ── Closing CTA ───────────────────────────────────────
    defineField({ name: "closingHeadline", title: "Headline", type: "string", group: "closing" }),
    defineField({ name: "closingBody", title: "Body", type: "text", rows: 4, group: "closing" }),
  ],
  preview: { prepare: () => ({ title: "Landing Page" }) },
});
