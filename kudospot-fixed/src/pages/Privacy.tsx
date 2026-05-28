import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import KudoSpotIcon from "@/components/KudoSpotIcon";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b py-4 px-6 flex items-center gap-4">
        <Link to="/">
          <Button variant="ghost" size="sm" className="gap-2">
            <KudoSpotIcon className="h-4 w-4" /> KudoSpot
          </Button>
        </Link>
        <span className="text-muted-foreground text-sm">/ Privacy Policy</span>
      </header>
      <main className="max-w-3xl mx-auto py-12 px-6">
        <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-muted-foreground mb-10 text-sm">Last updated: {new Date().toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}</p>
        <div className="space-y-8 text-sm leading-relaxed text-foreground/80">
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">1. Information we collect</h2>
            <p>KudoSpot collects information you provide directly: your name, email address, business name, brand assets, and the testimonial data you upload or collect through the platform. We also automatically collect usage data (pages visited, features used, timestamps) to improve the service.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">2. How we use your information</h2>
            <p>We use your data solely to provide and improve the KudoSpot service — to store testimonials, generate AI rewrites, send approval emails, display widgets, and provide analytics. We do not sell, rent, or share your personal data with third parties for their marketing purposes.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">3. AI processing</h2>
            <p>When you use the AI Rewrite feature, your testimonial text is sent to Anthropic's Claude API for processing. Anthropic does not train their models on API data. The rewritten output is stored in our database and shown only to you and the customer who submitted the testimonial.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">4. Data storage and security</h2>
            <p>Your data is stored on Supabase infrastructure hosted in Singapore (AWS ap-southeast-1 region). All data is encrypted in transit using TLS 1.3 and encrypted at rest. We use row-level security policies to ensure users can only access their own data.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">5. Third-party services</h2>
            <p>KudoSpot integrates with: Anthropic (AI — api.anthropic.com), Supabase (database and auth — supabase.com), Resend (email delivery — resend.com), Razorpay (payments — razorpay.com), and Google (OAuth login — google.com). Each service has its own privacy policy governing their data practices.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">6. Cookies</h2>
            <p>We use essential cookies only: a session cookie to keep you logged in, and a localStorage preference for UI settings. We do not use advertising or tracking cookies.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">7. Your rights</h2>
            <p>You may request export or deletion of your account data at any time by emailing hello@kudospot.io. We will respond within 30 days. Account deletion removes all your testimonials, forms, widgets, case studies, and profile data permanently.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">8. Contact</h2>
            <p>For privacy questions or data requests: <a href="mailto:hello@kudospot.io" className="text-primary underline">hello@kudospot.io</a></p>
          </section>
        </div>
      </main>
      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} KudoSpot · <Link to="/terms" className="hover:underline">Terms</Link>
      </footer>
    </div>
  );
}
