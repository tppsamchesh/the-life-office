// The shape of the landing-page content, plus the verbatim default copy.
//
// This is the single source of truth for the page text. The seed script writes
// it into Sanity, and the page falls back to it field-by-field if Sanity has no
// value yet — so the site always renders, even before seeding or if a field is
// cleared in the Studio.

export type OfferColumn = { heading: string; note?: string; items: string[] };
export type Step = { title: string; body: string };
export type SimpleColumn = { heading: string; items: string[] };

export type LandingContent = {
  hero: { headline: string; line1: string; line2: string };
  load: { headline: string; body: string; line1: string; line2: string };
  offer: {
    label: string;
    title: string;
    italic1: string;
    italic2: string;
    intro: string;
    columns: OfferColumn[];
  };
  how: { headline: string; steps: Step[] };
  changes: { headline: string; intro: string; items: string[] };
  who: {
    headline: string;
    intro: string;
    items: string[];
    closing: string;
    closingItalic: string;
  };
  delivery: {
    headline: string;
    intro: string;
    columns: SimpleColumn[];
    backbone: string;
  };
  pricing: { headline: string; intro: string; figure: string; closing: string };
  closing: { headline: string; body: string };
};

export const defaultContent: LandingContent = {
  hero: {
    headline: "The Life Office",
    line1: "We run the operations behind your life and business.",
    line2:
      "So nothing important gets missed, delayed, or left on you to figure out.",
  },
  load: {
    headline: "Life is complicated. Running it shouldn’t be.",
    body: "You’re managing more than most people can see. Work is demanding. Life admin never stops. Family logistics pile up. Your calendar runs you instead of the other way around. And everything relies on you remembering it.",
    line1: "The Life Office removes that load.",
    line2:
      "We become your personal operations partner, handling the moving parts of your life and business so you can focus on what actually matters.",
  },
  offer: {
    label: "The Signature Offer",
    title: "The Life Office Partner",
    italic1: "Your dedicated operations system for life and business.",
    italic2: "We don’t sell tasks. We run your backend.",
    intro: "We typically handle:",
    columns: [
      {
        heading: "Personal Operations",
        items: [
          "Calendar and scheduling management",
          "Family logistics and coordination",
          "School, childcare, and household admin",
          "Travel planning and bookings",
          "Reminders, renewals, and life admin",
        ],
      },
      {
        heading: "Business Operations",
        note: "(for founders and executives)",
        items: [
          "Inbox and task triage",
          "Meeting scheduling and follow-ups",
          "CRM and pipeline organisation",
          "Light sales and revenue operations support",
          "Coordination between teams, suppliers, and stakeholders",
        ],
      },
      {
        heading: "System Ownership",
        items: [
          "Building structure around your week",
          "Ensuring nothing is missed or dropped",
          "Creating clarity across work and life",
          "Proactive identification of bottlenecks",
        ],
      },
    ],
  },
  how: {
    headline: "How It Works",
    steps: [
      {
        title: "Life and Work Audit",
        body: "We map everything currently on your plate, personal and professional.",
      },
      {
        title: "Setup (Week 1 to 2)",
        body: "We install your Life Office system: priorities, calendar structure, task flows, communication channels.",
      },
      {
        title: "Ongoing Operations Support",
        body: "We run the system day-to-day so you don’t have to. You send requests. We handle execution, coordination, and follow-through.",
      },
    ],
  },
  changes: {
    headline: "What Changes for Clients",
    intro: "Within weeks, clients typically experience:",
    items: [
      "Less mental clutter",
      "Fewer dropped tasks",
      "A calmer calendar",
      "Faster decision-making",
      "More time for deep work or family",
      "Reduced stress from everything relying on you",
    ],
  },
  who: {
    headline: "Who This Is For",
    intro: "The Life Office is for people who are:",
    items: [
      "Running companies or senior teams",
      "Balancing high-pressure work and family life",
      "Earning well but short on time",
      "Tired of being the default operator for everything",
    ],
    closing: "This is not for people looking for basic admin support.",
    closingItalic: "This is for people who need their life run properly.",
  },
  delivery: {
    headline: "Delivery Model",
    intro: "We keep this deliberately high-touch and focused.",
    columns: [
      {
        heading: "Each client gets:",
        items: [
          "One dedicated Operations Partner",
          "Shared secure communication channel",
          "Weekly priority review",
          "Daily request handling (within agreed boundaries)",
        ],
      },
      {
        heading: "Operating rhythm:",
        items: [
          "Requests come in throughout the day",
          "We triage, organise, and execute",
          "Weekly review ensures priorities stay aligned",
          "Proactive flagging of issues before they become problems",
        ],
      },
    ],
    backbone: "We are not reactive support. We are your operational backbone.",
  },
  pricing: {
    headline: "Pricing",
    intro: "Engagements are tailored based on complexity and scope.",
    figure: "Typical investment: £1,500 to £5,000 per month",
    closing:
      "Most clients sit in the mid-tier depending on how much of their life and business we support.",
  },
  closing: {
    headline: "Ready to Hand Over the Chaos?",
    body: "If you want more clarity, more time, and less mental load, book a short discovery call. We’ll review your current setup and see if The Life Office is the right fit.",
  },
};
