export type PlanId = "free" | "starter" | "pro";

export type PlanDefinition = {
  id: PlanId;
  name: string;
  price: string;
  period: string;
  description: string;
  cta: string;
  highlight: boolean;
  features: string[];
};

/**
 * Keep prices and user-visible plan limits in one place.
 * Amounts match the current Razorpay order endpoint.
 * Video collection is intentionally not advertised until a working customer-facing
 * recording/upload flow exists end-to-end.
 */
export const PLAN_CATALOG: PlanDefinition[] = [
  {
    id: "free",
    name: "Free",
    price: "₹0",
    period: "forever",
    description: "Start collecting real customer stories.",
    cta: "Start free",
    highlight: false,
    features: [
      "10 testimonials",
      "5 AI rewrites",
      "1 testimonial widget",
      "Collection forms",
      "Customer approval workflow",
    ],
  },
  {
    id: "starter",
    name: "Starter",
    price: "₹499",
    period: "/month",
    description: "For freelancers and growing teams.",
    cta: "Choose Starter",
    highlight: true,
    features: [
      "Unlimited testimonials",
      "Unlimited AI rewrites",
      "Up to 5 widgets",
      "Up to 3 case studies",
      "Social post generator",
      "Collection forms and approval workflow",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: "₹1,299",
    period: "/month",
    description: "More room for a growing social-proof library.",
    cta: "Choose Pro",
    highlight: false,
    features: [
      "Everything in Starter",
      "Unlimited widgets",
      "Unlimited case studies",
    ],
  },
];
