import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check, Megaphone, BarChart3, MessageSquareQuote, ArrowRight, Star } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import KudoSpotIcon from "@/components/KudoSpotIcon";

const Landing = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="border-b border-border/60 bg-background/80 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-bold text-lg">
            <img src="/kudospot-icon.svg" alt="KudoSpot" className="h-8 w-8" />
            KudoSpot
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition">Features</a>
            <a href="#pricing" className="hover:text-foreground transition">Pricing</a>
            <a href="#faq" className="hover:text-foreground transition">FAQ</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/login"><Button variant="ghost" size="sm">Log in</Button></Link>
            <Link to="/signup"><Button size="sm">Get started</Button></Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-soft">
        <div className="container mx-auto pt-10 pb-24 md:pt-14 md:pb-32 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-light text-primary text-xs font-medium mb-6">
              <img src="/kudospot-icon.svg" alt="" className="h-3 w-3" /> AI-powered social proof
            </div>
            <h1 className="text-5xl md:text-6xl font-bold leading-[1.05] mb-6">
              Turn happy customers into your <span className="text-primary">best salespeople</span> — automatically.
            </h1>
            <p className="text-lg text-muted-foreground mb-8 max-w-lg leading-relaxed">
              KudoSpot collects testimonials, rewrites them with AI, and turns them into widgets, social posts, and case studies. In one click.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to="/signup">
                <Button size="lg" className="h-12 px-6 shadow-glow">
                  Start free — no card needed <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
              <a href="#features"><Button size="lg" variant="outline" className="h-12 px-6">See how it works</Button></a>
            </div>
            <div className="flex items-center gap-2 mt-6 text-sm text-muted-foreground">
              <div className="flex">{[...Array(5)].map((_, i) => <Star key={i} className="h-4 w-4 fill-warning text-warning" />)}</div>
              Free forever — no card required
            </div>
          </div>
          <div className="relative">
            <Card className="p-6 shadow-elevated rotate-1">
              <div className="flex items-start gap-3 mb-4">
                <div className="h-10 w-10 rounded-full bg-primary-light flex items-center justify-center text-primary font-semibold">SK</div>
                <div>
                  <div className="font-semibold">Sara K.</div>
                  <div className="text-xs text-muted-foreground">Founder, Loop Studio</div>
                </div>
                <div className="ml-auto text-xs px-2 py-1 rounded-full bg-success/10 text-success font-medium">AI Rewritten</div>
              </div>
              <p className="text-sm leading-relaxed mb-4">
                "Before KudoSpot, I had a folder of vague reviews. Now I run a full social proof engine — 3 case studies and 18 LinkedIn posts in my first month. <span className="bg-primary-light px-1 rounded">Conversion on my landing page is up 34%.</span>"
              </p>
              <div className="flex">{[...Array(5)].map((_, i) => <Star key={i} className="h-3.5 w-3.5 fill-warning text-warning" />)}</div>
            </Card>
            <Card className="p-4 shadow-card absolute -bottom-6 -left-6 w-56 rotate-[-3deg] bg-card hidden md:block">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                <KudoSpotIcon className="h-3.5 w-3.5" /> AI processing…
              </div>
              <div className="space-y-1.5">
                <div className="h-2 bg-muted rounded w-full" />
                <div className="h-2 bg-muted rounded w-4/5" />
                <div className="h-2 bg-primary-light rounded w-3/5" />
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Problem */}
      <section className="container mx-auto py-24">
        <div className="text-center mb-14">
          <h2 className="text-4xl font-bold mb-4">Why testimonials usually fail</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">Three problems every founder runs into — solved.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { t: "You forget to ask", d: "Customers are happiest right after a win. By the time you remember to email them, the moment is gone." },
            { t: "Reviews are vague", d: '"Great service!" doesn\'t convert. You need specific stories with real outcomes — not platitudes.' },
            { t: "No time to design", d: "Even good testimonials sit in your inbox. You don't have time to make graphics or write case studies." },
          ].map((p) => (
            <Card key={p.t} className="p-6">
              <div className="h-10 w-10 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center mb-4 font-bold">!</div>
              <h3 className="font-semibold text-lg mb-2">{p.t}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{p.d}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="bg-secondary/40 py-24">
        <div className="container mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-4xl font-bold mb-4">From one customer to a content machine</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">Five steps. Fully automated.</p>
          </div>
          <div className="grid md:grid-cols-5 gap-4">
            {[
              { i: MessageSquareQuote, t: "Collect", d: "Branded forms" },
              { i: KudoSpotIcon, t: "AI Rewrite", d: "Vague → vivid" },
              { i: Check, t: "Approve", d: "Customer 1-click" },
              { i: Megaphone, t: "Display", d: "Embed widgets" },
              { i: BarChart3, t: "Track", d: "See ROI" },
            ].map((f, idx) => (
              <Card key={f.t} className="p-5 text-center relative">
                <div className="h-11 w-11 rounded-lg bg-gradient-primary text-primary-foreground flex items-center justify-center mx-auto mb-3 shadow-glow">
                  <f.i className="h-5 w-5" />
                </div>
                <div className="text-xs font-semibold text-primary mb-1">STEP {idx + 1}</div>
                <h3 className="font-semibold mb-1">{f.t}</h3>
                <p className="text-xs text-muted-foreground">{f.d}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="container mx-auto py-24">
        <div className="text-center mb-14">
          <h2 className="text-4xl font-bold mb-4">Simple, founder-friendly pricing</h2>
          <p className="text-muted-foreground">Start free. Upgrade when you're ready.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {[
            { name: "Free", price: "₹0", period: "forever", features: ["10 testimonials", "5 AI rewrites", "1 widget", "2 video uploads"], cta: "Start free", highlight: false },
            { name: "Starter", price: "₹499", period: "/month", features: ["Unlimited testimonials", "Unlimited AI rewrites", "5 widgets", "20 videos", "3 case studies"], cta: "Get Starter", highlight: true },
            { name: "Pro", price: "₹1,299", period: "/month", features: ["Everything in Starter", "Unlimited widgets", "Unlimited videos", "Unlimited case studies", "Priority AI"], cta: "Get Pro", highlight: false },
          ].map((p) => (
            <Card key={p.name} className={`p-7 relative ${p.highlight ? "border-primary border-2 shadow-elevated" : ""}`}>
              {p.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gradient-primary text-primary-foreground text-xs font-semibold">
                  Most popular
                </div>
              )}
              <h3 className="font-semibold text-lg mb-1">{p.name}</h3>
              <div className="flex items-baseline gap-1 mb-5">
                <span className="text-4xl font-bold">{p.price}</span>
                <span className="text-sm text-muted-foreground">{p.period}</span>
              </div>
              <Link to="/signup">
                <Button variant={p.highlight ? "default" : "outline"} className="w-full mb-6">{p.cta}</Button>
              </Link>
              <ul className="space-y-2.5">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-success shrink-0 mt-0.5" /> {f}
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="container mx-auto py-24 max-w-3xl">
        <h2 className="text-4xl font-bold mb-10 text-center">Questions</h2>
        <Accordion type="single" collapsible className="w-full">
          {[
            { q: "How does the AI rewrite work?", a: "Paste a vague testimonial; KudoSpot restructures it into a Pain → Solution → Result story in your customer's voice — without inventing facts." },
            { q: "Do customers approve the rewrite?", a: "Yes. Every rewrite is sent to the customer with a 1-click approve / edit flow before it's published." },
            { q: "Is there a free plan?", a: "Yes — 10 testimonials and 5 AI rewrites per month, forever. No card needed." },
            { q: "Can I use my own brand?", a: "Yes. Upload your logo and pick brand colors — all forms, widgets, and posts inherit your brand." },
            { q: "Where do widgets work?", a: "Anywhere you can paste an HTML snippet — Webflow, WordPress, Shopify, Framer, custom sites." },
            { q: "Can I cancel anytime?", a: "Of course. One click in settings. No questions asked." },
          ].map((f, i) => (
            <AccordionItem key={i} value={`q${i}`}>
              <AccordionTrigger className="text-left">{f.q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* CTA */}
      <section className="container mx-auto pb-24">
        <Card className="p-12 md:p-16 text-center bg-gradient-primary text-primary-foreground shadow-glow border-0">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">Ready in 60 seconds.</h2>
          <p className="text-primary-foreground/85 mb-8 max-w-lg mx-auto">Sign up free and rewrite your first testimonial in minutes.</p>
          <Link to="/signup"><Button size="lg" variant="secondary" className="h-12 px-8">Start free — no card needed</Button></Link>
        </Card>
      </section>

      <footer className="border-t border-border/60 py-10 text-sm text-muted-foreground">
        <div className="container mx-auto grid md:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="flex items-center gap-2 font-medium text-foreground mb-4">
              <img src="/kudospot-icon.svg" alt="KudoSpot" className="h-5 w-5" />
              KudoSpot
            </div>
            <p className="text-xs">Built for founders who want proof that works.</p>
          </div>
          <div>
            <div className="font-medium text-foreground mb-3">Product</div>
            <div className="space-y-2 text-xs">
              <Link to="/pricing" className="hover:text-foreground transition block">Pricing</Link>
              <Link to="/changelog" className="hover:text-foreground transition block">Changelog</Link>
              <a href="mailto:hello@kudospot.io" className="hover:text-foreground transition block">Feature request</a>
            </div>
          </div>
          <div>
            <div className="font-medium text-foreground mb-3">Company</div>
            <div className="space-y-2 text-xs">
              <Link to="/contact" className="hover:text-foreground transition block">Contact</Link>
              <Link to="/affiliates" className="hover:text-foreground transition block">Affiliates</Link>
              <a href="mailto:hello@kudospot.io" className="hover:text-foreground transition block">Email us</a>
            </div>
          </div>
          <div>
            <div className="font-medium text-foreground mb-3">Resources</div>
            <div className="space-y-2 text-xs">
              <Link to="/help" className="hover:text-foreground transition block">Help & FAQ</Link>
              <Link to="/privacy" className="hover:text-foreground transition block">Privacy Policy</Link>
              <Link to="/terms" className="hover:text-foreground transition block">Terms of Service</Link>
            </div>
          </div>
        </div>
        <div className="border-t border-border/60 pt-6 flex flex-col md:flex-row items-center justify-between">
          <p className="text-xs">© {new Date().getFullYear()} KudoSpot. All rights reserved.</p>
          <div className="flex items-center gap-4 text-xs mt-4 md:mt-0">
            <Link to="/compare/senja" className="hover:text-foreground transition">KudoSpot vs Senja</Link>
            <Link to="/for/freelancers" className="hover:text-foreground transition">For Freelancers</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
