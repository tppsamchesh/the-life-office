/**
 * Seeds the singleton "Landing Page" document with the verbatim default copy.
 *
 * Run once, after logging in to the Sanity CLI:
 *   npx sanity login
 *   npx sanity exec scripts/seed.ts --with-user-token
 *
 * Uses createIfNotExists, so re-running will NOT overwrite later edits.
 */
import { getCliClient } from "sanity/cli";

import { defaultContent as d } from "../sanity/defaultContent";

const client = getCliClient();

const doc = {
  _id: "landingPage",
  _type: "landingPage",

  heroHeadline: d.hero.headline,
  heroLine1: d.hero.line1,
  heroLine2: d.hero.line2,

  loadHeadline: d.load.headline,
  loadBody: d.load.body,
  loadLine1: d.load.line1,
  loadLine2: d.load.line2,

  offerLabel: d.offer.label,
  offerTitle: d.offer.title,
  offerItalic1: d.offer.italic1,
  offerItalic2: d.offer.italic2,
  offerIntro: d.offer.intro,
  offerColumns: d.offer.columns.map((c, i) => ({
    _type: "offerColumn",
    _key: `offercol-${i}`,
    heading: c.heading,
    ...(c.note ? { note: c.note } : {}),
    items: c.items,
  })),

  howHeadline: d.how.headline,
  howSteps: d.how.steps.map((s, i) => ({
    _type: "step",
    _key: `step-${i}`,
    title: s.title,
    body: s.body,
  })),

  changesHeadline: d.changes.headline,
  changesIntro: d.changes.intro,
  changesItems: d.changes.items,

  whoHeadline: d.who.headline,
  whoIntro: d.who.intro,
  whoItems: d.who.items,
  whoClosing: d.who.closing,
  whoClosingItalic: d.who.closingItalic,

  deliveryHeadline: d.delivery.headline,
  deliveryIntro: d.delivery.intro,
  deliveryColumns: d.delivery.columns.map((c, i) => ({
    _type: "deliveryColumn",
    _key: `delcol-${i}`,
    heading: c.heading,
    items: c.items,
  })),
  deliveryBackbone: d.delivery.backbone,

  pricingHeadline: d.pricing.headline,
  pricingIntro: d.pricing.intro,
  pricingFigure: d.pricing.figure,
  pricingClosing: d.pricing.closing,

  closingHeadline: d.closing.headline,
  closingBody: d.closing.body,
};

client
  .createIfNotExists(doc)
  .then(() => console.log('✔ Seeded "Landing Page" document.'))
  .catch((err) => {
    console.error("Seed failed:", err.message);
    process.exit(1);
  });
