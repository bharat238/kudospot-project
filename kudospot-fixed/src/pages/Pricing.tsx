import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check, ArrowRight } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { PLAN_LIMITS } from "@/hooks/usePlanLimits";
import { useAuth } from "@/contexts/AuthContext";

const plans = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    period: "/month",
    description: "Perfect for getting started",
    cta: "Get started",
    features: [
      "10 testimonials",
      "5 AI rewrites",
      "1 widget",
      "Email approval flow",
      "Basic analytics",
    ],
  },
  {
    id: "starter",
    name: "Starter",
    price: "$29",
    period: "/month",
    description: "For small teams and freelancers",
    cta: "Start free trial",
    features: [
      "Unlimited testimonials",
      "Unlimited AI rewrites",
      "5 widgets",
      "3 case studies",
      "20 video testimonials",
      "Social post generator",
      "Advanced analytics",
      "Priority support",
    ],
    recommended: true,
  },
  {
    id: "pro",
    name: "Pro",
    price: "Custom",
    period: "",
    description: "For enterprise teams",
    cta: "Contact sales",
    features: [
      "Everything in Starter",
      "Unlimited widgets",
      "Unlimited case studies",
      "Unlimited video testimonials",
      "Custom branding",
      "Team collaboration",
      "API access",
      "Dedicated support",
    ],
  },
];

const faqs = [
  {
    q: "Can I change plans later?",
    a: "Yes, you can upgrade or downgrade your plan at any time from your Settings page. Changes take effect immediately.",
  },
  {
    q: "Do you offer refunds?",
    a: "We offer a 14-day money-back guarantee for Starter and Pro plans if you're not satisfied. No questions asked.",
  },
  {
    q: "What payment methods do you accept?",
    a: "We accept all major credit and debit cards, UPI, and net banking through Razorpay. We support customers in India and internationally.",
  },
  {
    q: "What happens if I exceed my plan limits?",
    a: "If you're on a free plan, you'll see an upgrade prompt. Paid plans have unlimited most features, so you won't hit limits. Contact us for custom needs.",
  },
];

const Pricing = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="border-b border-border/60 bg-background/80 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-bold text-lg">
            <img src="/kudospot-icon.svg" alt="KudoSpot" className="h-8 w-8" />
            KudoSpot
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost" size="sm">Log in</Button>
            </Link>
            <Link to="/signup">
              <Button size="sm">Get started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Pricing section */}
      <section className="container mx-auto py-20">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Simple, transparent pricing</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">Start free. Scale as you grow. All plans include a 14-day trial.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className={`p-8 flex flex-col relative ${
                plan.recommended ? "border-primary shadow-lg md:scale-105" : ""
              }`}
            >
              {plan.recommended && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary text-primary-foreground text-xs font-semibold rounded-full">
                  Recommended
                </div>
              )}
              <div className="mb-6">
                <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                <p className="text-sm text-muted-foreground">{plan.description}</p>
              </div>

              <div className="mb-6">
                <div className="text-3xl font-bold">
                  {plan.price}
                  <span className="text-base text-muted-foreground font-normal">{plan.period}</span>
                </div>
              </div>

              <Link
                to={
                  plan.id === "pro"
                    ? "mailto:hello@kudospot.io?subject=KudoSpot%20Pro%20Plan"
                    : user
                    ? "/upgrade"
                    : "/signup"
                }
                className="mb-6"
              >
                <Button className="w-full" variant={plan.recommended ? "default" : "outline"}>
                  {plan.cta} <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>

              <div className="space-y-3 flex-1">
                {plan.features.map((feature, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-success mt-0.5 shrink-0" />
                    <span className="text-sm">{feature}</span>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* FAQ section */}
      <section className="bg-muted/30 py-20">
        <div className="container mx-auto max-w-2xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-2">Frequently asked questions</h2>
            <p className="text-muted-foreground">Have a question? We've got answers.</p>
          </div>

          <Accordion type="single" collapsible className="space-y-3">
            {faqs.map((faq, i) => (
              <AccordionItem key={i} value={`faq-${i}`} className="border border-border rounded-lg px-4">
                <AccordionTrigger className="text-left font-medium hover:text-primary">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* CTA section */}
      <section className="bg-gradient-soft py-16">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to start collecting real social proof?</h2>
          <p className="text-muted-foreground mb-8 max-w-lg mx-auto">Join 1000+ founders using KudoSpot to turn customers into champions.</p>
          <Link to="/signup">
            <Button size="lg" className="shadow-glow">
              Get started free <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/60 py-10 text-sm text-muted-foreground">
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 font-medium text-foreground">
            <img src="/kudospot-icon.svg" alt="KudoSpot" className="h-5 w-5" />
            KudoSpot
          </div>
          <p className="text-xs">© {new Date().getFullYear()} KudoSpot. Built for founders who want proof that works.</p>
          <div className="flex items-center gap-6 text-xs">
            <Link to="/privacy" className="hover:text-foreground transition">
              Privacy Policy
            </Link>
            <Link to="/terms" className="hover:text-foreground transition">
              Terms of Service
            </Link>
            <a href="mailto:hello@kudospot.io" className="hover:text-foreground transition">
              Contact
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Pricing;
