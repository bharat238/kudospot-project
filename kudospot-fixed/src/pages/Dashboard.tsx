import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import {
  MessageSquareQuote, CheckCircle2, Clock, Plus, Copy, ExternalLink, Heart,
  PanelsTopLeft, FileText, Share2, Inbox, ArrowUpRight, TrendingUp, Sparkles,
  ArrowRight, MousePointerClick, Loader2, AlertCircle
} from "lucide-react";
import { OnboardingWizard } from "@/components/OnboardingWizard";
import KudoSpotIcon from "@/components/KudoSpotIcon";
import { toast } from "sonner";

type Testimonial = {
  id: string;
  customer_name: string | null;
  customer_role: string | null;
  customer_company: string | null;
  original_text: string;
  ai_rewritten_text: string | null;
  approved_text: string | null;
  status: string;
  approval_status: string | null;
  rating: number | null;
  created_at: string;
  approved_at: string | null;
};

const Dashboard = () => {
  const { user } = useAuth();
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [forms, setForms] = useState<any[]>([]);
  const [widgets, setWidgets] = useState<any[]>([]);
  const [caseStudies, setCaseStudies] = useState<any[]>([]);
  const [socialPosts, setSocialPosts] = useState<any[]>([]);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const reloadProfile = async () => {
    if (!user) return;
    const { data, error } = await supabase.from("profiles").select("full_name,business_name,onboarding_completed").eq("id", user.id).maybeSingle();
    if (error) {
      toast.error("Your profile couldn't be refreshed. Please try again.");
      return;
    }
    setProfile(data);
    setLoadError(null);
    setLoading(false);
  };

  useEffect(() => {
    if (!user) return;
    let current = true;

    const load = async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const [profileResult, testimonialResult, formResult, widgetResult, caseStudyResult, socialResult] = await Promise.all([
          supabase.from("profiles").select("full_name,business_name,onboarding_completed").eq("id", user.id).maybeSingle(),
          supabase.from("testimonials").select("id,customer_name,customer_role,customer_company,original_text,ai_rewritten_text,approved_text,status,approval_status,rating,created_at,approved_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1000),
          supabase.from("collection_forms").select("id,form_name,public_slug,is_active,created_at").eq("user_id", user.id).order("created_at", { ascending: false }),
          supabase.from("widgets").select("id,widget_name,is_published,views,clicks").eq("user_id", user.id),
          supabase.from("case_studies").select("id,title,is_published,views").eq("user_id", user.id),
          supabase.from("social_posts").select("id,status,created_at").eq("user_id", user.id).order("created_at", { ascending: false }),
        ]);

        const failedQuery = [profileResult, testimonialResult, formResult, widgetResult, caseStudyResult, socialResult].find((result) => result.error);
        if (failedQuery?.error) throw failedQuery.error;
        if (!current) return;

        setProfile(profileResult.data);
        setTestimonials((testimonialResult.data || []) as Testimonial[]);
        setForms(formResult.data || []);
        setWidgets(widgetResult.data || []);
        setCaseStudies(caseStudyResult.data || []);
        setSocialPosts(socialResult.data || []);
      } catch (error) {
        console.error("Failed to load dashboard data:", error);
        if (current) setLoadError("We couldn't load your workspace data. Check your connection and try again.");
      } finally {
        if (current) setLoading(false);
      }
    };

    void load();
    return () => { current = false; };
  }, [user]);

  const stats = useMemo(() => ({
    total: testimonials.length,
    pending: testimonials.filter((item) => item.status === "pending" || item.status === "ai_rewritten").length,
    rewritten: testimonials.filter((item) => Boolean(item.ai_rewritten_text)).length,
    approved: testimonials.filter((item) => item.approval_status === "approved" || item.status === "published").length,
    widgetViews: widgets.reduce((sum, widget) => sum + Number(widget.views || 0), 0),
    widgetClicks: widgets.reduce((sum, widget) => sum + Number(widget.clicks || 0), 0),
    activeForms: forms.filter((form) => form.is_active).length,
    publishedWidgets: widgets.filter((widget) => widget.is_published).length,
    publishedCaseStudies: caseStudies.filter((study) => study.is_published).length,
    socialPostCount: socialPosts.length,
  }), [testimonials, widgets, forms, caseStudies, socialPosts]);

  const monthlyActivity = useMemo(() => {
    const now = new Date();
    const months = Array.from({ length: 6 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
      const next = new Date(date.getFullYear(), date.getMonth() + 1, 1);
      const collected = testimonials.filter((item) => {
        const created = new Date(item.created_at);
        return created >= date && created < next;
      }).length;
      const approved = testimonials.filter((item) => {
        if (!item.approved_at) return false;
        const approvedAt = new Date(item.approved_at);
        return approvedAt >= date && approvedAt < next;
      }).length;
      return { label: date.toLocaleDateString("en", { month: "short" }), collected, approved };
    });
    return months;
  }, [testimonials]);

  const chartMax = Math.max(1, ...monthlyActivity.flatMap((month) => [month.collected, month.approved]));
  const displayName = profile?.full_name?.trim()?.split(/\s+/)[0] || String(user?.user_metadata?.full_name || "").split(/\s+/)[0] || user?.email?.split("@")[0] || "there";
  const activeForm = forms.find((form) => form.is_active);
  const collectionUrl = activeForm?.public_slug ? `${window.location.origin}/collect/${activeForm.public_slug}` : null;

  const copyCollectionUrl = async () => {
    if (!collectionUrl) return;
    try {
      await navigator.clipboard.writeText(collectionUrl);
      toast.success("Collection link copied");
    } catch {
      toast.error("Couldn't copy the link. Please open the collection form and copy its URL.");
    }
  };

  if (loading) {
    return <AppShell><div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /><span className="ml-3 text-sm text-muted-foreground">Loading your workspace…</span></div></AppShell>;
  }

  if (loadError) {
    return (
      <AppShell>
        <Card className="mx-auto max-w-xl rounded-2xl p-8 text-center">
          <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-destructive/10 text-destructive"><AlertCircle className="h-5 w-5" /></div>
          <h1 className="text-lg font-semibold">Dashboard data is unavailable</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{loadError}</p>
          <Button className="mt-5" variant="outline" onClick={() => window.location.reload()}>Try again</Button>
        </Card>
      </AppShell>
    );
  }

  if (profile && !profile.onboarding_completed) {
    return <OnboardingWizard onDone={reloadProfile} />;
  }

  const statCards = [
    { label: "Total testimonials", value: stats.total, description: "Stories collected", icon: MessageSquareQuote, cardClass: "bg-card text-foreground", labelClass: "text-muted-foreground", valueClass: "text-foreground", descriptionClass: "text-muted-foreground", iconClass: "bg-orange-50 text-orange-800" },
    { label: "Pending review", value: stats.pending, description: "Awaiting your next step", icon: Clock, cardClass: "border-[#C94320] bg-[#C94320] text-white", labelClass: "text-white/85", valueClass: "text-white", descriptionClass: "text-white/80", iconClass: "bg-white/20 text-white" },
    { label: "AI rewritten", value: stats.rewritten, description: "Ready to review", icon: Sparkles, cardClass: "bg-card text-foreground", labelClass: "text-muted-foreground", valueClass: "text-foreground", descriptionClass: "text-muted-foreground", iconClass: "bg-stone-100 text-stone-700" },
    { label: "Approved", value: stats.approved, description: "Cleared to showcase", icon: CheckCircle2, cardClass: "bg-card text-foreground", labelClass: "text-muted-foreground", valueClass: "text-foreground", descriptionClass: "text-muted-foreground", iconClass: "bg-emerald-50 text-emerald-700" },
  ];

  const quickActions = [
    { to: "/collect", title: "Collect feedback", description: "Create or share a form", icon: Inbox, tint: "bg-orange-50 text-orange-700" },
    { to: "/widgets", title: "Showcase widgets", description: "Display reviews on your site", icon: PanelsTopLeft, tint: "bg-stone-100 text-stone-800" },
    { to: "/case-studies", title: "Build a case study", description: "Turn a customer win into a story", icon: FileText, tint: "bg-amber-50 text-amber-700" },
    { to: "/social-posts", title: "Create social content", description: "Prepare a testimonial post", icon: Share2, tint: "bg-emerald-50 text-emerald-700" },
  ];

  return (
    <AppShell>
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-[0.13em] text-muted-foreground">Workspace overview</div>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Good to see you, {displayName}.</h1>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">Here's the latest on your customer stories and social proof.</p>
        </div>
        <Link to="/testimonials"><Button className="h-11 rounded-xl px-5"><Plus className="mr-1 h-4 w-4" /> Add testimonial</Button></Link>
      </div>

      <section aria-label="Testimonial summary" className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.label} className={`rounded-2xl border-border/80 p-4 shadow-[0_2px_8px_rgba(15,23,42,0.035)] sm:p-5 ${stat.cardClass}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className={`text-xs font-medium sm:text-sm ${stat.labelClass}`}>{stat.label}</p>
                <div className={`mt-2 text-3xl font-semibold tracking-tight tabular-nums sm:text-[34px] ${stat.valueClass}`}>{stat.value.toLocaleString()}</div>
                <p className={`mt-1.5 text-xs ${stat.descriptionClass}`}>{stat.description}</p>
              </div>
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${stat.iconClass}`}><stat.icon className="h-[18px] w-[18px]" /></div>
            </div>
          </Card>
        ))}
      </section>

      <section className="mb-5 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(340px,0.9fr)]">
        <Card className="overflow-hidden rounded-2xl border-border/80 p-5 shadow-[0_2px_8px_rgba(15,23,42,0.035)] sm:p-6">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold sm:text-lg">Testimonial activity</h2>
              <p className="mt-1 text-xs text-muted-foreground sm:text-sm">Collected vs approved over the last six months</p>
            </div>
            <span className="rounded-full border border-border/80 bg-muted/70 px-3 py-1.5 text-[11px] font-medium text-muted-foreground">6 months</span>
          </div>
          <div role="img" aria-label="Bar chart comparing testimonials collected and approved over the last six months" className="grid h-[190px] grid-cols-6 gap-2 border-b border-border/70 px-1 sm:gap-4">
            {monthlyActivity.map((month) => (
              <div key={month.label} className="flex min-w-0 flex-col items-center justify-end">
                <div className="flex h-[150px] w-full max-w-[46px] items-end justify-center gap-1.5">
                  <div title={`${month.collected} collected`} className="w-[42%] rounded-t-md bg-foreground transition-all" style={{ height: `${Math.max(3, (month.collected / chartMax) * 100)}%` }} />
                  <div title={`${month.approved} approved`} className="w-[42%] rounded-t-md bg-[#EC5329] transition-all" style={{ height: `${Math.max(3, (month.approved / chartMax) * 100)}%` }} />
                </div>
                <span className="mt-3 pb-2 text-[10px] text-muted-foreground sm:text-xs">{month.label}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm bg-foreground" />Collected ({stats.total})</span>
            <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm bg-[#EC5329]" />Approved ({stats.approved})</span>
            <span className="ml-auto inline-flex items-center gap-1"><TrendingUp className="h-3.5 w-3.5" />Actual account activity</span>
          </div>
        </Card>

        <Card className="rounded-2xl border-border/80 p-5 shadow-[0_2px_8px_rgba(15,23,42,0.035)] sm:p-6">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div><h2 className="text-base font-semibold sm:text-lg">Quick actions</h2><p className="mt-1 text-xs text-muted-foreground sm:text-sm">Keep your customer proof moving</p></div>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-50 text-orange-700"><ArrowUpRight className="h-4 w-4" /></div>
          </div>
          <div className="space-y-2">
            {quickActions.map((action) => (
              <Link key={action.to} to={action.to} className="group flex items-center gap-3 rounded-xl border border-border/70 bg-card p-3 transition hover:border-border hover:bg-muted/50">
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${action.tint}`}><action.icon className="h-[18px] w-[18px]" /></span>
                <span className="min-w-0 flex-1"><span className="block text-sm font-medium text-foreground">{action.title}</span><span className="mt-1 block text-xs text-muted-foreground">{action.description}</span></span>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-foreground" />
              </Link>
            ))}
          </div>
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(310px,0.75fr)]">
        <Card className="overflow-hidden rounded-2xl border-border/80 shadow-[0_2px_8px_rgba(15,23,42,0.035)]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 px-5 py-4 sm:px-6">
            <div><h2 className="text-base font-semibold sm:text-lg">Recent testimonials</h2><p className="mt-1 text-xs text-muted-foreground">The latest feedback added to your workspace</p></div>
            <Link to="/testimonials" className="inline-flex items-center gap-1 text-xs font-semibold text-foreground hover:underline">View all <ArrowRight className="h-3.5 w-3.5" /></Link>
          </div>
          {testimonials.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-orange-700"><MessageSquareQuote className="h-5 w-5" /></div>
              <p className="font-medium">Your first customer story starts here.</p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">Add a testimonial or create a collection form to start building your social proof library.</p>
              <div className="mt-5 flex flex-wrap justify-center gap-2"><Link to="/testimonials"><Button size="sm"><Plus className="mr-1 h-3.5 w-3.5" />Add testimonial</Button></Link><Link to="/collect"><Button size="sm" variant="outline">Create a form</Button></Link></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[580px] border-collapse text-left">
                <thead><tr className="bg-muted/45 text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground"><th className="px-5 py-3 sm:px-6">Customer</th><th className="px-4 py-3">Feedback</th><th className="px-4 py-3">Added</th><th className="px-5 py-3 sm:px-6">Status</th></tr></thead>
                <tbody>
                  {testimonials.slice(0, 5).map((item) => (
                    <tr key={item.id} className="border-t border-border/60 align-middle transition hover:bg-muted/30">
                      <td className="px-5 py-3.5 sm:px-6"><div className="flex items-center gap-2.5"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-50 text-xs font-semibold text-orange-800">{item.customer_name?.trim()?.[0]?.toUpperCase() || "?"}</span><div className="min-w-0"><div className="max-w-[150px] truncate text-xs font-semibold text-foreground">{item.customer_name || "Customer"}</div><div className="max-w-[150px] truncate text-[10px] text-muted-foreground">{[item.customer_role, item.customer_company].filter(Boolean).join(" · ") || "Customer"}</div></div></div></td>
                      <td className="max-w-[240px] px-4 py-3.5"><p className="line-clamp-2 text-xs leading-5 text-muted-foreground">{item.approved_text || item.ai_rewritten_text || item.original_text}</p></td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-[10px] text-muted-foreground">{new Date(item.created_at).toLocaleDateString("en", { month: "short", day: "numeric" })}</td>
                      <td className="px-5 py-3.5 sm:px-6"><StatusBadge status={item.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <div className="space-y-4">
          <Card className="rounded-2xl border-border/80 p-5 shadow-[0_2px_8px_rgba(15,23,42,0.035)] sm:p-6">
            <div className="mb-4 flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-700"><Heart className="h-[18px] w-[18px]" /></div>
              <div><h2 className="font-semibold">Collection form</h2><p className="mt-1 text-xs text-muted-foreground">A simple link customers can use to share their experience</p></div>
            </div>
            {activeForm ? (
              <>
                <div className="mb-3 flex items-center justify-between gap-3"><span className="truncate text-sm font-medium">{activeForm.form_name || "Customer feedback form"}</span><span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700">Active</span></div>
                {collectionUrl && <div className="mb-4 rounded-lg border border-border/70 bg-muted/40 px-3 py-2.5 text-[11px] text-muted-foreground break-all">{collectionUrl.replace(/^https?:\/\//, "")}</div>}
                <div className="flex gap-2"><Button size="sm" className="flex-1" onClick={copyCollectionUrl}><Copy className="mr-1 h-3.5 w-3.5" />Copy link</Button><Button size="sm" variant="outline" asChild><a href={collectionUrl || "/collect"} target="_blank" rel="noreferrer"><ExternalLink className="mr-1 h-3.5 w-3.5" />Open</a></Button></div>
              </>
            ) : (
              <div className="rounded-xl border border-dashed border-border bg-muted/30 px-4 py-5 text-center"><p className="text-sm font-medium">No collection form yet</p><p className="mt-1 text-xs text-muted-foreground">Create a shareable form to start gathering feedback.</p><Link to="/collect"><Button size="sm" className="mt-4"><Plus className="mr-1 h-3.5 w-3.5" />Create form</Button></Link></div>
            )}
          </Card>

          <Card className="rounded-2xl border-border/80 p-5 shadow-[0_2px_8px_rgba(15,23,42,0.035)] sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-3"><div><h2 className="font-semibold">Your social proof</h2><p className="mt-1 text-xs text-muted-foreground">Published content across KudosSpot</p></div><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-stone-100 text-stone-800"><KudoSpotIcon className="h-4 w-4" /></span></div>
            <div className="divide-y divide-border/70">
              <Link to="/widgets" className="flex items-center justify-between gap-3 py-3 first:pt-0"><span className="flex items-center gap-2.5 text-xs text-muted-foreground"><PanelsTopLeft className="h-4 w-4" />Published widgets</span><span className="text-sm font-semibold tabular-nums">{stats.publishedWidgets}<ArrowRight className="ml-1 inline h-3.5 w-3.5 text-muted-foreground" /></span></Link>
              <Link to="/case-studies" className="flex items-center justify-between gap-3 py-3"><span className="flex items-center gap-2.5 text-xs text-muted-foreground"><FileText className="h-4 w-4" />Published case studies</span><span className="text-sm font-semibold tabular-nums">{stats.publishedCaseStudies}<ArrowRight className="ml-1 inline h-3.5 w-3.5 text-muted-foreground" /></span></Link>
              <Link to="/social-posts" className="flex items-center justify-between gap-3 py-3 last:pb-0"><span className="flex items-center gap-2.5 text-xs text-muted-foreground"><Share2 className="h-4 w-4" />Social posts created</span><span className="text-sm font-semibold tabular-nums">{stats.socialPostCount}<ArrowRight className="ml-1 inline h-3.5 w-3.5 text-muted-foreground" /></span></Link>
              <Link to="/analytics" className="flex items-center justify-between gap-3 py-3 last:pb-0"><span className="flex items-center gap-2.5 text-xs text-muted-foreground"><MousePointerClick className="h-4 w-4" />Widget views / clicks</span><span className="text-sm font-semibold tabular-nums">{stats.widgetViews.toLocaleString()} / {stats.widgetClicks.toLocaleString()}<ArrowRight className="ml-1 inline h-3.5 w-3.5 text-muted-foreground" /></span></Link>
            </div>
          </Card>
        </div>
      </section>
    </AppShell>
  );
};

const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, { label: string; className: string }> = {
    pending: { label: "Pending", className: "border-amber-200 bg-amber-50 text-amber-800" },
    ai_rewritten: { label: "AI rewritten", className: "border-stone-200 bg-stone-100 text-stone-800" },
    approved: { label: "Approved", className: "border-emerald-200 bg-emerald-50 text-emerald-800" },
    published: { label: "Published", className: "border-emerald-200 bg-emerald-50 text-emerald-800" },
    rejected: { label: "Rejected", className: "border-rose-200 bg-rose-50 text-rose-800" },
    declined: { label: "Declined", className: "border-rose-200 bg-rose-50 text-rose-800" },
  };
  const badge = map[status] || map.pending;
  return <span className={`inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-1 text-[10px] font-semibold ${badge.className}`}>{badge.label}</span>;
};

export default Dashboard;
