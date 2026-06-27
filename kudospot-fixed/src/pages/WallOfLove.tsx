import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star, Share2, Loader2, Quote } from "lucide-react";
import KudoSpotIcon from "@/components/KudoSpotIcon";
import { toast } from "sonner";

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
        // Step 1: resolve slug → user_id via collection_forms
        const { data: formData, error: formErr } = await supabase
          .from("collection_forms")
          .select("user_id")
          .eq("public_slug", slug)
          .maybeSingle();

        if (formErr || !formData) {
          setProfile(null);
          setLoading(false);
          return;
        }

        const resolvedUserId = formData.user_id;

        // Step 2: fetch profile and testimonials in parallel using resolved user_id
        const [profileRes, testimonialsRes] = await Promise.all([
          supabase.from("profiles").select("business_name, business_logo_url").eq("id", resolvedUserId).maybeSingle(),
          supabase.from("testimonials")
            .select("id, customer_name, customer_role, customer_company, customer_avatar_url, approved_text, ai_rewritten_text, original_text, rating, created_at")
            .eq("user_id", resolvedUserId)
            .eq("status", "approved")
            .order("created_at", { ascending: false })
        ]);

        if (profileRes.error) throw profileRes.error;

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

  const businessName = profile?.business_name || "Our Business";
  const testimonialCount = testimonials.length;

  useEffect(() => {
    if (!profile) return;
    const bName = profile.business_name || "Our Business";
    document.title = `${bName} — Wall of Love`;
    const setMeta = (name: string, content: string, prop = false) => {
      const attr = prop ? "property" : "name";
      let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
      if (!el) { el = document.createElement("meta"); el.setAttribute(attr, name); document.head.appendChild(el); }
      el.setAttribute("content", content);
    };
    setMeta("description", `Read what customers say about ${bName}.`);
    setMeta("og:title", `${bName} — Wall of Love`, true);
    setMeta("og:description", `${testimonials.length} happy customers can't be wrong.`, true);
    return () => { document.title = "KudoSpot — Turn testimonials into revenue"; };
  }, [profile, testimonials.length]);

  const share = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Link copied to clipboard!");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#faf5ff]">
        <Loader2 className="h-10 w-10 animate-spin text-[#7C3AED] opacity-50 mb-4" />
        <p className="text-muted-foreground animate-pulse">Loading Wall of Love...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#faf5ff] p-6 text-center">
        <div className="text-6xl mb-4">🤔</div>
        <h1 className="text-2xl font-bold mb-2">This Wall of Love doesn't exist.</h1>
        <p className="text-muted-foreground mb-6">Check the URL and try again.</p>
        <Link to="/"><Button variant="outline">Back to KudoSpot</Button></Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#faf5ff] flex flex-col font-sans">

      <header className="py-16 px-4 text-center max-w-4xl mx-auto w-full">
        {profile.business_logo_url && (
          <img src={profile.business_logo_url} alt={businessName} className="h-16 mx-auto mb-6 object-contain" />
        )}
        <h1 className="text-4xl md:text-6xl font-extrabold mb-4 tracking-tight text-[#1a1a2e]">
          <span className="text-[#7C3AED]">Wall of Love</span> for {businessName}
        </h1>
        <p className="text-xl text-muted-foreground mb-8">Loved by our customers</p>
        
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <div className="bg-[#f3f0ff] text-[#7C3AED] px-5 py-2 rounded-full text-sm font-bold flex items-center gap-2 border border-[#7C3AED]/10">
            <CheckCircle2 className="h-4 w-4" /> {testimonialCount} happy customers
          </div>
          <Button variant="outline" size="sm" onClick={share} className="gap-2 border-[#7C3AED]/20 hover:bg-[#7C3AED]/5 text-[#7C3AED]">
            <Share2 className="h-4 w-4" /> Share this page
          </Button>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 pb-24">
        {testimonialCount === 0 ? (
          <Card className="p-16 text-center max-w-md mx-auto bg-white border-none shadow-sm">
            <div className="text-5xl mb-4">💬</div>
            <h2 className="text-xl font-bold mb-2">No testimonials yet.</h2>
            <p className="text-muted-foreground">{businessName} is just getting started.</p>
          </Card>
        ) : (
          <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
            {testimonials.map((t) => (
              <Card key={t.id} className="break-inside-avoid p-8 shadow-sm hover:shadow-md transition-all duration-300 border-none bg-white rounded-2xl group">
                <div className="flex mb-5 gap-0.5">
                  {[...Array(t.rating || 5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                
                <div className="relative mb-8">
                  <Quote className="absolute -left-3 -top-3 h-10 w-10 text-[#7C3AED]/5 group-hover:text-[#7C3AED]/10 transition-colors" />
                  <p className="text-[#333] leading-relaxed whitespace-pre-line relative z-10 text-[15px]">
                    {t.approved_text || t.ai_rewritten_text || t.original_text}
                  </p>
                </div>

                <div className="flex items-center gap-4 pt-6 border-t border-gray-50">
                  <div className="h-12 w-12 rounded-full bg-[#f3f0ff] text-[#7C3AED] flex items-center justify-center font-bold overflow-hidden shrink-0 border border-[#7C3AED]/10">
                    {t.customer_avatar_url ? (
                      <img src={t.customer_avatar_url} alt={t.customer_name} className="h-full w-full object-cover" />
                    ) : (
                      t.customer_name?.charAt(0).toUpperCase() || "?"
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-sm text-[#1a1a2e]">{t.customer_name}</div>
                    {(t.customer_role || t.customer_company) && (
                      <div className="text-xs text-muted-foreground truncate mt-0.5">
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

      <footer className="py-12 border-t border-[#7C3AED]/10 bg-white mt-auto">
        <div className="container mx-auto px-4 flex flex-col items-center gap-4">
          <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-[#7C3AED] transition-colors">
            <KudoSpotIcon className="h-6 w-6 opacity-70" />
            <span className="text-base font-semibold tracking-tight">Powered by KudoSpot</span>
          </Link>
          <p className="text-[11px] text-muted-foreground uppercase tracking-[0.2em] opacity-40 font-bold">
            Turn testimonials into revenue
          </p>
        </div>
      </footer>
    </div>
  );
};

const CheckCircle2 = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/></svg>
);

export default WallOfLove;
