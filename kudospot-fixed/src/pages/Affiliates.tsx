import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowRight, Gift, TrendingUp, Users } from "lucide-react";

const Affiliates = () => {
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
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            Earn recurring commissions <span className="text-primary">by referring</span> KudoSpot
          </h1>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Share your referral link. Every customer who subscribes through your link earns you 30% commission every month — for life.
          </p>
        </div>
      </section>

      {/* Benefits */}
      <section className="container mx-auto py-20">
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {[
            {
              icon: Gift,
              title: "30% recurring commission",
              description: "Earn 30% of every subscription from customers who sign up through your link, every single month.",
            },
            {
              icon: TrendingUp,
              title: "Passive income stream",
              description: "Set it and forget it. Commissions keep flowing as long as your referrals stay customers.",
            },
            {
              icon: Users,
              title: "Easy to share",
              description: "Get a unique referral link and share it with your audience. No approval process needed.",
            },
          ].map((benefit, i) => {
            const Icon = benefit.icon;
            return (
              <Card key={i} className="p-6">
                <Icon className="h-8 w-8 text-primary mb-4" />
                <h3 className="font-semibold text-lg mb-2">{benefit.title}</h3>
                <p className="text-sm text-muted-foreground">{benefit.description}</p>
              </Card>
            );
          })}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-muted/30 py-20">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-2">How it works</h2>
            <p className="text-muted-foreground">Three simple steps to start earning.</p>
          </div>

          <div className="max-w-3xl mx-auto space-y-6">
            {[
              { num: 1, title: "Apply to the program", desc: "Send us a quick email and tell us who you'd like to refer KudoSpot to. We review personally and get back within a few days." },
              { num: 2, title: "Get your referral link", desc: "Once approved, you'll receive a unique referral link. Share it with your audience however you like." },
              { num: 3, title: "Earn commissions", desc: "When someone subscribes through your link, you earn 30% of their subscription every month. Commissions are paid out on the 1st of each month." },
            ].map((step) => (
              <div key={step.num} className="flex gap-6">
                <div className="flex-shrink-0">
                  <div className="h-12 w-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-lg">
                    {step.num}
                  </div>
                </div>
                <div className="flex-1 pt-1">
                  <h3 className="font-semibold text-lg mb-1">{step.title}</h3>
                  <p className="text-muted-foreground">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto py-20 text-center">
        <h2 className="text-3xl font-bold mb-6">Ready to start earning?</h2>
        <p className="text-muted-foreground mb-8">We review applications personally and reply within a few days.</p>
        <a href="mailto:hello@kudospot.io?subject=Affiliate%20Program%20Application&body=Hi%20KudoSpot%20team%2C%0A%0AI%27d%20like%20to%20apply%20to%20become%20an%20affiliate%20for%20KudoSpot.%0A%0ATell%20us%20a%20bit%20about%20your%20audience%20and%20how%20you%20plan%20to%20promote%20KudoSpot%3A">
          <Button size="lg" className="shadow-glow">
            Apply to become an affiliate <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </a>
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

export default Affiliates;
