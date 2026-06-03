import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { MessageSquareQuote, CheckCircle2, Clock, Plus, Copy, ExternalLink, Heart } from "lucide-react";
import { OnboardingWizard } from "@/components/OnboardingWizard";
import KudoSpotIcon from "@/components/KudoSpotIcon";
import { toast } from "sonner";

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({ total: 0, pending: 0, rewritten: 0, approved: 0 });
  const [recent, setRecent] = useState<any[]>([]);
  const [profile, setProfile] = useState<any | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [wallSlug, setWallSlug] = useState<string | null>(null);

  const reloadProfile = async () => {
    if (!user) return;
    const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
    setProfile(data);
    setLoadingProfile(false);
  };

  useEffect(() => {
    if (!user) return;
    reloadProfile();
    // Fetch wall slug from collection_forms
    supabase
      .from("collection_forms")
      .select("public_slug")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.public_slug) setWallSlug(data.public_slug);
      });
    (async () => {
      const { data } = await supabase
        .from("testimonials")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      const list = data || [];
      setRecent(list.slice(0, 5));
      setStats({
        total: list.length,
        pending: list.filter((t) => t.status === "pending").length,
        rewritten: list.filter((t) => t.status === "ai_rewritten").length,
        approved: list.filter((t) => t.status === "approved" || t.status === "published").length,
      });
    })();
  }, [user]);

  const cards = [
    { label: "Total testimonials", value: stats.total, icon: MessageSquareQuote, color: "text-primary bg-primary-light" },
    { label: "Pending review", value: stats.pending, icon: Clock, color: "text-warning bg-warning/10" },
    { label: "AI rewritten", value: stats.rewritten, icon: KudoSpotIcon, color: "text-primary bg-primary-light" },
    { label: "Approved", value: stats.approved, icon: CheckCircle2, color: "text-success bg-success/10" },
  ];

  if (loadingProfile) return null;
  if (profile && !profile.onboarding_completed) {
    return <OnboardingWizard onDone={reloadProfile} />;
  }

  return (
    <AppShell>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-1">Dashboard</h1>
          <p className="text-muted-foreground">Your social proof at a glance.</p>
        </div>
        <Link to="/testimonials"><Button><Plus className="h-4 w-4 mr-1" /> Add testimonial</Button></Link>
      </div>

      <div className="mb-6 p-4 rounded-xl border border-purple-200  
      bg-gradient-to-r from-purple-50 to-white  
      dark:from-purple-950/20 dark:border-purple-800"> 
        <div className="flex items-center justify-between flex-wrap gap-3"> 
          <div className="flex items-center gap-3"> 
            <div className="h-10 w-10 rounded-full bg-purple-100  
            dark:bg-purple-900 flex items-center justify-center"> 
              <Heart className="h-5 w-5 text-purple-600" /> 
            </div> 
            <div> 
              <p className="font-medium text-sm">Your Wall of Love is live</p> 
              <p className="text-xs text-muted-foreground font-mono truncate max-w-xs">
                {wallSlug ? `kudospot.pages.dev/wall/${wallSlug}` : "Wall URL loading..."}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              size="sm" 
              variant="outline" 
              disabled={!wallSlug}
              onClick={() => { 
                if (!wallSlug) return;
                navigator.clipboard.writeText( 
                  `https://kudospot.pages.dev/wall/${wallSlug}` 
                ); 
                toast.success("Wall of Love URL copied!"); 
              }} 
            > 
              <Copy className="h-3.5 w-3.5 mr-1" /> Copy link 
            </Button> 
            <Button 
              size="sm" 
              variant="outline" 
              disabled={!wallSlug}
              onClick={() => wallSlug && window.open( 
                `https://kudospot.pages.dev/wall/${wallSlug}`,
                "_blank" 
              )} 
            > 
              <ExternalLink className="h-3.5 w-3.5 mr-1" /> View 
            </Button> 
          </div> 
        </div> 
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {cards.map((c) => (
          <Card key={c.label} className="p-5">
            <div className={`h-10 w-10 rounded-lg flex items-center justify-center mb-3 ${c.color}`}>
              <c.icon className="h-5 w-5" />
            </div>
            <div className="text-3xl font-bold">{c.value}</div>
            <div className="text-sm text-muted-foreground">{c.label}</div>
          </Card>
        ))}
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-lg">Recent testimonials</h2>
          <Link to="/testimonials" className="text-sm text-primary hover:underline">View all →</Link>
        </div>
        {recent.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <KudoSpotIcon className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p className="mb-4">No testimonials yet. Add your first one to start.</p>
            <Link to="/testimonials"><Button variant="outline"><Plus className="h-4 w-4 mr-1" /> Add testimonial</Button></Link>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {recent.map((t) => (
              <div key={t.id} className="py-3 flex items-start gap-3">
                <div className="h-9 w-9 rounded-full bg-primary-light text-primary font-semibold flex items-center justify-center text-sm">
                  {t.customer_name?.[0]?.toUpperCase() || "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{t.customer_name}</span>
                    <span className="text-xs text-muted-foreground">{t.customer_role}</span>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">{t.ai_rewritten_text || t.original_text}</p>
                </div>
                <StatusBadge status={t.status} />
              </div>
            ))}
          </div>
        )}
      </Card>
    </AppShell>
  );
};

const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, { label: string; cls: string }> = {
    pending: { label: "Pending", cls: "bg-warning/10 text-warning" },
    ai_rewritten: { label: "Rewritten", cls: "bg-primary-light text-primary" },
    approved: { label: "Approved", cls: "bg-success/10 text-success" },
    published: { label: "Published", cls: "bg-success/10 text-success" },
  };
  const s = map[status] || map.pending;
  return <span className={`text-xs px-2 py-1 rounded-full font-medium ${s.cls}`}>{s.label}</span>;
};

export default Dashboard;
