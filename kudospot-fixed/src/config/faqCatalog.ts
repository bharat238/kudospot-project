export type FAQItem = { q: string; a: string };

export const PRODUCT_FAQS: FAQItem[] = [
  {
    q: "How does the AI rewrite work?",
    a: "KudoSpot drafts clearer wording from the testimonial you collected. Review every change against the original and remove anything the customer did not say or cannot verify.",
  },
  {
    q: "Do customers approve the rewritten testimonial?",
    a: "Yes. Send an approval request by email or copy a secure approval link to share manually. A testimonial should stay out of public widgets until the customer has approved the wording.",
  },
  {
    q: "What is included in the Free plan?",
    a: "The Free plan includes up to 10 testimonials, 5 AI rewrites and 1 widget. You can start without entering payment details.",
  },
  {
    q: "Can I use my own brand?",
    a: "Collection forms support a logo and brand color. Widgets support their own accent color and corner style, so your public proof can better match your site.",
  },
  {
    q: "How do I add a widget to my website?",
    a: "Choose approved testimonials, create and publish a widget, then copy its HTML embed snippet. Paste it into a page or builder that allows iframe embeds.",
  },
  {
    q: "How do paid plans and renewals work?",
    a: "A successful paid checkout grants 30 days of access. Payments do not renew automatically; return to Upgrade and make another payment when you want to renew. Your account returns to Free when paid access expires.",
  },
];

export const BILLING_FAQS: FAQItem[] = [
  PRODUCT_FAQS[5],
  {
    q: "Which payment methods can I use?",
    a: "Payments are processed by Razorpay. The available payment methods are displayed during checkout and can vary by account or region.",
  },
  {
    q: "What if I need a refund or billing help?",
    a: "Email hello@kudospot.io with your billing question and payment receipt if available. Refunds are reviewed individually; no automatic refund guarantee is promised here.",
  },
  {
    q: "What happens when my paid plan expires?",
    a: "Your account returns to Free limits. Your existing records remain in your workspace, but creating new items may be limited by the Free plan.",
  },
];

export const HELP_FAQ_CATEGORIES: { title: string; faqs: FAQItem[] }[] = [
  {
    title: "Getting Started",
    faqs: [
      {
        q: "How do I collect testimonials?",
        a: "Create a collection form in Collect, then share its unique link with customers by email, messaging or another channel you use. When they submit, the testimonial appears in your workspace for review.",
      },
      PRODUCT_FAQS[2],
      PRODUCT_FAQS[3],
    ],
  },
  {
    title: "Features",
    faqs: [
      PRODUCT_FAQS[0],
      PRODUCT_FAQS[1],
      PRODUCT_FAQS[4],
      {
        q: "What is the difference between a widget and a case study?",
        a: "A widget shows selected approved testimonials on your website. A case study is a longer customer story that you can edit and publish as its own page.",
      },
      {
        q: "What does the social post generator do?",
        a: "Select a testimonial and generate social post copy or a share graphic. Review and edit the result before posting it to your social channels.",
      },
      {
        q: "Does KudoSpot collect video testimonials?",
        a: "Video collection is not currently available in KudoSpot's customer-facing collection form. We will update this page when it is ready.",
      },
    ],
  },
  {
    title: "Billing & Plans",
    faqs: BILLING_FAQS,
  },
];
