import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import KudoSpotIcon from "@/components/KudoSpotIcon";
import { useAuth } from "@/contexts/AuthContext";

export default function Terms() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b py-4 px-6 flex items-center gap-4 justify-between">
        <div className="flex items-center gap-4">
          <Link to="/">
            <Button variant="ghost" size="sm" className="gap-2">
              <KudoSpotIcon className="h-4 w-4" /> KudoSpot
            </Button>
          </Link>
          <span className="text-muted-foreground text-sm">/ Terms of Service</span>
        </div>
        {user ? (
          <Link to="/dashboard">
            <Button variant="outline" size="sm">Back to Dashboard</Button>
          </Link>
        ) : null}
      </header>
      <main className="max-w-3xl mx-auto py-12 px-6">
        <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
        <p className="text-muted-foreground mb-10 text-sm">Last updated: {new Date().toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}</p>
        <div className="space-y-8 text-sm leading-relaxed text-foreground/80">
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">1. Acceptance of terms</h2>
            <p>By creating a KudoSpot account, you agree to these Terms of Service. If you do not agree, do not use the service. We may update these terms with 14 days notice via email.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">2. Service description</h2>
            <p>KudoSpot is a SaaS platform that helps businesses collect customer testimonials, rewrite them using AI, and display them as embeddable widgets, social media posts, and case studies.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">3. Acceptable use</h2>
            <p>You may not: (a) upload false or fabricated testimonials, (b) use the platform to collect reviews you do not have permission to share, (c) reverse engineer or scrape the platform, (d) use KudoSpot for spam or unsolicited messaging, (e) violate any applicable laws including India's IT Act 2000.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">4. Payments and billing</h2>
            <p>Paid plans are billed monthly via Razorpay. Charges are non-refundable except where required by law. You may cancel at any time from Settings → Billing. On cancellation, your account reverts to the Free plan at the end of the current billing period. All paid features remain accessible until the period ends.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">5. Your content</h2>
            <p>You retain full ownership of all testimonials and business content you upload. You grant KudoSpot a limited licence to store, process, and display this content solely to provide the service. We do not claim ownership of your data.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">6. Limitation of liability</h2>
            <p>KudoSpot is provided 'as is'. We are not liable for indirect, incidental, or consequential damages. Our maximum liability is the amount you paid us in the past 12 months.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">7. Governing law</h2>
            <p>These terms are governed by the laws of India. Disputes shall be resolved in the courts of Bangalore, Karnataka, India.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">8. Contact</h2>
            <p>For terms questions: <a href="mailto:hello@kudospot.io" className="text-primary underline">hello@kudospot.io</a></p>
          </section>
        </div>
      </main>
      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} KudoSpot · <Link to="/privacy" className="hover:underline">Privacy</Link>
      </footer>
    </div>
  );
}
