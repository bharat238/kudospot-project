import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const changelogEntries = [
  {
    date: "July 2025",
    title: "Mobile responsiveness improvements",
    description: "Form fields and data tables now adapt perfectly to mobile screens. Form grids stack on small screens, analytics tables scroll independently.",
  },
  {
    date: "July 2025",
    title: "Password recovery flow completed",
    description: "Password reset email links now work end-to-end. Users can set a new password directly from the reset link with instant validation.",
  },
  {
    date: "July 2025",
    title: "Testimonial submission security hardened",
    description: "Rate limiting on testimonial submissions. Direct RLS bypasses removed. Form submissions now routed through secure edge functions with validation.",
  },
  {
    date: "June 2025",
    title: "Settings page redesigned",
    description: "Settings layout now uses a proper two-column design with left navigation. Content naturally fills available screen width on desktop.",
  },
  {
    date: "June 2025",
    title: "Marketing pages added",
    description: "New public pages: Pricing, Affiliates, Contact, Help, Changelog, Comparisons, and use-case landing pages. Consistent brand design across all.",
  },
  {
    date: "May 2025",
    title: "AI-powered testimonial rewriting launched",
    description: "Customers can now generate AI-polished versions of raw testimonials. Groq and Claude-powered rewrites keep customer voice while improving clarity.",
  },
  {
    date: "May 2025",
    title: "Social post generator added",
    description: "Automatically generate 3 different social post variations from each testimonial. One-click sharing to LinkedIn, Twitter, and more.",
  },
  {
    date: "May 2025",
    title: "Case study generator",
    description: "Turn testimonials into formatted case studies with customer details, results, and metrics. Export as shareable web pages.",
  },
  {
    date: "April 2025",
    title: "Razorpay payments integration",
    description: "Full integration with Razorpay for subscriptions. Support for credit/debit cards, UPI, and net banking across India and internationally.",
  },
  {
    date: "April 2025",
    title: "Wall of Love public pages",
    description: "Beautiful public pages showcasing customer testimonials and reviews. Embedabble widgets that build trust on your site.",
  },
  {
    date: "March 2025",
    title: "Email approval flow",
    description: "Customers receive email approvals for testimonials. One-click approve or decline with reason templates for quick feedback.",
  },
  {
    date: "March 2025",
    title: "Widget customization",
    description: "Custom colors, corner radius, and styling options. Widgets now match any brand without CSS knowledge.",
  },
  {
    date: "February 2025",
    title: "CSV export for testimonials",
    description: "Export all testimonials and metadata as CSV. Perfect for backup, analysis, or import into other tools.",
  },
  {
    date: "February 2025",
    title: "Owner email notifications",
    description: "Get notified via email every time a new testimonial is submitted. Stay updated on what customers are saying.",
  },
  {
    date: "January 2025",
    title: "Beta launch",
    description: "KudoSpot enters beta. Initial release with testimonial collection, AI rewriting, and basic widgets.",
  },
];

const Changelog = () => {
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
          <h1 className="text-4xl md:text-5xl font-bold mb-6">Changelog</h1>
          <p className="text-lg text-muted-foreground">What's new in KudoSpot</p>
        </div>
      </section>

      {/* Timeline */}
      <section className="container mx-auto py-20">
        <div className="max-w-2xl mx-auto">
          <div className="space-y-8">
            {changelogEntries.map((entry, i) => (
              <div key={i} className="flex gap-6">
                <div className="flex flex-col items-center">
                  <div className="h-3 w-3 rounded-full bg-primary mt-2" />
                  {i !== changelogEntries.length - 1 && (
                    <div className="h-16 w-0.5 bg-border my-2" />
                  )}
                </div>
                <div className="pb-8">
                  <div className="text-sm text-muted-foreground font-medium">{entry.date}</div>
                  <h3 className="text-lg font-semibold mt-1 mb-2">{entry.title}</h3>
                  <p className="text-muted-foreground">{entry.description}</p>
                </div>
              </div>
            ))}
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

export default Changelog;
