import { type SanityImageSource } from "@sanity/image-url";

import {
  defaultContent,
  type LandingContent,
  type OfferColumn,
  type SimpleColumn,
  type Step,
} from "./defaultContent";
import { urlFor } from "./image";
import { sanityFetch } from "./live";

// Loose shape of the projected document — every field may be missing or null
// (the resolver below coalesces each one to a verbatim default).
type Nullable<T> = T | null | undefined;
type RawColumn = { heading?: Nullable<string>; note?: Nullable<string>; items?: Nullable<Nullable<string>[]> };
type RawStep = { title?: Nullable<string>; body?: Nullable<string> };
type RawLanding = {
  hero?: Nullable<{ headline?: Nullable<string>; line1?: Nullable<string>; line2?: Nullable<string> }>;
  heroImage?: Nullable<{ asset?: unknown }>;
  load?: Nullable<{ headline?: Nullable<string>; body?: Nullable<string>; line1?: Nullable<string>; line2?: Nullable<string> }>;
  offer?: Nullable<{
    label?: Nullable<string>; title?: Nullable<string>; italic1?: Nullable<string>;
    italic2?: Nullable<string>; intro?: Nullable<string>; columns?: Nullable<RawColumn[]>;
  }>;
  how?: Nullable<{ headline?: Nullable<string>; steps?: Nullable<RawStep[]> }>;
  changes?: Nullable<{ headline?: Nullable<string>; intro?: Nullable<string>; items?: Nullable<Nullable<string>[]> }>;
  who?: Nullable<{
    headline?: Nullable<string>; intro?: Nullable<string>; items?: Nullable<Nullable<string>[]>;
    closing?: Nullable<string>; closingItalic?: Nullable<string>;
  }>;
  delivery?: Nullable<{
    headline?: Nullable<string>; intro?: Nullable<string>;
    columns?: Nullable<RawColumn[]>; backbone?: Nullable<string>;
  }>;
  pricing?: Nullable<{ headline?: Nullable<string>; intro?: Nullable<string>; figure?: Nullable<string>; closing?: Nullable<string> }>;
  closing?: Nullable<{ headline?: Nullable<string>; body?: Nullable<string> }>;
};

// Project the flat document fields into the nested LandingContent shape.
const LANDING_QUERY = `*[_type == "landingPage"][0]{
  "hero": { "headline": heroHeadline, "line1": heroLine1, "line2": heroLine2 },
  heroImage,
  "load": { "headline": loadHeadline, "body": loadBody, "line1": loadLine1, "line2": loadLine2 },
  "offer": {
    "label": offerLabel, "title": offerTitle, "italic1": offerItalic1,
    "italic2": offerItalic2, "intro": offerIntro,
    "columns": offerColumns[]{ heading, note, items }
  },
  "how": { "headline": howHeadline, "steps": howSteps[]{ title, body } },
  "changes": { "headline": changesHeadline, "intro": changesIntro, "items": changesItems },
  "who": {
    "headline": whoHeadline, "intro": whoIntro, "items": whoItems,
    "closing": whoClosing, "closingItalic": whoClosingItalic
  },
  "delivery": {
    "headline": deliveryHeadline, "intro": deliveryIntro,
    "columns": deliveryColumns[]{ heading, items }, "backbone": deliveryBackbone
  },
  "pricing": { "headline": pricingHeadline, "intro": pricingIntro, "figure": pricingFigure, "closing": pricingClosing },
  "closing": { "headline": closingHeadline, "body": closingBody }
}`;

// Use the Sanity value only when it's actually present; otherwise fall back.
const str = (v: unknown, fallback: string): string =>
  typeof v === "string" && v.trim() !== "" ? v : fallback;

const list = (v: unknown, fallback: string[]): string[] => {
  const arr = Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x.trim() !== "") : [];
  return arr.length ? arr : fallback;
};

export type LandingData = {
  content: LandingContent;
  heroImageUrl: string;
};

const FALLBACK_HERO_IMAGE = "/Hero image 1.avif";

export async function getLandingData(): Promise<LandingData> {
  let raw: RawLanding | null = null;
  try {
    const { data } = await sanityFetch({ query: LANDING_QUERY });
    raw = (data as RawLanding | null) ?? null;
  } catch {
    raw = null; // Sanity unreachable — render defaults so the page never breaks.
  }

  const d = defaultContent;

  const offerColumns: OfferColumn[] =
    Array.isArray(raw?.offer?.columns) && raw.offer.columns.length
      ? raw.offer.columns.map((c: RawColumn, i: number) => ({
          heading: str(c?.heading, d.offer.columns[i]?.heading ?? ""),
          note: typeof c?.note === "string" && c.note.trim() !== "" ? c.note : undefined,
          items: list(c?.items, d.offer.columns[i]?.items ?? []),
        }))
      : d.offer.columns;

  const steps: Step[] =
    Array.isArray(raw?.how?.steps) && raw.how.steps.length
      ? raw.how.steps.map((s: RawStep, i: number) => ({
          title: str(s?.title, d.how.steps[i]?.title ?? ""),
          body: str(s?.body, d.how.steps[i]?.body ?? ""),
        }))
      : d.how.steps;

  const deliveryColumns: SimpleColumn[] =
    Array.isArray(raw?.delivery?.columns) && raw.delivery.columns.length
      ? raw.delivery.columns.map((c: RawColumn, i: number) => ({
          heading: str(c?.heading, d.delivery.columns[i]?.heading ?? ""),
          items: list(c?.items, d.delivery.columns[i]?.items ?? []),
        }))
      : d.delivery.columns;

  const content: LandingContent = {
    hero: {
      headline: str(raw?.hero?.headline, d.hero.headline),
      line1: str(raw?.hero?.line1, d.hero.line1),
      line2: str(raw?.hero?.line2, d.hero.line2),
    },
    load: {
      headline: str(raw?.load?.headline, d.load.headline),
      body: str(raw?.load?.body, d.load.body),
      line1: str(raw?.load?.line1, d.load.line1),
      line2: str(raw?.load?.line2, d.load.line2),
    },
    offer: {
      label: str(raw?.offer?.label, d.offer.label),
      title: str(raw?.offer?.title, d.offer.title),
      italic1: str(raw?.offer?.italic1, d.offer.italic1),
      italic2: str(raw?.offer?.italic2, d.offer.italic2),
      intro: str(raw?.offer?.intro, d.offer.intro),
      columns: offerColumns,
    },
    how: {
      headline: str(raw?.how?.headline, d.how.headline),
      steps,
    },
    changes: {
      headline: str(raw?.changes?.headline, d.changes.headline),
      intro: str(raw?.changes?.intro, d.changes.intro),
      items: list(raw?.changes?.items, d.changes.items),
    },
    who: {
      headline: str(raw?.who?.headline, d.who.headline),
      intro: str(raw?.who?.intro, d.who.intro),
      items: list(raw?.who?.items, d.who.items),
      closing: str(raw?.who?.closing, d.who.closing),
      closingItalic: str(raw?.who?.closingItalic, d.who.closingItalic),
    },
    delivery: {
      headline: str(raw?.delivery?.headline, d.delivery.headline),
      intro: str(raw?.delivery?.intro, d.delivery.intro),
      columns: deliveryColumns,
      backbone: str(raw?.delivery?.backbone, d.delivery.backbone),
    },
    pricing: {
      headline: str(raw?.pricing?.headline, d.pricing.headline),
      intro: str(raw?.pricing?.intro, d.pricing.intro),
      figure: str(raw?.pricing?.figure, d.pricing.figure),
      closing: str(raw?.pricing?.closing, d.pricing.closing),
    },
    closing: {
      headline: str(raw?.closing?.headline, d.closing.headline),
      body: str(raw?.closing?.body, d.closing.body),
    },
  };

  const heroImageUrl = raw?.heroImage?.asset
    ? urlFor(raw.heroImage as SanityImageSource).width(2400).quality(80).url()
    : FALLBACK_HERO_IMAGE;

  return { content, heroImageUrl };
}
