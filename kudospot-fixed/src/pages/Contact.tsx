import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowRight, Mail, MessageSquare, Zap } from "lucide-react";

const Contact = () => {
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

      {/* Hero */}
      <section className="bg-gradient-soft">
        <div className="container mx-auto py-20 md:py-28 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">Get in touch</h1>
          <p className="text-lg text-muted-foreground mb-2 max-w-2xl mx-auto">
            Have questions? We'd love to hear from you. Reach out anytime.
          </p>
        </div>
      </section>

      {/* Contact options */}
      <section className="container mx-auto py-20">
        <div className="max-w-3xl mx-auto">
          <p className="text-muted-foreground mb-10 text-center">
            We're here to help. Let us know what's on your mind — we typically reply within 24 hours.
          </p>

          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {[
              {
                icon: Mail,
                title: "Email",
                desc: "hello@kudospot.io",
                action: "Email us",
                href: "mailto:hello@kudospot.io",
              },
              {
                icon: MessageSquare,
                title: "Support",
                desc: "Chat with our team",
                action: "Start conversation",
                href: "mailto:hello@kudospot.io?subject=Support%20Request",
              },
              {
                icon: Zap,
                title: "Feedback",
                desc: "Suggest features",
                action: "Share ideas",
                href: "mailto:hello@kudospot.io?subject=Feature%20Request",
              },
            ].map((option, i) => {
              const Icon = option.icon;
              return (
                <Card key={i} className="p-6 text-center">
                  <Icon className="h-8 w-8 text-primary mx-auto mb-4" />
                  <h3 className="font-semibold mb-1">{option.title}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{option.desc}</p>
                  <a href={option.href}>
                    <Button variant="outline" size="sm" className="w-full">
                      {option.action}
                    </Button>
                  </a>
                </Card>
              );
            })}
          </div>

          <div className="bg-muted/30 rounded-lg p-8">
            <h2 className="font-semibold text-lg mb-4">Common reasons to reach out:</h2>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• <strong>Billing questions</strong> — Need help with your subscription or payment?</li>
              <li>• <strong>Feature requests</strong> — Have an idea for KudoSpot?</li>
              <li>• <strong>Bug reports</strong> — Found something broken? Let us know.</li>
              <li>• <strong>Partnerships</strong> — Interested in working together?</li>
              <li>• <strong>Sales inquiries</strong> — Looking for custom plans or enterprise features?</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/60 py-10 text-sm text-muted-foreground mt-20">
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

export default Contact;
