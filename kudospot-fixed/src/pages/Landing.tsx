import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check, Megaphone, BarChart3, MessageSquareQuote, ArrowRight, Star, Menu, LayoutDashboard, MessageSquare, PanelsTopLeft, FileText, Share2, Settings, TrendingUp, Send, Sparkles } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import KudoSpotIcon from "@/components/KudoSpotIcon";

const Landing = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dashboardNav = [
    { icon: LayoutDashboard, label: "Dashboard", active: true },
    { icon: MessageSquare, label: "Testimonials" },
    { icon: Send, label: "Collection" },
    { icon: PanelsTopLeft, label: "Widgets" },
    { icon: FileText, label: "Case studies" },
    { icon: Share2, label: "Social posts" },
    { icon: BarChart3, label: "Analytics" },
    { icon: Settings, label: "Settings" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border/70 bg-background/85 backdrop-blur-xl">
        <div className="container mx-auto flex h-[68px] items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 font-semibold tracking-tight text-foreground">
            <img src="/kudospot-icon.svg" alt="KudoSpot" className="h-8 w-8" />
            <span className="text-xl">KudoSpot</span>
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#features" className="transition hover:text-foreground">Product</a>
            <a href="#how-it-works" className="transition hover:text-foreground">How it works</a>
            <a href="#pricing" className="transition hover:text-foreground">Pricing</a>
            <a href="#faq" className="transition hover:text-foreground">Resources</a>
          </nav>
          <div className="hidden md:flex items-center gap-3">
            <Link to="/login"><Button variant="ghost" size="sm">Log in</Button></Link>
            <Link to="/signup"><Button size="sm" className="rounded-full px-5">Get started free <ArrowRight className="ml-2 h-4 w-4" /></Button></Link>
          </div>
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" className="md:hidden" aria-label="Open navigation"><Menu className="h-5 w-5" /></Button>
            </SheetTrigger>
            <SheetContent>
              <nav className="flex flex-col gap-6 pt-10">
                <a href="#features" className="text-lg font-medium" onClick={() => setMobileMenuOpen(false)}>Product</a>
                <a href="#how-it-works" className="text-lg font-medium" onClick={() => setMobileMenuOpen(false)}>How it works</a>
                <a href="#pricing" className="text-lg font-medium" onClick={() => setMobileMenuOpen(false)}>Pricing</a>
                <a href="#faq" className="text-lg font-medium" onClick={() => setMobileMenuOpen(false)}>Resources</a>
                <div className="mt-4 flex flex-col gap-3">
                  <Link to="/login" onClick={() => setMobileMenuOpen(false)}><Button variant="outline" className="w-full">Log in</Button></Link>
                  <Link to="/signup" onClick={() => setMobileMenuOpen(false)}><Button className="w-full">Get started free</Button></Link>
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      <main>
        <section className="relative isolate overflow-hidden border-b border-border/60 bg-gradient-soft">
          <div className="pointer-events-none absolute inset-0 -z-10 opacity-80" style={{ background: "radial-gradient(ellipse at 75% 38%, rgba(183, 170, 255, .23), transparent 34%), radial-gradient(ellipse at 55% 70%, rgba(117, 211, 255, .18), transparent 34%)" }} />
          <div className="container mx-auto grid items-center gap-12 py-14 md:grid-cols-[0.92fr_1.08fr] md:py-20 lg:gap-16 lg:py-24">
            <div className="relative z-10">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-white/70 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-foreground shadow-sm">
                <Sparkles className="h-3.5 w-3.5 text-blue-600" /> AI-powered testimonial platform
              </div>
              <h1 className="mb-6 max-w-2xl text-4xl font-semibold leading-[1.04] tracking-[-0.055em] text-foreground sm:text-5xl lg:text-[58px]">
                Turn customer feedback into your <span className="bg-gradient-primary bg-clip-text text-transparent">growth engine.</span>
              </h1>
              <p className="mb-8 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
                Collect, manage, and showcase genuine customer testimonials that build trust, grow your audience, and help drive more sales — all in one simple platform.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link to="/signup"><Button size="lg" className="h-12 rounded-full px-6 shadow-md">Get started free <ArrowRight className="ml-2 h-4 w-4" /></Button></Link>
                <a href="#how-it-works"><Button size="lg" variant="outline" className="h-12 rounded-full border-border bg-white/70 px-6">See how it works</Button></a>
              </div>
              <div className="mt-7 flex flex-wrap gap-x-5 gap-y-3 text-xs text-muted-foreground sm:text-sm">
                {["No credit card required", "Set up in minutes", "Made for growing teams"].map((item) => (
                  <span key={item} className="inline-flex items-center gap-2"><Check className="h-4 w-4 rounded-full text-muted-foreground" />{item}</span>
                ))}
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-[700px]">
              <div className="pointer-events-none absolute -inset-8 -z-10 rounded-[36px] bg-gradient-to-br from-blue-100/70 via-violet-100/50 to-transparent blur-2xl" />
              <div className="overflow-hidden rounded-2xl border border-white/80 bg-white/95 shadow-[0_24px_80px_rgba(15,23,42,0.12)] ring-1 ring-black/[0.03]">
                <div className="flex min-h-[390px]">
                  <aside className="hidden w-[150px] shrink-0 border-r border-border/70 bg-white/80 p-3 sm:block">
                    <div className="mb-5 flex items-center gap-2 px-1 pt-1">
                      <img src="/kudospot-icon.svg" alt="" className="h-5 w-5" />
                      <span className="text-xs font-semibold tracking-tight">KudoSpot</span>
                    </div>
                    <div className="space-y-1">
                      {dashboardNav.map((item) => (
                        <div key={item.label} className={`flex items-center gap-2 rounded-md px-2 py-2 text-[10px] ${item.active ? "bg-blue-50 font-semibold text-blue-700" : "text-muted-foreground"}`}>
                          <item.icon className="h-3.5 w-3.5" />{item.label}
                        </div>
                      ))}
                    </div>
                  </aside>
                  <div className="min-w-0 flex-1 p-4 sm:p-5">
                    <div className="mb-5 flex items-center justify-between gap-3">
                      <div><div className="text-lg font-semibold tracking-tight">Dashboard</div><div className="mt-1 text-[10px] text-muted-foreground">Here's what's happening with your testimonials.</div></div>
                      <div className="rounded-lg border border-border px-2.5 py-2 text-[10px] text-muted-foreground">Last 30 days⌄</div>
                    </div>
                    <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {[
                        { label: "Testimonials", value: "124", change: "+12%" },
                        { label: "Collection forms", value: "8", change: "+2%" },
                        { label: "Page views", value: "4.2K", change: "+24%" },
                        { label: "Approval rate", value: "68%", change: "+8%" },
                      ].map((stat) => (
                        <div key={stat.label} className="rounded-xl border border-border/80 bg-white p-3">
                          <div className="text-[9px] leading-4 text-muted-foreground">{stat.label}</div>
                          <div className="mt-1 text-xl font-semibold tracking-tight">{stat.value}</div>
                          <div className="mt-1 flex items-center gap-1 text-[9px] font-medium text-emerald-600"><TrendingUp className="h-3 w-3" />{stat.change}</div>
                        </div>
                      ))}
                    </div>
                    <div className="rounded-xl border border-border/80 bg-white">
                      <div className="flex items-center justify-between border-b border-border/70 px-3.5 py-3"><span className="text-xs font-semibold">Recent testimonials</span><span className="text-[10px] font-medium text-blue-600">View all</span></div>
                      {[
                        { initials: "SJ", name: "Sarah Johnson", role: "Product designer", time: "2h ago", quote: "KudoSpot made it much easier to collect and share customer feedback.", color: "bg-rose-100 text-rose-700" },
                        { initials: "MC", name: "Mike Chen", role: "Founder at GrowthLab", time: "5h ago", quote: "A simple way to turn real customer wins into stories we can use.", color: "bg-sky-100 text-sky-700" },
                      ].map((t) => (
                        <div key={t.name} className="flex gap-2.5 border-b border-border/50 px-3.5 py-3 last:border-0">
                          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${t.color}`}>{t.initials}</div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1"><span className="text-[10px] font-semibold">{t.name}</span><span className="text-[9px] text-muted-foreground">{t.time}</span><span className="ml-auto rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-medium text-emerald-700">Approved</span></div>
                            <div className="text-[9px] text-muted-foreground">{t.role}</div>
                            <p className="mt-1 text-[10px] leading-4 text-foreground/80">“{t.quote}”</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="absolute -right-3 top-12 hidden items-center gap-3 rounded-xl border border-white bg-white/95 p-3.5 shadow-lg sm:flex lg:-right-7">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600"><Send className="h-4 w-4" /></span>
                <span><span className="block text-xs font-semibold">Collect feedback</span><span className="mt-1 block text-[10px] text-muted-foreground">Share a link with customers</span></span>
              </div>
              <div className="absolute -bottom-5 -left-3 hidden items-center gap-3 rounded-xl border border-white bg-white/95 p-3.5 shadow-lg sm:flex lg:-left-7">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50 text-violet-600"><Sparkles className="h-4 w-4" /></span>
                <span><span className="block text-xs font-semibold">Showcase everywhere</span><span className="mt-1 block text-[10px] text-muted-foreground">Embed on your site or share</span></span>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-border/70 bg-white py-8">
          <div className="container mx-auto">
            <p className="mb-5 text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Built for teams that care about customer trust</p>
            <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 text-sm font-semibold tracking-tight text-foreground/70 sm:gap-x-16">
              {["Founders", "SaaS teams", "Agencies", "Freelancers", "Creators"].map((label) => <span key={label}>{label}</span>)}
            </div>
          </div>
        </section>

        <section id="how-it-works" className="container mx-auto grid items-center gap-12 py-20 md:grid-cols-2 md:py-24">
          <div>
            <div className="mb-4 inline-flex rounded-full bg-blue-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-blue-700">Collect</div>
            <h2 className="mb-5 max-w-lg text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">Get testimonials without the awkward ask.</h2>
            <p className="mb-7 max-w-lg leading-7 text-muted-foreground">Share a simple, branded form with customers. Use guided prompts to gather specific feedback, then organize and reuse the stories across your website and marketing.</p>
            <Link to="/signup"><Button className="rounded-full px-5">Create a collection form <ArrowRight className="ml-2 h-4 w-4" /></Button></Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="p-5 shadow-md">
              <div className="mb-4 flex items-center gap-2"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600"><MessageSquareQuote className="h-4 w-4" /></span><span className="text-sm font-semibold">Share your experience</span></div>
              <p className="mb-3 text-xs text-muted-foreground">What do you like most about the product?</p>
              <div className="mb-4 h-10 rounded-lg border border-border bg-muted/30 px-3 py-3 text-[10px] text-muted-foreground">Your answer...</div>
              <p className="mb-2 text-xs text-muted-foreground">Would you recommend us?</p>
              <div className="mb-4 grid grid-cols-5 gap-1.5">{[1,2,3,4,5].map((n) => <div key={n} className={`rounded-md py-2 text-center text-[10px] ${n === 5 ? "bg-foreground text-background" : "bg-muted"}`}>{n}</div>)}</div>
              <div className="rounded-full bg-foreground py-2.5 text-center text-[10px] font-medium text-background">Submit testimonial</div>
            </Card>
            <Card className="flex flex-col justify-center p-5 shadow-md">
              <div className="mb-4 flex items-center justify-between"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-100 text-xs font-semibold text-rose-700">ED</div><div><div className="text-xs font-semibold">Emily Davis</div><div className="mt-1 text-[10px] text-muted-foreground">Marketing lead</div></div></div><span className="text-blue-600"><Share2 className="h-4 w-4" /></span></div>
              <p className="text-sm leading-6">“KudoSpot makes it easier to collect feedback and turn customer stories into useful social proof.”</p>
              <div className="mt-4 flex gap-1 text-amber-500">{[1,2,3,4,5].map((n) => <Star key={n} className="h-4 w-4 fill-current" />)}</div>
              <div className="mt-4 border-t border-border pt-3 text-[10px] text-muted-foreground">Example testimonial preview</div>
            </Card>
          </div>
        </section>

        <section id="features" className="border-y border-border/70 bg-secondary/40 py-20 md:py-24">
          <div className="container mx-auto">
            <div className="mx-auto mb-12 max-w-2xl text-center">
              <div className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-blue-700">One simple workflow</div>
              <h2 className="mb-4 text-3xl font-semibold tracking-tight sm:text-4xl">From customer feedback to social proof.</h2>
              <p className="text-muted-foreground">Collect stories once, then put them to work across your website and marketing.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {[
                { icon: MessageSquareQuote, title: "Collect", desc: "Branded forms and guided prompts" },
                { icon: KudoSpotIcon, title: "Improve", desc: "AI helps clarify customer stories" },
                { icon: Check, title: "Approve", desc: "Keep customer approval in the loop" },
                { icon: Megaphone, title: "Showcase", desc: "Display testimonials with widgets" },
                { icon: BarChart3, title: "Understand", desc: "Track engagement and performance" },
              ].map((feature, index) => (
                <Card key={feature.title} className="border-border/80 bg-white p-5 transition duration-200 hover:-translate-y-1 hover:shadow-lg">
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><feature.icon className="h-5 w-5" /></div>
                  <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Step {index + 1}</div>
                  <h3 className="mb-2 font-semibold">{feature.title}</h3>
                  <p className="text-sm leading-5 text-muted-foreground">{feature.desc}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section id="pricing" className="container mx-auto py-20 md:py-24">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-semibold tracking-tight sm:text-4xl">Simple, founder-friendly pricing.</h2>
            <p className="text-muted-foreground">Start free. Upgrade when you're ready.</p>
          </div>
          <div className="mx-auto grid max-w-5xl gap-5 md:grid-cols-3">
            {[
              { name: "Free", price: "₹0", period: "forever", features: ["10 testimonials", "5 AI rewrites", "1 widget", "2 video uploads"], cta: "Start free", highlight: false },
              { name: "Starter", price: "₹499", period: "/month", features: ["Unlimited testimonials", "Unlimited AI rewrites", "5 widgets", "20 videos", "3 case studies"], cta: "Get Starter", highlight: true },
              { name: "Pro", price: "₹1,299", period: "/month", features: ["Everything in Starter", "Unlimited widgets", "Unlimited videos", "Unlimited case studies", "Priority AI"], cta: "Get Pro", highlight: false },
            ].map((plan) => (
              <Card key={plan.name} className={`relative p-7 ${plan.highlight ? "border-foreground shadow-lg ring-1 ring-foreground" : "border-border/80"}`}>
                {plan.highlight && <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-foreground px-3 py-1 text-[10px] font-semibold text-background">Popular plan</div>}
                <h3 className="mb-1 font-semibold">{plan.name}</h3>
                <div className="mb-5 flex items-baseline gap-1"><span className="text-4xl font-semibold tracking-tight">{plan.price}</span><span className="text-sm text-muted-foreground">{plan.period}</span></div>
                <Link to="/signup"><Button variant={plan.highlight ? "default" : "outline"} className="mb-6 w-full rounded-full">{plan.cta}</Button></Link>
                <ul className="space-y-3">{plan.features.map((feature) => <li key={feature} className="flex items-start gap-2 text-sm"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />{feature}</li>)}</ul>
              </Card>
            ))}
          </div>
        </section>

        <section id="faq" className="container mx-auto max-w-3xl py-16 md:py-20">
          <div className="mb-10 text-center"><h2 className="mb-3 text-3xl font-semibold tracking-tight sm:text-4xl">Questions, answered.</h2><p className="text-muted-foreground">The essentials before you get started.</p></div>
          <Accordion type="single" collapsible className="w-full">
            {[
              { q: "How does the AI rewrite work?", a: "KudoSpot helps structure a testimonial into a clearer story while keeping the customer's meaning. Review all AI-assisted edits and never publish invented claims as customer facts." },
              { q: "Do customers approve the rewrite?", a: "KudoSpot supports a customer approval flow so the testimonial can be reviewed before publication." },
              { q: "Is there a free plan?", a: "Yes. The free plan includes 10 testimonials and 5 AI rewrites. No credit card is required to start." },
              { q: "Can I use my own brand?", a: "You can customize your collection experience and testimonial displays to better match your brand." },
              { q: "Where do widgets work?", a: "Widgets are designed for websites that allow you to add an HTML embed snippet, including many site builders and custom sites." },
              { q: "Can I cancel anytime?", a: "You can manage your plan from your account settings. Review the current plan terms before upgrading." },
            ].map((item, index) => <AccordionItem key={item.q} value={`q${index}`}><AccordionTrigger className="text-left">{item.q}</AccordionTrigger><AccordionContent className="leading-6 text-muted-foreground">{item.a}</AccordionContent></AccordionItem>)}
          </Accordion>
        </section>

        <section className="container mx-auto pb-20 md:pb-24">
          <div className="overflow-hidden rounded-3xl border border-border bg-gradient-soft px-6 py-12 text-center sm:px-12 md:py-16">
            <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-blue-700 shadow-sm"><KudoSpotIcon className="h-5 w-5" /></div>
            <h2 className="mb-4 text-3xl font-semibold tracking-tight sm:text-5xl">Make customer love visible.</h2>
            <p className="mx-auto mb-8 max-w-xl text-muted-foreground">Start collecting customer stories and turn them into proof your next customer can trust.</p>
            <Link to="/signup"><Button size="lg" className="h-12 rounded-full px-7">Get started free <ArrowRight className="ml-2 h-4 w-4" /></Button></Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/70 py-10 text-sm text-muted-foreground">
        <div className="container mx-auto mb-8 grid gap-8 md:grid-cols-4">
          <div><div className="mb-3 flex items-center gap-2 font-semibold text-foreground"><img src="/kudospot-icon.svg" alt="" className="h-6 w-6" />KudoSpot</div><p className="max-w-xs text-xs leading-5">Built for teams who want real customer stories to do more.</p></div>
          <div><div className="mb-3 font-medium text-foreground">Product</div><div className="space-y-2 text-xs"><Link to="/pricing" className="block hover:text-foreground">Pricing</Link><Link to="/changelog" className="block hover:text-foreground">Changelog</Link><Link to="/widgets" className="block hover:text-foreground">Widgets</Link></div></div>
          <div><div className="mb-3 font-medium text-foreground">Company</div><div className="space-y-2 text-xs"><Link to="/contact" className="block hover:text-foreground">Contact</Link><Link to="/affiliates" className="block hover:text-foreground">Affiliates</Link><a href="mailto:hello@kudospot.io" className="block hover:text-foreground">Email us</a></div></div>
          <div><div className="mb-3 font-medium text-foreground">Resources</div><div className="space-y-2 text-xs"><Link to="/help" className="block hover:text-foreground">Help & FAQ</Link><Link to="/privacy" className="block hover:text-foreground">Privacy Policy</Link><Link to="/terms" className="block hover:text-foreground">Terms of Service</Link></div></div>
        </div>
        <div className="container mx-auto flex flex-col items-center justify-between gap-4 border-t border-border/70 pt-6 md:flex-row"><p className="text-xs">© {new Date().getFullYear()} KudoSpot. All rights reserved.</p><div className="flex items-center gap-4 text-xs"><Link to="/compare/senja" className="hover:text-foreground">KudoSpot vs Senja</Link><Link to="/for/freelancers" className="hover:text-foreground">For Freelancers</Link></div></div>
      </footer>
    </div>
  );
};

export default Landing;
