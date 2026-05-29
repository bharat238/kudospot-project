import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star, Share2, Loader2, Quote } from "lucide-react";
import KudoSpotIcon from "@/components/KudoSpotIcon";
import { toast } from "sonner";
import { Helmet } from "react-helmet";

const WallOfLove = () => {
  const { slug } = useParams();
  const [profile, setProfile] = useState<any>(null);
  const [testimonials, setTestimonials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!slug) return;
      setLoading(true);
      try {
        // Step 1: Find the collection form with this slug to get the user_id
        // We use the collection_forms table because that's where the public slug lives
        const { data: formData, error: formError } = await supabase
          .from("collection_forms")
          .select("user_id")
          .eq("public_slug", slug)
          .eq("is_active", true)
          .maybeSingle();

        if (formError || !formData) {
          setLoading(false);
          return;
        }

        const userId = formData.user_id;

        // Step 2: Fetch profile and testimonials in parallel
        const [profileRes, testimonialsRes] = await Promise.all([
          supabase.from("profiles").select("business_name, business_logo_url").eq("id", userId).maybeSingle(),
          supabase.from("testimonials")
            .select("id, customer_name, customer_role, customer_company, customer_avatar_url, approved_text, ai_rewritten_text, original_text, rating, created_at")
            .eq("user_id", userId)
            .eq("status", "approved")
            .order("created_at", { ascending: false })
        ]);

        setProfile(profileRes.data);
        setTestimonials(testimonialsRes.data || []);
      } catch (err) {
        console.error("Error fetching Wall of Love:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [slug]);

  const share = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Link copied to clipboard!");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-secondary/30">
        <Loader2 className="h-10 w-10 animate-spin text-primary opacity-50 mb-4" />
        <p className="text-muted-foreground animate-pulse">Loading Wall of Love...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-secondary/30 p-6 text-center">
        <div className="text-6xl mb-4">🤔</div>
        <h1 className="text-2xl font-bold mb-2">This Wall of Love doesn't exist.</h1>
        <p className="text-muted-foreground mb-6">Check the URL and try again.</p>
        <Link to="/"><Button variant="outline">Back to KudoSpot</Button></Link>
      </div>
    );
  }

  const businessName = profile.business_name || "Our Business";
  const testimonialCount = testimonials.length;

  return (
    <div className="min-h-screen bg-secondary/30 flex flex-col">
      <Helmet>
        <title>{businessName} — Wall of Love</title>
        <meta name="description" content={`Read what customers say about ${businessName}.`} />
        <meta property="og:title" content={`${businessName} — Wall of Love`} />
        <meta property="og:description" content={`${testimonialCount} happy customers can't be wrong.`} />
      </Helmet>

      <header className="py-12 px-4 text-center max-w-4xl mx-auto w-full">
        {profile.business_logo_url && (
          <img src={profile.business_logo_url} alt={businessName} className="h-16 mx-auto mb-6 object-contain" />
        )}
        <h1 className="text-4xl md:text-5xl font-bold mb-3 tracking-tight">{businessName}</h1>
        <p className="text-xl text-muted-foreground mb-6">Loved by our customers</p>
        
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <div className="bg-primary-light text-primary px-4 py-1.5 rounded-full text-sm font-semibold flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" /> {testimonialCount} happy customers
          </div>
          <Button variant="outline" size="sm" onClick={share} className="gap-2">
            <Share2 className="h-4 w-4" /> Share this page
          </Button>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 pb-24">
        {testimonialCount === 0 ? (
          <Card className="p-16 text-center max-w-md mx-auto">
            <div className="text-5xl mb-4">💬</div>
            <h2 className="text-xl font-bold mb-2">No testimonials yet.</h2>
            <p className="text-muted-foreground">{businessName} is just getting started.</p>
          </Card>
        ) : (
          <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
            {testimonials.map((t) => (
              <Card key={t.id} className="break-inside-avoid p-6 shadow-sm hover:shadow-md transition-shadow duration-200 border-none">
                <div className="flex mb-4">
                  {[...Array(t.rating || 5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-warning text-warning" />
                  ))}
                </div>
                
                <div className="relative">
                  <Quote className="absolute -left-2 -top-2 h-8 w-8 text-primary/5 -z-10" />
                  <p className="text-foreground/90 leading-relaxed mb-6 whitespace-pre-line relative z-10">
                    {t.approved_text || t.ai_rewritten_text || t.original_text}
                  </p>
                </div>

                <div className="flex items-center gap-3 mt-auto">
                  <div className="h-10 w-10 rounded-full bg-primary-light text-primary flex items-center justify-center font-bold overflow-hidden shrink-0">
                    {t.customer_avatar_url ? (
                      <img src={t.customer_avatar_url} alt={t.customer_name} className="h-full w-full object-cover" />
                    ) : (
                      t.customer_name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-sm truncate">{t.customer_name}</div>
                    {(t.customer_role || t.customer_company) && (
                      <div className="text-xs text-muted-foreground truncate">
                        {t.customer_role}{t.customer_role && t.customer_company ? " at " : ""}{t.customer_company}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>

      <footer className="py-10 border-t bg-white/50 backdrop-blur-sm mt-auto">
        <div className="container mx-auto px-4 flex flex-col items-center gap-4">
          <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
            <KudoSpotIcon className="h-5 w-5 opacity-70" />
            <span className="text-sm font-medium">Powered by KudoSpot</span>
          </Link>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest opacity-50">
            Automate your social proof
          </p>
        </div>
      </footer>
    </div>
  );
};

// Helper components missing from imports
const CheckCircle2 = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/></svg>
);

export default WallOfLove;
