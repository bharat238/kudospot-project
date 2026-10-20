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
  ArrowRight, MousePointerClick, Loader2, AlertCircle, Search, Filter
} from "lucide-react";
import { OnboardingWizard } from "@/components/OnboardingWizard";
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

const getDashboardTestimonialStatus = (item: Testimonial): string => {
  if (item.approval_status === "approved") return "customer_approved";
  if (item.approval_status === "declined" || item.status === "declined" || item.status === "rejected") return "declined";
  if (item.approval_status === "sent") return "awaiting_customer";
  if (item.status === "ai_rewritten" || Boolean(item.ai_rewritten_text)) return "ai_rewritten";
  if (item.status === "approved") return "needs_customer_approval";
  return "pending";
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
  const [recentSearch, setRecentSearch] = useState("");
  const [recentStatus, setRecentStatus] = useState("all");
  const [activityRange, setActivityRange] = useState("6");

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
    const monthCount = Number(activityRange);
    return Array.from({ length: monthCount }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (monthCount - 1 - index), 1);
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
  }, [testimonials, activityRange]);

  const periodCollected = monthlyActivity.reduce((sum, month) => sum + month.collected, 0);
  const periodApproved = monthlyActivity.reduce((sum, month) => sum + month.approved, 0);
  const chartMax = Math.max(1, ...monthlyActivity.flatMap((month) => [month.collected, month.approved]));
  const displayName = profile?.full_name?.trim()?.split(/\s+/)[0] || String(user?.user_metadata?.full_name || "").split(/\s+/)[0] || user?.email?.split("@")[0] || "there";
  const activeForm = forms.find((form) => form.is_active);
  const collectionUrl = activeForm?.public_slug ? `${window.location.origin}/collect/${activeForm.public_slug}` : null;

  const recentRows = testimonials.filter((item) => {
    const searchable = [item.customer_name, item.customer_role, item.customer_company, item.original_text, item.ai_rewritten_text, item.approved_text].filter(Boolean).join(" ").toLowerCase();
    const normalizedStatus = getDashboardTestimonialStatus(item);
    const matchesSearch = searchable.includes(recentSearch.trim().toLowerCase());
    const matchesStatus = recentStatus === "all" || normalizedStatus === recentStatus;
    return matchesSearch && matchesStatus;
  }).slice(0, 7);

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

  const quickActions = [
    { to: "/collect", title: "Collect feedback", description: "Create or share a form", icon: Inbox, tint: "bg-[#f0f7d8] text-[#333e1d]" },
    { to: "/widgets", title: "Showcase widgets", description: "Display reviews on your site", icon: PanelsTopLeft, tint: "bg-[#f1f2f5] text-[#454953]" },
    { to: "/case-studies", title: "Build a case study", description: "Turn a customer win into a story", icon: FileText, tint: "bg-[#f1f2f5] text-[#454953]" },
    { to: "/social-posts", title: "Create social content", description: "Prepare a testimonial post", icon: Share2, tint: "bg-[#f0f7d8] text-[#333e1d]" },
  ];

  return (
    <AppShell>
      <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#e4e7dd] bg-white px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.13em] text-[#62675a]">
            <span className="h-2 w-2 rounded-full bg-[#bbeb43]" /> Workspace overview
          </div>
          <h1 className="text-[30px] font-semibold leading-tight tracking-[-0.045em] text-[#202126] sm:text-[36px]">Good morning, {displayName}.</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#777c85]">Stay on top of your customer stories, approvals and published social proof.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/collect"><Button variant="outline" className="h-10 rounded-full border-[#dfe2e7] bg-white px-4 text-xs font-semibold text-[#333740] hover:bg-[#f4f5f7]"><Inbox className="mr-2 h-4 w-4" />Collect feedback</Button></Link>
          <Link to="/testimonials"><Button className="h-10 rounded-full bg-[#202126] px-4 text-xs font-semibold text-white hover:bg-[#383b43]"><Plus className="mr-2 h-4 w-4" />Add testimonial</Button></Link>
        </div>
      </div>

      <section aria-label="Workspace overview" className="mb-4 grid grid-cols-1 gap-3.5 xl:grid-cols-12">
        <Card className="min-w-0 rounded-[22px] border-[#e6e8ed] bg-white p-5 shadow-[0_3px_14px_rgba(36,40,50,0.035)] sm:p-6 xl:col-span-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-[#777c85]">Testimonial library</p>
              <p className="mt-2 text-[34px] font-semibold leading-none tracking-tight text-[#202126] tabular-nums">{stats.total.toLocaleString()}</p>
              <p className="mt-2 text-[11px] text-[#777c85]">Stories collected in your workspace</p>
            </div>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#f0f2f5] text-[#454953]"><MessageSquareQuote className="h-[17px] w-[17px]" /></span>
          </div>
          <div className="mt-5 rounded-2xl bg-[#f7f8f4] p-3.5">
            <div className="mb-2 flex items-center justify-between gap-2"><span className="text-[11px] font-medium text-[#5f6456]">Customer approval progress</span><span className="text-xs font-semibold tabular-nums text-[#252820]">{stats.total ? Math.round((stats.approved / stats.total) * 100) : 0}%</span></div>
            <div className="h-2 overflow-hidden rounded-full bg-[#e7e9e1]"><div className="h-full rounded-full bg-[#c8f34c] transition-all" style={{ width: (stats.total ? Math.round((stats.approved / stats.total) * 100) : 0) + "%" }} /></div>
            <div className="mt-2 flex items-center justify-between text-[10px] text-[#777c70]"><span>{stats.approved} approved</span><span>{Math.max(0, stats.total - stats.approved)} remaining</span></div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-[#eaecf0] p-3"><span className="flex items-center gap-1.5 text-[10px] font-medium text-[#777c85]"><Clock className="h-3 w-3" />Needs attention</span><p className="mt-1.5 text-xl font-semibold tabular-nums text-[#202126]">{stats.pending.toLocaleString()}</p></div>
            <div className="rounded-xl border border-[#eaecf0] p-3"><span className="flex items-center gap-1.5 text-[10px] font-medium text-[#777c85]"><Sparkles className="h-3 w-3" />AI rewritten</span><p className="mt-1.5 text-xl font-semibold tabular-nums text-[#202126]">{stats.rewritten.toLocaleString()}</p></div>
          </div>
          <Link to="/testimonials" className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-[#333b20] underline decoration-[#c4e969] decoration-2 underline-offset-4 hover:text-[#11130e">Review testimonial library <ArrowRight className="h-3.5 w-3.5" /></Link>
        </Card>

        <Card className="min-w-0 overflow-hidden rounded-[22px] border-[#e6e8ed] bg-white p-5 shadow-[0_3px_14px_rgba(36,40,50,0.035)] sm:p-6 xl:col-span-6">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div><h2 className="text-base font-semibold text-[#202126]">Collection activity</h2><p className="mt-1 text-[11px] leading-5 text-[#777c85] sm:text-xs">Compare customer stories collected with those approved over time.</p></div>
            <label className="flex h-8 items-center gap-2 rounded-full border border-[#e7e9ed] bg-[#fafbfc] px-3 text-[10px] font-medium text-[#777c85]">
              <span>Period</span>
              <select aria-label="Activity chart time range" value={activityRange} onChange={(event) => setActivityRange(event.target.value)} className="max-w-[112px] bg-transparent text-[10px] font-semibold text-[#444851] outline-none">
                <option value="3">3 months</option>
                <option value="6">6 months</option>
                <option value="12">12 months</option>
              </select>
            </label>
          </div>
          <div className="relative">
            <div className="pointer-events-none absolute inset-0 flex flex-col justify-between pb-7 pt-1" aria-hidden="true"><div className="border-t border-dashed border-[#eceef1]" /><div className="border-t border-dashed border-[#eceef1]" /><div className="border-t border-dashed border-[#eceef1]" /><div className="border-t border-[#e7e9ed]" /></div>
            <div role="img" aria-label={`Bar chart comparing testimonials collected and approved over the last ${activityRange} months`} className="relative grid h-[170px] gap-2 px-1 sm:gap-4" style={{ gridTemplateColumns: `repeat(${monthlyActivity.length}, minmax(0, 1fr))` }}>
              {monthlyActivity.map((month) => (
                <div key={month.label} className="flex min-w-0 flex-col items-center justify-end"><div className="flex h-[138px] w-full max-w-[48px] items-end justify-center gap-1.5"><div title={month.collected + " collected"} className="w-[42%] rounded-t-md bg-[#26282e] transition-all" style={{ height: Math.max(3, (month.collected / chartMax) * 100) + "%" }} /><div title={month.approved + " approved"} className="w-[42%] rounded-t-md bg-[#c8f34c] transition-all" style={{ height: Math.max(3, (month.approved / chartMax) * 100) + "%" }} /></div><span className="mt-2 pb-1 text-[10px] text-[#777c85]">{month.label}</span></div>
              ))}
            </div>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-[#eff0f3] pt-3 text-[10px] text-[#686d77] sm:text-[11px]"><span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm bg-[#26282e]" />Collected ({periodCollected})</span><span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm bg-[#c8f34c]" />Customer approved ({periodApproved})</span><span className="ml-auto inline-flex items-center gap-1.5 text-[#777c85]"><TrendingUp className="h-3 w-3" />From your account</span></div>
        </Card>

        <Card className="min-w-0 rounded-[22px] border-[#e6e8ed] bg-white p-5 shadow-[0_3px_14px_rgba(36,40,50,0.035)] sm:p-6 xl:col-span-3">
          <div className="mb-4 flex items-center justify-between gap-3"><div><h2 className="text-base font-semibold text-[#202126]">Workflow progress</h2><p className="mt-1 text-[11px] text-[#777c85]">Your proof, at a glance</p></div><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#eaffae] text-[#29321a]"><CheckCircle2 className="h-4 w-4" /></span></div>
          <div className="space-y-1">
            <Link to="/testimonials" className="flex items-center gap-3 rounded-xl px-2 py-3 transition-colors hover:bg-[#f7f8f5]"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#fff5d6] text-[#78682a]"><Clock className="h-3.5 w-3.5" /></span><span className="min-w-0 flex-1"><span className="block text-xs font-semibold text-[#30333a]">Needs attention</span><span className="mt-1 block text-[10px] text-[#777c85]">Testimonials awaiting your next step</span></span><span className="text-sm font-semibold tabular-nums text-[#202126]">{stats.pending}</span></Link>
            <div className="border-t border-[#eff0f3]" />
            <Link to="/collect" className="flex items-center gap-3 rounded-xl px-2 py-3 transition-colors hover:bg-[#f7f8f5]"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#eff6d7] text-[#3b4923]"><Inbox className="h-3.5 w-3.5" /></span><span className="min-w-0 flex-1"><span className="block text-xs font-semibold text-[#30333a]">Active forms</span><span className="mt-1 block text-[10px] text-[#777c85]">Links ready to share</span></span><span className="text-sm font-semibold tabular-nums text-[#202126]">{stats.activeForms}</span></Link>
            <div className="border-t border-[#eff0f3]" />
            <Link to="/widgets" className="flex items-center gap-3 rounded-xl px-2 py-3 transition-colors hover:bg-[#f7f8f5]"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#eef0f4] text-[#484c55]"><PanelsTopLeft className="h-3.5 w-3.5" /></span><span className="min-w-0 flex-1"><span className="block text-xs font-semibold text-[#30333a]">Published widgets</span><span className="mt-1 block text-[10px] text-[#777c85]">Website-ready social proof</span></span><span className="text-sm font-semibold tabular-nums text-[#202126]">{stats.publishedWidgets}</span></Link>
            <div className="border-t border-[#eff0f3]" />
            <Link to="/analytics" className="flex items-center gap-3 rounded-xl px-2 py-3 transition-colors hover:bg-[#f7f8f5]"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#eff6d7] text-[#3b4923]"><MousePointerClick className="h-3.5 w-3.5" /></span><span className="min-w-0 flex-1"><span className="block text-xs font-semibold text-[#30333a]">Widget interactions</span><span className="mt-1 block text-[10px] text-[#777c85]">Tracked views and clicks</span></span><span className="text-sm font-semibold tabular-nums text-[#202126]">{stats.widgetClicks.toLocaleString()}</span></Link>
          </div>
          <Link to="/analytics" className="mt-3 flex h-9 items-center justify-center gap-2 rounded-full border border-[#e6e8ed] bg-[#fafbfc] text-xs font-semibold text-[#444851] transition-colors hover:bg-[#f1f2f4]">View analytics <ArrowRight className="h-3.5 w-3.5" /></Link>
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-3.5 xl:grid-cols-12">
        <Card className="min-w-0 rounded-[22px] border-[#e6e8ed] bg-white p-5 shadow-[0_3px_14px_rgba(36,40,50,0.035)] sm:p-6 xl:col-span-4">
          <div className="mb-4 flex items-start justify-between gap-3"><div><h2 className="text-base font-semibold text-[#202126]">Collection form</h2><p className="mt-1 text-[11px] leading-5 text-[#777c85]">A shareable link customers can use to send feedback.</p></div><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#eaffae] text-[#2e391b]"><Heart className="h-4 w-4" /></span></div>
          {activeForm ? (
            <>
              <div className="mb-3 flex items-center justify-between gap-3"><span className="truncate text-sm font-semibold text-[#30333a]">{activeForm.form_name || "Customer feedback form"}</span><span className="rounded-full bg-[#eaffae] px-2.5 py-1 text-[10px] font-semibold text-[#333d21]">Active</span></div>
              {collectionUrl && <div className="mb-4 rounded-xl border border-[#e8eaed] bg-[#f7f8fa] px-3 py-2.5 text-[11px] text-[#696e78] break-all">{collectionUrl.replace(/^https?:\/\//, "")}</div>}
              <div className="flex gap-2"><Button size="sm" className="h-9 flex-1 rounded-full bg-[#202126] text-white hover:bg-[#383b43]" onClick={copyCollectionUrl}><Copy className="mr-1.5 h-3.5 w-3.5" />Copy form link</Button><Button size="sm" variant="outline" className="h-9 rounded-full border-[#e1e4e9]" asChild><a href={collectionUrl || "/collect"} target="_blank" rel="noreferrer"><ExternalLink className="mr-1.5 h-3.5 w-3.5" />Open</a></Button></div>
            </>
          ) : (
            <div className="rounded-xl border border-dashed border-[#dfe2e7] bg-[#fafbfc] px-4 py-6 text-center"><p className="text-sm font-medium text-[#30333a]">No collection form yet</p><p className="mt-1 text-xs leading-5 text-[#777c85]">Create a form to start gathering real customer stories.</p><Link to="/collect"><Button size="sm" className="mt-4 rounded-full bg-[#202126] text-white hover:bg-[#383b43]"><Plus className="mr-1.5 h-3.5 w-3.5" />Create form</Button></Link></div>
          )}
          <div className="mt-5 border-t border-[#eef0f3] pt-4"><div className="mb-3 flex items-center justify-between"><p className="text-xs font-semibold text-[#3b3e45]">Quick actions</p><ArrowUpRight className="h-4 w-4 text-[#7f848d]" /></div><div className="space-y-1">
            {quickActions.map((action) => (<Link key={action.to} to={action.to} className="group flex items-center gap-2.5 rounded-xl px-2 py-2 transition-colors hover:bg-[#f5f6f3]"><span className={"flex h-8 w-8 shrink-0 items-center justify-center rounded-lg " + action.tint}><action.icon className="h-3.5 w-3.5" /></span><span className="min-w-0 flex-1"><span className="block text-[11px] font-semibold text-[#30333a]">{action.title}</span><span className="mt-0.5 block text-[10px] text-[#777c85]">{action.description}</span></span><ArrowRight className="h-3.5 w-3.5 shrink-0 text-[#888d96] transition group-hover:translate-x-0.5" /></Link>))}
          </div></div>
        </Card>

        <Card className="min-w-0 overflow-hidden rounded-[22px] border-[#e6e8ed] bg-white shadow-[0_3px_14px_rgba(36,40,50,0.035)] xl:col-span-5">
          <div className="flex flex-col gap-3 border-b border-[#eceef2] px-5 py-4 sm:px-6">
            <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-base font-semibold text-[#202126] sm:text-lg">Recent testimonials</h2><p className="mt-1 text-[11px] text-[#777c85] sm:text-xs">Latest feedback from your workspace</p></div><Link to="/testimonials" className="inline-flex h-8 items-center gap-1 rounded-full border border-[#e7e9ed] bg-white px-3 text-[10px] font-semibold text-[#444851] transition hover:bg-[#f4f5f7]">View all <ArrowRight className="h-3.5 w-3.5" /></Link></div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex h-9 min-w-[145px] flex-1 items-center gap-2 rounded-full border border-[#e7e9ed] bg-[#fbfbfc] px-3 text-[#858a94] sm:min-w-[170px]"><Search className="h-3.5 w-3.5 shrink-0" /><input aria-label="Search recent testimonials" value={recentSearch} onChange={(event) => setRecentSearch(event.target.value)} placeholder="Search stories" className="min-w-0 w-full bg-transparent text-[11px] text-[#343740] outline-none placeholder:text-[#969ba4]" /></label>
              <label className="flex h-9 items-center gap-1.5 rounded-full border border-[#e7e9ed] bg-white pl-3 pr-2 text-[#777c85]"><Filter className="h-3.5 w-3.5 shrink-0" /><select aria-label="Filter testimonials by status" value={recentStatus} onChange={(event) => setRecentStatus(event.target.value)} className="max-w-[120px] bg-transparent py-1 text-[11px] font-medium text-[#484c55] outline-none"><option value="all">All statuses</option><option value="pending">Pending</option><option value="ai_rewritten">AI rewritten</option><option value="needs_customer_approval">Needs approval</option><option value="awaiting_customer">Awaiting customer</option><option value="customer_approved">Customer approved</option><option value="declined">Declined</option></select></label>
            </div>
          </div>
          {testimonials.length === 0 ? (
            <div className="px-6 py-12 text-center"><div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eaffae] text-[#29321a]"><MessageSquareQuote className="h-5 w-5" /></div><p className="font-medium text-[#30333a]">Your first customer story starts here.</p><p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-[#777c85]">Add a testimonial or create a collection form to start building your social-proof library.</p><div className="mt-5 flex flex-wrap justify-center gap-2"><Link to="/testimonials"><Button size="sm" className="rounded-full bg-[#202126] text-white hover:bg-[#383b43]"><Plus className="mr-1.5 h-3.5 w-3.5" />Add testimonial</Button></Link><Link to="/collect"><Button size="sm" variant="outline" className="rounded-full border-[#e1e4e9]">Create a form</Button></Link></div></div>
          ) : (
            <div className="overflow-x-auto"><table className="w-full min-w-[490px] border-collapse text-left">
              <thead><tr className="bg-[#f7f8fa] text-[10px] font-medium uppercase tracking-[0.1em] text-[#777c85]"><th className="px-4 py-3 sm:px-5">Customer</th><th className="px-3 py-3">Feedback</th><th className="px-3 py-3">Added</th><th className="px-4 py-3 sm:px-5">Status</th></tr></thead>
              <tbody>
                {recentRows.length === 0 ? <tr><td colSpan={4} className="px-5 py-10 text-center text-xs text-[#777c85]">{recentSearch || recentStatus !== "all" ? "No testimonials match these filters." : "No testimonials yet."}</td></tr> : recentRows.slice(0, 8).map((item) => (
                  <tr key={item.id} className="border-t border-[#eff0f3] align-middle transition hover:bg-[#fafbfc]">
                    <td className="px-4 py-3 sm:px-5"><div className="flex items-center gap-2"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#eef0f3] text-xs font-semibold text-[#383b43]">{item.customer_name?.trim()?.[0]?.toUpperCase() || "?"}</span><div className="min-w-0"><div className="max-w-[120px] truncate text-[11px] font-semibold text-[#30333a]">{item.customer_name || "Customer"}</div><div className="max-w-[120px] truncate text-[10px] text-[#858a94]">{[item.customer_role, item.customer_company].filter(Boolean).join(" · ") || "Customer"}</div></div></div></td>
                    <td className="max-w-[190px] px-3 py-3"><p className="line-clamp-2 text-[11px] leading-5 text-[#696e78]">{item.approved_text || item.ai_rewritten_text || item.original_text}</p></td>
                    <td className="whitespace-nowrap px-3 py-3 text-[10px] text-[#858a94]">{new Date(item.created_at).toLocaleDateString("en", { month: "short", day: "numeric" })}</td>
                    <td className="px-4 py-3 sm:px-5"><StatusBadge status={getDashboardTestimonialStatus(item)} /></td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          )}
        </Card>

        <Card className="min-w-0 rounded-[22px] border-[#e6e8ed] bg-white p-5 shadow-[0_3px_14px_rgba(36,40,50,0.035)] sm:p-6 xl:col-span-3">
          <div className="mb-4 flex items-center justify-between gap-3"><div><h2 className="text-base font-semibold text-[#202126]">Published proof</h2><p className="mt-1 text-[11px] text-[#777c85]">Content ready to showcase</p></div><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#eaffae] text-[#29321a]"><Heart className="h-4 w-4" /></span></div>
          <div className="space-y-3">
            <Link to="/widgets" className="flex items-center gap-3 rounded-xl border border-[#eaecf0] p-3 transition-colors hover:bg-[#fafbfc]"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#f0f2f5] text-[#454953]"><PanelsTopLeft className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block text-[11px] font-semibold text-[#30333a]">Widgets published</span><span className="mt-1 block text-[10px] text-[#777c85]">Website embeds</span></span><span className="text-lg font-semibold tabular-nums text-[#202126]">{stats.publishedWidgets}</span></Link>
            <Link to="/case-studies" className="flex items-center gap-3 rounded-xl border border-[#eaecf0] p-3 transition-colors hover:bg-[#fafbfc]"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#f0f2f5] text-[#454953]"><FileText className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block text-[11px] font-semibold text-[#30333a]">Case studies</span><span className="mt-1 block text-[10px] text-[#777c85]">Customer success stories</span></span><span className="text-lg font-semibold tabular-nums text-[#202126]">{stats.publishedCaseStudies}</span></Link>
            <Link to="/social-posts" className="flex items-center gap-3 rounded-xl border border-[#eaecf0] p-3 transition-colors hover:bg-[#fafbfc]"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#f0f7d8] text-[#3c481e]"><Share2 className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block text-[11px] font-semibold text-[#30333a]">Social posts</span><span className="mt-1 block text-[10px] text-[#777c85]">Content created</span></span><span className="text-lg font-semibold tabular-nums text-[#202126]">{stats.socialPostCount}</span></Link>
          </div>
          <div className="mt-4 rounded-xl bg-[#f7f8f4] p-3.5"><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#777c70]">Widget activity</p><div className="mt-2 flex items-end justify-between gap-2"><div><p className="text-2xl font-semibold leading-none tabular-nums text-[#202126]">{stats.widgetViews.toLocaleString()}</p><p className="mt-1.5 text-[10px] text-[#777c85]">Total views</p></div><div className="text-right"><p className="text-lg font-semibold leading-none tabular-nums text-[#202126]">{stats.widgetClicks.toLocaleString()}</p><p className="mt-1.5 text-[10px] text-[#777c85]">Clicks</p></div></div></div>
          <Link to="/analytics" className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[#3d4825] underline decoration-[#c8f34c] decoration-2 underline-offset-4">See performance <ArrowRight className="h-3.5 w-3.5" /></Link>
        </Card>
      </section>
    </AppShell>
  );
};

const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, { label: string; className: string }> = {
    pending: { label: "Pending", className: "border-[#e6e8ed] bg-[#f1f2f5] text-[#626671]" },
    ai_rewritten: { label: "AI rewritten", className: "border-[#e6e8ed] bg-[#f1f2f5] text-[#50545e]" },
    needs_customer_approval: { label: "Needs approval", className: "border-[#e0e8bd] bg-[#f4f8e7] text-[#58613b]" },
    awaiting_customer: { label: "Awaiting customer", className: "border-[#e0e8bd] bg-[#f4f8e7] text-[#58613b]" },
    customer_approved: { label: "Customer approved", className: "border-[#d6e8aa] bg-[#f0f8d9] text-[#3d4b22]" },
    published: { label: "Published", className: "border-[#d6e8aa] bg-[#f0f8d9] text-[#3d4b22]" },
    rejected: { label: "Rejected", className: "border-[#f0d4d8] bg-[#fff0f2] text-[#9f3343]" },
    declined: { label: "Declined", className: "border-[#f0d4d8] bg-[#fff0f2] text-[#9f3343]" },
  };
  const badge = map[status] || map.pending;
  return <span className={`inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-1 text-[10px] font-semibold ${badge.className}`}>{badge.label}</span>;
};

export default Dashboard;
