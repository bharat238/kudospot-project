import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowRight, Zap, TrendingUp, Heart } from "lucide-react";

const ForFreelancers = () => {
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
        <div className="container mx-auto py-16 md:py-24 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-6">
              Turn happy clients into your <span className="text-primary">best marketing engine</span>
            </h1>
            <p className="text-lg text-muted-foreground mb-8">
              Chasing clients for testimonials is exhausting. KudoSpot makes it dead simple: share a link, they fill it in, you get polished testimonials ready to showcase on your portfolio.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to="/signup">
                <Button size="lg" className="shadow-glow">
                  Start free <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
              <Link to="/pricing">
                <Button size="lg" variant="outline">
                  See plans
                </Button>
              </Link>
            </div>
          </div>
          <div className="hidden md:block">
            <Card className="p-6 shadow-elevated">
              <div className="text-sm text-muted-foreground mb-2">Sample testimonial</div>
              <p className="font-medium mb-4">
                "Working with Alex was incredible. They understood my vision immediately and delivered results that exceeded expectations. I've recommended them to all my friends."
              </p>
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-primary/20" />
                <div className="text-sm">
                  <div className="font-semibold">Sarah Chen</div>
                  <div className="text-xs text-muted-foreground">Startup Founder</div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* The freelancer problem */}
      <section className="container mx-auto py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">The freelancer testimonial problem</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">Sound familiar?</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {[
            {
              title: "You forget to ask",
              desc: "Project ends, you move to the next client. Testimonial requests get lost in the shuffle.",
            },
            {
              title: "Too pushy to follow up",
              desc: "Reaching out again feels like begging. Most requests get ignored or deprioritized.",
            },
            {
              title: "No time to design",
              desc: "Even when you get testimonials, creating graphics or case studies takes hours you don't have.",
            },
          ].map((item, i) => (
            <Card key={i} className="p-6">
              <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
              <p className="text-sm text-muted-foreground">{item.desc}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Solution */}
      <section className="bg-muted/30 py-20">
        <div className="container mx-auto">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">How KudoSpot solves it</h2>

            <div className="space-y-8">
              {[
                {
                  icon: Zap,
                  title: "1. Make it frictionless",
                  desc: "Create a collection form in KudoSpot. One link. That's it. Send it to clients when the project wraps — they fill it out in under a minute.",
                },
                {
                  icon: TrendingUp,
                  title: "2. AI polishes everything",
                  desc: "Got a vague review? 'Great work!' becomes 'Sarah saw a 40% increase in leads after our collaboration.' AI rewrites make testimonials sound incredible while keeping them authentic.",
                },
                {
                  icon: Heart,
                  title: "3. Showcase everywhere",
                  desc: "Generate beautiful testimonial cards for your portfolio. Create case study pages. Share snippets on LinkedIn. Everything is ready to go — just copy and paste.",
                },
              ].map((step, i) => {
                const Icon = step.icon;
                return (
                  <div key={i} className="flex gap-6">
                    <div className="flex-shrink-0">
                      <Icon className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg mb-2">{step.title}</h3>
                      <p className="text-muted-foreground">{step.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* What you get */}
      <section className="container mx-auto py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold">What you can do with KudoSpot</h2>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
          {[
            { title: "Portfolio website", desc: "Add a 'Testimonials' section with embedded testimonial cards that load automatically." },
            { title: "LinkedIn social posts", desc: "Generate 3 different LinkedIn post variations from each testimonial. Share weekly." },
            { title: "Email signature", desc: "Rotate featured testimonials in your email footer. Fresh social proof every message." },
            { title: "Case study pages", desc: "Turn detailed client work into polished case study landing pages. Link them in proposals." },
            { title: "Wall of Love", desc: "A beautiful public page showcasing all your client testimonials. Great for trust." },
            { title: "Export and repurpose", desc: "Export all testimonials as CSV. Use them in presentations, proposals, and pitch decks." },
          ].map((item, i) => (
            <Card key={i} className="p-6">
              <h3 className="font-semibold mb-2">{item.title}</h3>
              <p className="text-sm text-muted-foreground">{item.desc}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Pricing for freelancers */}
      <section className="bg-gradient-soft py-20">
        <div className="container mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold mb-6">Simple pricing for freelancers</h2>
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <Card className="p-8">
              <div className="text-2xl font-bold mb-2">Free</div>
              <div className="text-sm text-muted-foreground mb-6">Forever</div>
              <ul className="space-y-2 text-sm mb-6 text-left">
                <li>✓ 10 testimonials</li>
                <li>✓ 5 AI rewrites</li>
                <li>✓ 1 widget</li>
                <li>✓ Basic analytics</li>
              </ul>
              <Link to="/signup">
                <Button variant="outline" className="w-full">
                  Get started
                </Button>
              </Link>
            </Card>
            <Card className="p-8 border-primary bg-primary/5">
              <div className="text-xs text-primary font-semibold mb-2">RECOMMENDED</div>
              <div className="text-2xl font-bold mb-2">Starter</div>
              <div className="text-sm text-muted-foreground mb-6">$29/month</div>
              <ul className="space-y-2 text-sm mb-6 text-left">
                <li>✓ Unlimited testimonials</li>
                <li>✓ Unlimited AI rewrites</li>
                <li>✓ 5 widgets</li>
                <li>✓ 3 case studies</li>
                <li>✓ Social post generator</li>
              </ul>
              <Link to="/signup">
                <Button className="w-full">
                  Start free trial
                </Button>
              </Link>
            </Card>
          </div>
          <a href="/pricing" className="text-primary hover:underline text-sm">
            See all plans →
          </a>
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto py-20 text-center">
        <h2 className="text-3xl font-bold mb-6">Ready to turn clients into your marketing team?</h2>
        <p className="text-muted-foreground mb-8 max-w-lg mx-auto">Start free. No credit card. Get real testimonials in minutes, not weeks.</p>
        <Link to="/signup">
          <Button size="lg" className="shadow-glow">
            Get started <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </Link>
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

export default ForFreelancers;
