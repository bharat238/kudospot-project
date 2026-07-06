import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useAuth } from "@/contexts/AuthContext";
import { ChevronLeft } from "lucide-react";

const categories = [
  {
    title: "Getting Started",
    faqs: [
      {
        q: "How do I collect testimonials?",
        a: "Create a collection form in the Collect section. You'll get a unique shareable link that you can send to customers via email, SMS, or embed on your website. Customers fill in their testimonial, and you get notified.",
      },
      {
        q: "How does the AI rewrite feature work?",
        a: "Paste or type a raw testimonial, and our AI (powered by Groq and Claude) will polish it. The rewrite keeps the customer's original meaning and voice while improving clarity, flow, and persuasiveness.",
      },
      {
        q: "Can I customize the look of my forms and widgets?",
        a: "Yes. Each form and widget can be customized with your brand color and corner radius preference. Text, fields, and themes adjust to match your branding.",
      },
    ],
  },
  {
    title: "Features",
    faqs: [
      {
        q: "What's the difference between widgets and case studies?",
        a: "Widgets are embeddable testimonial cards you can put on your website, landing pages, or anywhere online. Case studies are longer-form, formatted pages that tell a complete customer success story.",
      },
      {
        q: "What can I do with the social post generator?",
        a: "For each testimonial, we generate 3 different social media posts tailored for LinkedIn, Twitter, and more. One-click copy and post to your social channels.",
      },
      {
        q: "How does the Wall of Love work?",
        a: "A Wall of Love is a beautiful public page showcasing your best testimonials and reviews. You get a unique URL to share, and it auto-updates as new testimonials are approved.",
      },
      {
        q: "How do customer approvals work?",
        a: "When a testimonial is submitted, the customer receives an email with a link to approve it before it goes live. They can edit, add a photo, or decline with a reason.",
      },
    ],
  },
  {
    title: "Billing & Plans",
    faqs: [
      {
        q: "How does billing work?",
        a: "We use Razorpay to handle payments. Subscriptions are charged monthly on the same day each month. You can cancel anytime from your Settings. Free tier requires no payment.",
      },
      {
        q: "What payment methods do you accept?",
        a: "Razorpay supports all major credit and debit cards, UPI, net banking, and more. We accept payments from India and internationally.",
      },
      {
        q: "What happens to my data if I downgrade my plan?",
        a: "All your testimonials, widgets, and case studies remain. You just can't create new ones beyond the free plan limits until you upgrade again.",
      },
      {
        q: "Do you offer refunds?",
        a: "Yes, we offer a 14-day money-back guarantee for Starter and Pro plans. If you're not satisfied, just reach out.",
      },
      {
        q: "Can I change plans anytime?",
        a: "Absolutely. Upgrade or downgrade from your Settings page anytime. Changes take effect immediately.",
      },
    ],
  },
];

const Help = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

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
            {user ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (window.history.length > 1) {
                    navigate(-1);
                  } else {
                    navigate("/dashboard");
                  }
                }}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost" size="sm">Log in</Button>
                </Link>
                <Link to="/signup">
                  <Button size="sm">Get started</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Header */}
      <section className="bg-gradient-soft">
        <div className="container mx-auto py-20 md:py-28 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Help & FAQ</h1>
          <p className="text-lg text-muted-foreground mb-8">Everything you need to know about KudoSpot</p>
          <a href="mailto:hello@kudospot.io" className="text-primary hover:underline">
            Can't find what you're looking for? Email us →
          </a>
        </div>
      </section>

      {/* FAQ sections */}
      <section className="container mx-auto py-20">
        <div className="max-w-2xl mx-auto space-y-16">
          {categories.map((category, i) => (
            <div key={i}>
              <h2 className="text-2xl font-bold mb-6">{category.title}</h2>
              <Accordion type="single" collapsible className="space-y-3">
                {category.faqs.map((faq, j) => (
                  <AccordionItem
                    key={j}
                    value={`faq-${i}-${j}`}
                    className="border border-border rounded-lg px-4"
                  >
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
          ))}
        </div>
      </section>

      {/* Contact CTA */}
      <section className="bg-muted/30 py-16">
        <div className="container mx-auto text-center">
          <h2 className="text-2xl font-bold mb-4">Still have questions?</h2>
          <p className="text-muted-foreground mb-6">Our team is here to help. Reach out anytime.</p>
          <a href="mailto:hello@kudospot.io">
            <Button>Contact us</Button>
          </a>
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

export default Help;
