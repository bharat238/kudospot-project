import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Check, X, ArrowRight } from "lucide-react";

const comparisonData = [
  { feature: "AI assistance", kudospot: "AI rewrite drafts", senja: "AI testimonial analysis" },
  { feature: "Social content", kudospot: "Text post generator", senja: "Video Reels" },
  { feature: "Case study generator", kudospot: true, senja: true },
  { feature: "Customer approval links", kudospot: true, senja: "Not verified" },
  { feature: "Website widgets", kudospot: true, senja: true },
  { feature: "Wall of Love", kudospot: true, senja: true },
  { feature: "Payment provider", kudospot: "Razorpay (INR)", senja: "Stripe (cards)" },
  { feature: "Video testimonial collection", kudospot: "Coming soon", senja: "Available" },
  { feature: "CSV testimonial export", kudospot: true, senja: true },
  { feature: "Widget analytics", kudospot: true, senja: true },
  { feature: "Third-party imports", kudospot: "Coming soon", senja: "35 sources listed" },
  { feature: "Free plan", kudospot: "Free: 10 testimonials, 5 AI rewrites, 1 widget", senja: "Free: 15 text/video testimonials" },
  { feature: "Paid plan pricing", kudospot: "₹499 / ₹1,299 per 30-day access period", senja: "Starter $29/mo; Pro $59/mo" },
];;

const VsSenja = () => {
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

      {/* Header */}
      <section className="bg-gradient-soft">
        <div className="container mx-auto py-20 md:py-28 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            KudoSpot vs Senja
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Compare the workflows that matter. Some capabilities and billing models differ, so review the detail before deciding.
          </p>
        </div>
      </section>

      {/* Comparison table */}
      <section className="container mx-auto py-20">
        <div className="max-w-4xl mx-auto">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-border">
                  <th className="text-left py-4 px-4 font-semibold">Feature</th>
                  <th className="text-center py-4 px-4 font-semibold">
                    <div className="flex items-center justify-center gap-2">
                      <img src="/kudospot-icon.svg" alt="KudoSpot" className="h-5 w-5" />
                      <span>KudoSpot</span>
                    </div>
                  </th>
                  <th className="text-center py-4 px-4 font-semibold">Senja</th>
                </tr>
              </thead>
              <tbody>
                {comparisonData.map((row, i) => (
                  <tr key={i} className="border-b border-border hover:bg-muted/30">
                    <td className="py-4 px-4 font-medium">{row.feature}</td>
                    <td className="py-4 px-4 text-center">
                      {row.kudospot === true ? (
                        <Check className="h-5 w-5 text-success mx-auto" />
                      ) : (
                        <span className="text-xs text-muted-foreground">{row.kudospot}</span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-center">
                      {row.senja === true ? (
                        <Check className="h-5 w-5 text-success mx-auto" />
                      ) : row.senja === false ? (
                        <X className="h-5 w-5 text-muted-foreground mx-auto" />
                      ) : (
                        <span className="text-xs text-muted-foreground">{row.senja}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-5 text-xs leading-5 text-muted-foreground">
            Competitor features and prices checked on 20 October 2026 from Senja's published pricing page. Plans can change; KudoSpot's paid checkout is a one-time 30-day access period, while Senja lists monthly subscriptions. <a href="https://senja.io/pricing" target="_blank" rel="noreferrer" className="underline underline-offset-4">Verify Senja pricing</a>.
          </p>

          {/* Key differentiators */}
          <div className="mt-16 grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <img src="/kudospot-icon.svg" alt="KudoSpot" className="h-5 w-5" />
                KudoSpot strengths
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• <strong>Focused workflow:</strong> Draft testimonial rewrites, request customer approval, then reuse approved stories in widgets, case studies, and social content.</li>
                <li>• <strong>INR checkout:</strong> Paid access is purchased through Razorpay with the payment methods available in checkout.</li>
                <li>• <strong>Free forever:</strong> Start with 10 testimonials, 5 AI rewrites, and 1 widget at no cost</li>
                <li>• <strong>Simple billing:</strong> Free to start; paid access lasts 30 days per payment and is renewed manually.</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-4">If you need</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• <strong>Imports:</strong> Senja lists imports from 35 sources; KudoSpot platform imports are not yet available.</li>
                <li>• <strong>Video testimonials:</strong> Senja supports collection and video Reels. KudoSpot video collection is not yet available.</li>
                <li>• <strong>Established ecosystem:</strong> Senja has been around longer</li>
              </ul>
            </div>
          </div>

          {/* CTA */}
          <div className="mt-16 text-center">
            <h2 className="text-2xl font-bold mb-4">Ready to try KudoSpot?</h2>
            <p className="text-muted-foreground mb-6">Start free — no credit card required.</p>
            <Link to="/signup">
              <Button size="lg" className="shadow-glow">
                Get started free <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </div>
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

export default VsSenja;
