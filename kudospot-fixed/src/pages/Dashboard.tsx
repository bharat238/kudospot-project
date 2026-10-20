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
import type { Tables } from "@/integrations/supabase/types";

type DashboardForm = Pick<Tables<"collection_forms">, "id" | "form_name" | "public_slug" | "is_active" | "created_at">;
type DashboardWidget = Pick<Tables<"widgets">, "id" | "widget_name" | "is_published" | "views" | "clicks">;
type DashboardCaseStudy = Pick<Tables<"case_studies">, "id" | "title" | "is_published" | "views">;
type DashboardSocialPost = Pick<Tables<"social_posts">, "id" | "status" | "created_at">;
type DashboardProfile = Pick<Tables<"profiles">, "full_name" | "business_name" | "onboarding_completed">;

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
  const [forms, setForms] = useState<DashboardForm[]>([]);
  const [widgets, setWidgets] = useState<DashboardWidget[]>([]);
  const [caseStudies, setCaseStudies] = useState<DashboardCaseStudy[]>([]);
  const [socialPosts, setSocialPosts] = useState<DashboardSocialPost[]>([]);
  const [profile, setProfile] = useState<DashboardProfile | null>(null);
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
    approved: testimonials.filter((item) => item.approval_status === "approved").length,
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
    { label: "Needs review", value: stats.pending, description: "Ready for your next step", icon: Clock, cardClass: "border-[#c94320] bg-[#c94320] text-white", labelClass: "text-white/85", valueClass: "text-white", descriptionClass: "text-white/80", iconClass: "bg-white/20 text-white" },
    { label: "AI rewritten", value: stats.rewritten, description: "Ready to review", icon: Sparkles, cardClass: "bg-white text-foreground", labelClass: "text-[#77756f]", valueClass: "text-[#242420]", descriptionClass: "text-[#77756f]", iconClass: "bg-[#f0efeb] text-[#53524c]" },
    { label: "Customer approved", value: stats.approved, description: "Cleared to showcase", icon: CheckCircle2, cardClass: "bg-white text-foreground", labelClass: "text-[#77756f]", valueClass: "text-[#242420]", descriptionClass: "text-[#77756f]", iconClass: "bg-[#e8f4ed] text-[#27724c]" },
    { label: "Published widgets", value: stats.publishedWidgets, description: "Showing social proof", icon: PanelsTopLeft, cardClass: "bg-white text-foreground", labelClass: "text-[#77756f]", valueClass: "text-[#242420]", descriptionClass: "text-[#77756f]", iconClass: "bg-[#f9e9e0] text-[#a83a1c]" },
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

      <section aria-label="Workspace overview" className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-12">
        <Card className="rounded-[20px] border-[#e7e5e0] bg-white p-5 shadow-[0_2px_8px_rgba(25,24,20,0.035)] sm:p-6 xl:col-span-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-[#77756f]">Testimonial library</p>
              <p className="mt-2 text-[32px] font-semibold leading-none tracking-tight text-[#242420] tabular-nums">{stats.total.toLocaleString()}</p>
              <p className="mt-2 text-xs text-[#77756f]">Customer stories collected</p>
            </div>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f0efeb] text-[#55534d]"><MessageSquareQuote className="h-[17px] w-[17px]" /></span>
          </div>
          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between gap-2 text-[11px]">
              <span className="font-medium text-[#55534d]">Customer approval progress</span>
              <span className="font-semibold tabular-nums text-[#242420]">{stats.total ? Math.round((stats.approved / stats.total) * 100) : 0}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[#eeede9]">
              <div className="h-full rounded-full bg-[#e65a30] transition-all" style={{ width: (stats.total ? Math.round((stats.approved / stats.total) * 100) : 0) + "%" }} />
            </div>
            <div className="mt-3 flex items-center justify-between text-[11px] text-[#77756f]">
              <span>{stats.approved} approved</span><span>{stats.total - stats.approved} not approved yet</span>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <Link to="/testimonials" className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-full bg-[#242420] px-3 text-xs font-semibold text-white transition hover:bg-[#3a3934]"><MessageSquareQuote className="h-3.5 w-3.5" />Manage stories</Link>
            <Link to="/collect" className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-full border border-[#e4e2dc] bg-white px-3 text-xs font-semibold text-[#484741] transition hover:bg-[#f5f4f1]"><Plus className="h-3.5 w-3.5" />New form</Link>
          </div>
        </Card>

        <div className="grid grid-cols-2 gap-3 xl:col-span-4">
          {statCards.map((stat) => (
            <Card key={stat.label} className={"min-w-0 rounded-[18px] border-[#e7e5e0] p-4 shadow-[0_2px_8px_rgba(25,24,20,0.035)] sm:p-5 " + stat.cardClass}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className={"text-[11px] font-medium leading-4 sm:text-xs " + stat.labelClass}>{stat.label}</p>
                  <div className={"mt-2 text-[26px] font-semibold leading-none tracking-tight tabular-nums sm:text-[30px] " + stat.valueClass}>{stat.value.toLocaleString()}</div>
                </div>
                <div className={"flex h-8 w-8 shrink-0 items-center justify-center rounded-xl " + stat.iconClass}><stat.icon className="h-4 w-4" /></div>
              </div>
              <p className={"mt-2 text-[10px] leading-4 sm:text-[11px] " + stat.descriptionClass}>{stat.description}</p>
            </Card>
          ))}
        </div>

        <Card className="min-w-0 overflow-hidden rounded-[20px] border-[#e7e5e0] bg-white p-4 shadow-[0_2px_8px_rgba(25,24,20,0.035)] sm:p-5 xl:col-span-5">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold text-[#242420]">Collection activity</h2>
              <p className="mt-1 text-[11px] text-[#77756f] sm:text-xs">Testimonials collected vs customer-approved</p>
            </div>
            <span className="rounded-full border border-[#e7e5e0] bg-[#f8f7f4] px-3 py-1.5 text-[10px] font-medium text-[#68665f]">Last 6 months</span>
          </div>
          <div role="img" aria-label="Bar chart comparing testimonials collected and approved over the last six months" className="grid h-[150px] grid-cols-6 gap-2 border-b border-[#eceae6] px-1 sm:gap-3">
            {monthlyActivity.map((month) => (
              <div key={month.label} className="flex min-w-0 flex-col items-center justify-end">
                <div className="flex h-[118px] w-full max-w-[44px] items-end justify-center gap-1">
                  <div title={month.collected + " collected"} className="w-[42%] rounded-t-md bg-[#292925] transition-all" style={{ height: Math.max(3, (month.collected / chartMax) * 100) + "%" }} />
                  <div title={month.approved + " approved"} className="w-[42%] rounded-t-md bg-[#e65a30] transition-all" style={{ height: Math.max(3, (month.approved / chartMax) * 100) + "%" }} />
                </div>
                <span className="mt-2 pb-2 text-[10px] text-[#77756f]">{month.label}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] text-[#68665f] sm:text-[11px]">
            <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm bg-[#292925]" />Collected ({stats.total})</span>
            <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm bg-[#e65a30]" />Approved ({stats.approved})</span>
            <span className="ml-auto inline-flex items-center gap-1 text-[#77756f]"><TrendingUp className="h-3 w-3" />Live account totals</span>
          </div>
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <div className="space-y-4 xl:col-span-4">
          <Card className="rounded-[20px] border-[#e7e5e0] bg-white p-5 shadow-[0_2px_8px_rgba(25,24,20,0.035)] sm:p-6">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div><h2 className="text-base font-semibold text-[#242420]">Active collection form</h2><p className="mt-1 text-[11px] text-[#77756f]">Share a link to collect customer feedback</p></div>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#fff0e9] text-[#a83a1c]"><Inbox className="h-4 w-4" /></span>
            </div>
            {activeForm ? (
              <>
                <div className="mb-3 flex items-center justify-between gap-3"><span className="truncate text-sm font-semibold text-[#34332f]">{activeForm.form_name || "Customer feedback form"}</span><span className="rounded-full bg-[#e8f4ed] px-2 py-1 text-[10px] font-semibold text-[#27724c]">Active</span></div>
                {collectionUrl && <div className="mb-4 rounded-xl border border-[#e7e5e0] bg-[#f8f7f4] px-3 py-2.5 text-[11px] text-[#77756f] break-all">{collectionUrl.replace(/^https?:\/\//, "")}</div>}
                <div className="flex gap-2"><Button size="sm" className="h-9 flex-1 rounded-full bg-[#242420] text-white hover:bg-[#3a3934]" onClick={copyCollectionUrl}><Copy className="mr-1 h-3.5 w-3.5" />Copy link</Button><Button size="sm" variant="outline" className="h-9 rounded-full border-[#e4e2dc]" asChild><a href={collectionUrl || "/collect"} target="_blank" rel="noreferrer"><ExternalLink className="mr-1 h-3.5 w-3.5" />Open</a></Button></div>
              </>
            ) : (
              <div className="rounded-xl border border-dashed border-[#dedcd7] bg-[#faf9f7] px-4 py-5 text-center"><p className="text-sm font-medium text-[#34332f]">No collection form yet</p><p className="mt-1 text-xs leading-5 text-[#77756f]">Create a shareable form to start gathering feedback.</p><Link to="/collect"><Button size="sm" className="mt-4 rounded-full bg-[#242420] text-white hover:bg-[#3a3934]"><Plus className="mr-1 h-3.5 w-3.5" />Create form</Button></Link></div>
            )}
          </Card>

          <Card className="rounded-[20px] border-[#e7e5e0] bg-white p-5 shadow-[0_2px_8px_rgba(25,24,20,0.035)] sm:p-6">
            <div className="mb-3 flex items-center justify-between gap-3"><div><h2 className="text-base font-semibold text-[#242420]">Quick actions</h2><p className="mt-1 text-[11px] text-[#77756f]">Keep customer proof moving</p></div><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f0efeb] text-[#55534d]"><ArrowUpRight className="h-4 w-4" /></span></div>
            <div className="space-y-1">
              {quickActions.map((action) => (
                <Link key={action.to} to={action.to} className="group flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-[#f6f5f2]">
                  <span className={"flex h-9 w-9 shrink-0 items-center justify-center rounded-xl " + action.tint}><action.icon className="h-4 w-4" /></span>
                  <span className="min-w-0 flex-1"><span className="block text-xs font-semibold text-[#34332f]">{action.title}</span><span className="mt-0.5 block text-[10px] text-[#77756f]">{action.description}</span></span>
                  <ArrowRight className="h-3.5 w-3.5 shrink-0 text-[#85827b] transition group-hover:translate-x-0.5" />
                </Link>
              ))}
            </div>
          </Card>

          <Card className="rounded-[20px] border-[#e7e5e0] bg-white p-5 shadow-[0_2px_8px_rgba(25,24,20,0.035)] sm:p-6">
            <div className="mb-3 flex items-center justify-between gap-3"><div><h2 className="text-base font-semibold text-[#242420]">Published social proof</h2><p className="mt-1 text-[11px] text-[#77756f]">Your stories in use</p></div><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#fff0e9] text-[#a83a1c]"><Heart className="h-4 w-4" /></span></div>
            <div className="divide-y divide-[#eeece7]">
              <Link to="/widgets" className="flex items-center justify-between gap-3 py-3 first:pt-0"><span className="flex items-center gap-2 text-xs text-[#68665f]"><PanelsTopLeft className="h-4 w-4" />Published widgets</span><span className="text-sm font-semibold tabular-nums text-[#242420]">{stats.publishedWidgets}<ArrowRight className="ml-1 inline h-3.5 w-3.5 text-[#85827b]" /></span></Link>
              <Link to="/case-studies" className="flex items-center justify-between gap-3 py-3"><span className="flex items-center gap-2 text-xs text-[#68665f]"><FileText className="h-4 w-4" />Published case studies</span><span className="text-sm font-semibold tabular-nums text-[#242420]">{stats.publishedCaseStudies}<ArrowRight className="ml-1 inline h-3.5 w-3.5 text-[#85827b]" /></span></Link>
              <Link to="/social-posts" className="flex items-center justify-between gap-3 py-3 last:pb-0"><span className="flex items-center gap-2 text-xs text-[#68665f]"><Share2 className="h-4 w-4" />Social posts created</span><span className="text-sm font-semibold tabular-nums text-[#242420]">{stats.socialPostCount}<ArrowRight className="ml-1 inline h-3.5 w-3.5 text-[#85827b]" /></span></Link>
              <Link to="/analytics" className="flex items-center justify-between gap-3 py-3 last:pb-0"><span className="flex items-center gap-2 text-xs text-[#68665f]"><MousePointerClick className="h-4 w-4" />Widget views / clicks</span><span className="text-sm font-semibold tabular-nums text-[#242420]">{stats.widgetViews.toLocaleString()} / {stats.widgetClicks.toLocaleString()}<ArrowRight className="ml-1 inline h-3.5 w-3.5 text-[#85827b]" /></span></Link>
            </div>
          </Card>
        </div>

        <Card className="min-w-0 overflow-hidden rounded-[20px] border-[#e7e5e0] bg-white shadow-[0_2px_8px_rgba(25,24,20,0.035)] xl:col-span-8">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#eceae6] px-5 py-4 sm:px-6">
            <div><h2 className="text-base font-semibold text-[#242420] sm:text-lg">Recent testimonials</h2><p className="mt-1 text-[11px] text-[#77756f] sm:text-xs">Latest customer feedback and its approval status</p></div>
            <Link to="/testimonials" className="inline-flex items-center gap-1 rounded-full border border-[#e7e5e0] bg-white px-3 py-1.5 text-[11px] font-semibold text-[#484741] transition hover:bg-[#f5f4f1]">View all <ArrowRight className="h-3.5 w-3.5" /></Link>
          </div>
          {testimonials.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fff0e9] text-[#a83a1c]"><MessageSquareQuote className="h-5 w-5" /></div>
              <p className="font-medium text-[#34332f]">Your first customer story starts here.</p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-[#77756f]">Add a testimonial or create a collection form to start building your social proof library.</p>
              <div className="mt-5 flex flex-wrap justify-center gap-2"><Link to="/testimonials"><Button size="sm" className="rounded-full bg-[#242420] text-white hover:bg-[#3a3934]"><Plus className="mr-1 h-3.5 w-3.5" />Add testimonial</Button></Link><Link to="/collect"><Button size="sm" variant="outline" className="rounded-full border-[#e4e2dc]">Create a form</Button></Link></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[580px] border-collapse text-left">
                <thead><tr className="bg-[#f7f6f3] text-[10px] font-medium uppercase tracking-[0.1em] text-[#77756f]"><th className="px-5 py-3 sm:px-6">Customer</th><th className="px-4 py-3">Feedback</th><th className="px-4 py-3">Added</th><th className="px-5 py-3 sm:px-6">Status</th></tr></thead>
                <tbody>
                  {testimonials.slice(0, 7).map((item) => (
                    <tr key={item.id} className="border-t border-[#eeece7] align-middle transition hover:bg-[#faf9f7]">
                      <td className="px-5 py-3 sm:px-6"><div className="flex items-center gap-2.5"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#fff0e9] text-xs font-semibold text-[#a83a1c]">{item.customer_name?.trim()?.[0]?.toUpperCase() || "?"}</span><div className="min-w-0"><div className="max-w-[150px] truncate text-xs font-semibold text-[#34332f]">{item.customer_name || "Customer"}</div><div className="max-w-[150px] truncate text-[10px] text-[#77756f]">{[item.customer_role, item.customer_company].filter(Boolean).join(" · ") || "Customer"}</div></div></div></td>
                      <td className="max-w-[260px] px-4 py-3"><p className="line-clamp-2 text-xs leading-5 text-[#68665f]">{item.approved_text || item.ai_rewritten_text || item.original_text}</p></td>
                      <td className="whitespace-nowrap px-4 py-3 text-[10px] text-[#77756f]">{new Date(item.created_at).toLocaleDateString("en", { month: "short", day: "numeric" })}</td>
                      <td className="px-5 py-3 sm:px-6"><StatusBadge status={item.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
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
