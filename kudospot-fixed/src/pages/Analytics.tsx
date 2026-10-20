import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ComponentType } from "react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Eye, MousePointerClick, FileText, CheckCircle2, Download, TrendingUp, Loader2,
  Database, FileDown, RefreshCw, BarChart3, Send, AlertCircle, ArrowUpRight
} from "lucide-react";
import { toast } from "sonner";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from "recharts";

type AnalyticsEvent = {
  id: string;
  event_type: string;
  entity_id: string | null;
  entity_type: string | null;
  source: string | null;
  campaign: string | null;
  created_at: string;
  referrer: string | null;
};
type RangeKey = "7" | "30" | "90";
type DailyPoint = { date: string; submissions: number; approvals: number; widgetViews: number; caseViews: number };
type BackfillPhase = "idle" | "estimating" | "running" | "done" | "error";

const RANGES: { key: RangeKey; label: string }[] = [
  { key: "7", label: "7 days" },
  { key: "30", label: "30 days" },
  { key: "90", label: "90 days" },
];
const ALL = "__all__";
const NONE = "__none__";

function localDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
function shortDate(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en", { month: "short", day: "numeric" });
}

const Analytics = () => {
  const { user } = useAuth();
  const [range, setRange] = useState<RangeKey>("30");
  const [campaignFilter, setCampaignFilter] = useState(ALL);
  const [sourceFilter, setSourceFilter] = useState(ALL);
  const [events, setEvents] = useState<AnalyticsEvent[]>([]);
  const [profile, setProfile] = useState<{ business_name?: string | null; full_name?: string | null } | null>(null);
  const [widgetNames, setWidgetNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);
  const [backfillState, setBackfillState] = useState<{
    open: boolean; phase: BackfillPhase; total: number; processed: number; startedAt: number; etaSec: number; message?: string;
  }>({ open: false, phase: "idle", total: 0, processed: 0, startedAt: 0, etaSec: 0 });

  const loadEvents = useCallback(async () => {
    if (!user) {
      setEvents([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    const days = Number(range);
    const since = new Date();
    since.setHours(0, 0, 0, 0);
    since.setDate(since.getDate() - (days - 1));
    try {
      const [eventResult, profileResult, widgetResult] = await Promise.all([
        supabase.from("analytics_events")
          .select("id,event_type,entity_id,entity_type,source,campaign,created_at,referrer")
          .eq("user_id", user.id)
          .gte("created_at", since.toISOString())
          .order("created_at", { ascending: false })
          .limit(5000),
        supabase.from("profiles").select("business_name,full_name").eq("id", user.id).maybeSingle(),
        supabase.from("widgets").select("id,widget_name").eq("user_id", user.id),
      ]);
      if (eventResult.error) throw eventResult.error;
      setEvents((eventResult.data || []) as AnalyticsEvent[]);
      setProfile(profileResult.data);
      if (widgetResult.error) {
        console.warn("Widget labels couldn't be loaded:", widgetResult.error.message);
        setWidgetNames({});
      } else {
        const names: Record<string, string> = {};
        (widgetResult.data || []).forEach((widget) => { names[widget.id] = widget.widget_name || "Widget"; });
        setWidgetNames(names);
      }
    } catch (error) {
      console.error("Failed to load analytics:", error);
      setLoadError("We couldn't load your analytics right now. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, [user, range]);

  useEffect(() => { void loadEvents(); }, [loadEvents]);

  const filtered = useMemo(() => events.filter((event) => {
    const campaign = event.campaign || "";
    if (campaignFilter !== ALL && campaign !== (campaignFilter === NONE ? "" : campaignFilter)) return false;
    if (sourceFilter !== ALL) {
      const source = (event.source || "direct").replace(/^www\./, "");
      if (source !== sourceFilter) return false;
    }
    return true;
  }), [events, campaignFilter, sourceFilter]);

  const campaigns = useMemo(() => {
    const values = new Set<string>();
    let hasUntagged = false;
    for (const event of events) {
      if (event.campaign) values.add(event.campaign);
      else hasUntagged = true;
    }
    return { values: [...values].sort((a, b) => a.localeCompare(b)), hasUntagged };
  }, [events]);

  const sources = useMemo(() => [...new Set(events.map((event) => (event.source || "direct").replace(/^www\./, "")))].sort(), [events]);

  const stats = useMemo(() => {
    const count = (type: string) => filtered.filter((event) => event.event_type === type).length;
    const widgetViews = count("widget_view");
    const widgetClicks = count("widget_click");
    const formSubmissions = count("form_submit");
    const approvalsSent = count("approval_sent");
    const approvalsApproved = count("approval_approved");
    const approvalsRejected = count("approval_rejected");
    const caseViews = count("case_study_view");
    return {
      widgetViews, widgetClicks, formSubmissions, approvalsSent, approvalsApproved, approvalsRejected, caseViews,
      ctr: widgetViews > 0 ? Math.round((widgetClicks / widgetViews) * 1000) / 10 : 0,
      approvalRate: approvalsSent > 0 ? Math.min(100, Math.round((approvalsApproved / approvalsSent) * 100)) : 0,
    };
  }, [filtered]);

  const dailyData = useMemo(() => {
    const days = Number(range);
    const buckets: DailyPoint[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let offset = days - 1; offset >= 0; offset--) {
      const date = new Date(today);
      date.setDate(today.getDate() - offset);
      buckets.push({ date: localDateKey(date), submissions: 0, approvals: 0, widgetViews: 0, caseViews: 0 });
    }
    const index = new Map(buckets.map((bucket, position) => [bucket.date, position]));
    for (const event of filtered) {
      const position = index.get(localDateKey(new Date(event.created_at)));
      if (position === undefined) continue;
      if (event.event_type === "form_submit") buckets[position].submissions++;
      if (event.event_type === "approval_approved") buckets[position].approvals++;
      if (event.event_type === "widget_view") buckets[position].widgetViews++;
      if (event.event_type === "case_study_view") buckets[position].caseViews++;
    }
    return buckets.map((bucket) => ({ ...bucket, label: shortDate(bucket.date) }));
  }, [filtered, range]);

  const widgetChartData = useMemo(() => {
    const grouped: Record<string, { id: string; widget: string; views: number; clicks: number }> = {};
    for (const event of filtered) {
      if (event.event_type !== "widget_view" && event.event_type !== "widget_click") continue;
      const id = event.entity_id || "unknown";
      if (!grouped[id]) grouped[id] = { id, widget: widgetNames[id] || (id === "unknown" ? "Unknown widget" : `Widget ${id.slice(0, 6)}…`), views: 0, clicks: 0 };
      if (event.event_type === "widget_view") grouped[id].views++;
      else grouped[id].clicks++;
    }
    return Object.values(grouped).sort((a, b) => b.views - a.views).slice(0, 10);
  }, [filtered, widgetNames]);

  const bySource = useMemo(() => {
    const grouped: Record<string, { source: string; views: number; clicks: number; submissions: number; approvals: number }> = {};
    for (const event of filtered) {
      const source = (event.source || "direct").replace(/^www\./, "");
      if (!grouped[source]) grouped[source] = { source, views: 0, clicks: 0, submissions: 0, approvals: 0 };
      if (event.event_type.endsWith("_view")) grouped[source].views++;
      if (event.event_type === "widget_click") grouped[source].clicks++;
      if (event.event_type === "form_submit") grouped[source].submissions++;
      if (event.event_type === "approval_approved") grouped[source].approvals++;
    }
    return Object.values(grouped).sort((a, b) => b.views + b.submissions - a.views - a.submissions).slice(0, 12);
  }, [filtered]);

  const byCampaign = useMemo(() => {
    const grouped: Record<string, { campaign: string; views: number; submissions: number; approvals: number }> = {};
    for (const event of filtered) {
      const campaign = event.campaign || "(untagged)";
      if (!grouped[campaign]) grouped[campaign] = { campaign, views: 0, submissions: 0, approvals: 0 };
      if (event.event_type.endsWith("_view")) grouped[campaign].views++;
      if (event.event_type === "form_submit") grouped[campaign].submissions++;
      if (event.event_type === "approval_approved") grouped[campaign].approvals++;
    }
    return Object.values(grouped).sort((a, b) => b.approvals - a.approvals || b.submissions - a.submissions);
  }, [filtered]);

  const filterLabel = [
    campaignFilter !== ALL ? `Campaign: ${campaignFilter === NONE ? "untagged" : campaignFilter}` : null,
    sourceFilter !== ALL ? `Source: ${sourceFilter}` : null,
  ].filter(Boolean).join(" · ");

  const exportCSV = useCallback(() => {
    const rows: string[][] = [["Section", "Date / Source / Campaign", "Metric", "Value"]];
    for (const day of dailyData) {
      rows.push(["daily", day.date, "form_submissions", String(day.submissions)]);
      rows.push(["daily", day.date, "approvals", String(day.approvals)]);
      rows.push(["daily", day.date, "widget_views", String(day.widgetViews)]);
      rows.push(["daily", day.date, "case_study_views", String(day.caseViews)]);
    }
    for (const row of bySource) {
      rows.push(["source", row.source, "views", String(row.views)]);
      rows.push(["source", row.source, "clicks", String(row.clicks)]);
      rows.push(["source", row.source, "submissions", String(row.submissions)]);
      rows.push(["source", row.source, "approvals", String(row.approvals)]);
    }
    for (const row of byCampaign) {
      rows.push(["campaign", row.campaign, "views", String(row.views)]);
      rows.push(["campaign", row.campaign, "submissions", String(row.submissions)]);
      rows.push(["campaign", row.campaign, "approvals", String(row.approvals)]);
    }
    rows.push(["summary", "selected range and filters", "widget_views", String(stats.widgetViews)]);
    rows.push(["summary", "selected range and filters", "widget_clicks", String(stats.widgetClicks)]);
    rows.push(["summary", "selected range and filters", "approval_requests", String(stats.approvalsSent)]);
    rows.push(["summary", "selected range and filters", "approvals", String(stats.approvalsApproved)]);
    const csv = rows.map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blobUrl = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    const tag = [campaignFilter !== ALL ? campaignFilter : null, sourceFilter !== ALL ? sourceFilter : null].filter(Boolean).join("-") || "all";
    link.href = blobUrl;
    link.download = `kudospot-analytics-${range}d-${tag}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    toast.success("CSV report downloaded");
  }, [dailyData, bySource, byCampaign, stats, campaignFilter, sourceFilter, range]);

  const downloadPDF = useCallback(async () => {
    if (!reportRef.current) return toast.error("The report is still loading. Please try again.");
    setExporting(true);
    try {
      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([import("jspdf"), import("html2canvas")]);
      const canvas = await html2canvas(reportRef.current, { backgroundColor: "#f4f4f3", scale: 1.5, useCORS: true });
      const image = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "p", unit: "pt", format: "a4" });
      const margin = 28;
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imageWidth = pageWidth - margin * 2;
      const imageHeight = (canvas.height * imageWidth) / canvas.width;
      let offset = 0;
      while (offset < imageHeight) {
        if (offset > 0) pdf.addPage();
        pdf.addImage(image, "PNG", margin, margin - offset, imageWidth, imageHeight);
        offset += pageHeight - margin * 2;
      }
      const tag = [campaignFilter !== ALL ? campaignFilter : null, sourceFilter !== ALL ? sourceFilter : null].filter(Boolean).join("-") || "all";
      pdf.save(`kudospot-analytics-${range}d-${tag}-${new Date().toISOString().slice(0, 10)}.pdf`);
      toast.success("PDF report downloaded");
    } catch (error) {
      console.error("PDF export failed:", error);
      toast.error("The PDF couldn't be generated. Please try again or download the CSV.");
    } finally {
      setExporting(false);
    }
  }, [range, campaignFilter, sourceFilter]);

  const runBackfill = async () => {
    if (!user || backfillState.phase === "estimating" || backfillState.phase === "running") return;
    setBackfillState({ open: true, phase: "estimating", total: 0, processed: 0, startedAt: Date.now(), etaSec: 0 });
    let interval: number | undefined;
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) throw new Error("Your session expired. Please sign in again.");
      const baseUrl = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/backfill-analytics`;
      const dryResponse = await fetch(`${baseUrl}?dry_run=1`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      const dryData = await dryResponse.json();
      if (!dryResponse.ok) throw new Error(dryData?.error || "Could not estimate missing events.");
      const total = Number(dryData.total || 0);
      const etaSec = Math.max(2, Math.ceil(total / 600));
      if (total === 0) {
        setBackfillState((current) => ({ ...current, phase: "done", message: "Nothing to backfill. Your historical analytics are already current." }));
        return;
      }
      if (!window.confirm(`Rebuild approximately ${total.toLocaleString()} historical analytics events? This writes analytics data and may take about ${etaSec} seconds.`)) {
        setBackfillState({ open: false, phase: "idle", total: 0, processed: 0, startedAt: 0, etaSec: 0 });
        return;
      }
      setBackfillState({ open: true, phase: "running", total, processed: 0, startedAt: Date.now(), etaSec });
      interval = window.setInterval(() => {
        setBackfillState((current) => current.phase !== "running" ? current : {
          ...current, processed: Math.min(Math.floor(current.total * 0.95), Math.floor(current.total * ((Date.now() - current.startedAt) / 1000) / current.etaSec))
        });
      }, 250);
      const response = await fetch(baseUrl, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      const result = await response.json();
      if (!response.ok) throw new Error(result?.error || "Historical analytics could not be rebuilt.");
      setBackfillState((current) => ({ ...current, phase: "done", processed: result.inserted || current.total, total: result.inserted || current.total, message: result.skipped ? "No additional events were needed. Historical data was already present." : `Added ${Number(result.inserted || 0).toLocaleString()} historical events.` }));
      await loadEvents();
    } catch (error: any) {
      const message = error?.message || "Historical analytics could not be rebuilt.";
      setBackfillState((current) => ({ ...current, phase: "error", message }));
      toast.error(message);
    } finally {
      if (interval !== undefined) window.clearInterval(interval);
    }
  };

  const closeBackfill = (isOpen: boolean) => {
    if (!isOpen && backfillState.phase !== "running" && backfillState.phase !== "estimating") {
      setBackfillState({ open: false, phase: "idle", total: 0, processed: 0, startedAt: 0, etaSec: 0 });
    }
  };

  const maxFunnel = Math.max(1, stats.approvalsSent, stats.approvalsApproved, stats.approvalsRejected);
  const pageName = profile?.business_name || profile?.full_name || "KudoSpot";
  const hasEvents = filtered.length > 0;

  return (
    <AppShell>
      <div className="mb-6 flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
        <div><div className="mb-2 text-xs font-semibold uppercase tracking-[0.13em] text-muted-foreground">Performance</div><h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Analytics</h1><p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">Understand how customers engage with your testimonials, collection forms and published proof.</p></div>
        <div className="flex flex-wrap items-center gap-2">
          <Tabs value={range} onValueChange={(value) => setRange(value as RangeKey)}><TabsList>{RANGES.map((item) => <TabsTrigger key={item.key} value={item.key}>{item.label}</TabsTrigger>)}</TabsList></Tabs>
          <Button variant="outline" onClick={exportCSV} disabled={loading || !!loadError}><FileDown className="mr-2 h-4 w-4" />Export CSV</Button>
          <Button onClick={() => void downloadPDF()} disabled={exporting || loading || !!loadError} className="rounded-xl">{exporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}PDF report</Button>
        </div>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-border/80 bg-card p-3">
        <span className="px-1 text-xs font-semibold text-muted-foreground">Filter data</span>
        <div className="flex min-w-[190px] flex-1 items-center gap-2 sm:flex-none"><span className="text-xs text-muted-foreground">Campaign</span><Select value={campaignFilter} onValueChange={setCampaignFilter}><SelectTrigger className="h-9 min-w-0 flex-1 sm:w-44"><SelectValue /></SelectTrigger><SelectContent><SelectItem value={ALL}>All campaigns</SelectItem>{campaigns.hasUntagged && <SelectItem value={NONE}>Untagged</SelectItem>}{campaigns.values.map((campaign) => <SelectItem key={campaign} value={campaign}>{campaign}</SelectItem>)}</SelectContent></Select></div>
        <div className="flex min-w-[190px] flex-1 items-center gap-2 sm:flex-none"><span className="text-xs text-muted-foreground">Source</span><Select value={sourceFilter} onValueChange={setSourceFilter}><SelectTrigger className="h-9 min-w-0 flex-1 sm:w-44"><SelectValue /></SelectTrigger><SelectContent><SelectItem value={ALL}>All sources</SelectItem>{sources.map((source) => <SelectItem key={source} value={source}>{source}</SelectItem>)}</SelectContent></Select></div>
        {(campaignFilter !== ALL || sourceFilter !== ALL) && <Button size="sm" variant="ghost" className="ml-auto" onClick={() => { setCampaignFilter(ALL); setSourceFilter(ALL); }}>Clear filters</Button>}
      </div>

      {loadError ? (
        <Card className="rounded-2xl p-10 text-center"><AlertCircle className="mx-auto mb-3 h-8 w-8 text-destructive" /><h2 className="font-semibold">Analytics couldn't be loaded</h2><p className="mt-2 text-sm text-muted-foreground">{loadError}</p><Button variant="outline" className="mt-5" onClick={() => void loadEvents()}><RefreshCw className="mr-2 h-4 w-4" />Retry</Button></Card>
      ) : loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[0,1,2,3].map((key) => <Card key={key} className="animate-pulse rounded-2xl p-5"><div className="mb-4 h-4 w-2/3 rounded bg-muted" /><div className="mb-3 h-9 w-1/3 rounded bg-muted" /><div className="h-3 w-1/2 rounded bg-muted" /></Card>)}</div>
      ) : (
        <>
          <div ref={reportRef} className="space-y-5 bg-transparent">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard label="Widget views" value={stats.widgetViews} sub="In the selected period" icon={Eye} tint="orange" />
              <StatCard label="Widget clicks" value={stats.widgetClicks} sub={`${stats.ctr}% click-through rate`} icon={MousePointerClick} tint="stone" />
              <StatCard label="Collection submissions" value={stats.formSubmissions} sub="Feedback received" icon={Send} tint="amber" />
              <StatCard label="Approvals" value={stats.approvalsApproved} sub={`${stats.approvalRate}% of approval requests`} icon={CheckCircle2} tint="green" />
            </div>

            {!hasEvents && <Card className="rounded-2xl border-dashed bg-card p-6 sm:p-8"><div className="flex flex-col items-start gap-4 sm:flex-row"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-orange-800"><BarChart3 className="h-6 w-6" /></span><div className="flex-1"><h2 className="font-semibold">Your analytics will appear here</h2><p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">Once visitors view a published widget or case study, or a customer submits a collection form, your activity will appear in these reports. You can set up your first experience now.</p><div className="mt-4 flex flex-wrap gap-2"><Button asChild size="sm"><a href="/collect">Create collection form <ArrowUpRight className="ml-1 h-3.5 w-3.5" /></a></Button><Button asChild size="sm" variant="outline"><a href="/widgets">Set up a widget</a></Button></div></div></div></Card>}

            <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
              <Card className="min-w-0 rounded-2xl p-4 shadow-none sm:p-5">
                <div className="mb-4"><h2 className="font-semibold">Collection activity</h2><p className="mt-1 text-xs text-muted-foreground">Form submissions and approvals by day</p></div>
                <div className="h-[270px] min-w-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dailyData} margin={{ top: 8, right: 10, left: -18, bottom: 2 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={18} />
                      <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} width={32} />
                      <Tooltip contentStyle={{ fontSize: 12, borderRadius: 10, border: "1px solid hsl(var(--border))" }} />
                      <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                      <Line type="monotone" dataKey="submissions" stroke="#C94320" strokeWidth={2.5} dot={false} name="Submissions" />
                      <Line type="monotone" dataKey="approvals" stroke="#15803d" strokeWidth={2.5} dot={false} name="Approvals" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card className="min-w-0 rounded-2xl p-4 shadow-none sm:p-5">
                <div className="mb-4"><h2 className="font-semibold">Widget performance</h2><p className="mt-1 text-xs text-muted-foreground">Views compared with meaningful widget interactions</p></div>
                {widgetChartData.length ? <div className="h-[270px] min-w-0"><ResponsiveContainer width="100%" height="100%"><BarChart data={widgetChartData} margin={{ top: 8, right: 8, left: -18, bottom: 4 }}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} /><XAxis dataKey="widget" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} interval={0} angle={-15} textAnchor="end" height={52} /><YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} width={32} /><Tooltip contentStyle={{ fontSize: 12, borderRadius: 10, border: "1px solid hsl(var(--border))" }} /><Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} /><Bar dataKey="views" fill="#C94320" name="Views" radius={[4,4,0,0]} maxBarSize={34} /><Bar dataKey="clicks" fill="#57534e" name="Clicks" radius={[4,4,0,0]} maxBarSize={34} /></BarChart></ResponsiveContainer></div> : <ChartEmpty title="No widget activity yet" description="Publish a widget and embed it on your website to start measuring engagement." link="/widgets" linkLabel="Manage widgets" />}
              </Card>
            </div>

            <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
              <DataTableCard title="Traffic by source" description="Where visitors are coming from" columns={["Source", "Views", "Clicks", "Submissions"]} rows={bySource.map((row) => [row.source, row.views.toLocaleString(), row.clicks.toLocaleString(), row.submissions.toLocaleString()])} emptyTitle="No source data yet" emptyDescription="Traffic sources appear when your forms, widgets or case studies receive activity." />
              <DataTableCard title="Performance by campaign" description="Compare tagged campaigns" columns={["Campaign", "Views", "Submissions", "Approvals"]} rows={byCampaign.map((row) => [row.campaign, row.views.toLocaleString(), row.submissions.toLocaleString(), row.approvals.toLocaleString()])} emptyTitle="No campaign data yet" emptyDescription="Add campaign tags to your collection forms and widgets to compare activity here." />
            </div>

            <Card className="rounded-2xl p-4 shadow-none sm:p-5">
              <div className="mb-5"><h2 className="font-semibold">Approval funnel</h2><p className="mt-1 text-xs text-muted-foreground">Customer approval events in the selected range and filters</p></div>
              <div className="grid gap-4 md:grid-cols-3">
                <FunnelItem label="Requests sent" value={stats.approvalsSent} max={maxFunnel} tint="#C94320" />
                <FunnelItem label="Approved" value={stats.approvalsApproved} max={maxFunnel} tint="#15803d" />
                <FunnelItem label="Rejected" value={stats.approvalsRejected} max={maxFunnel} tint="#b91c1c" />
              </div>
              <div className="mt-4 rounded-xl bg-muted/50 px-3 py-2 text-xs text-muted-foreground">Report: {pageName} · Last {range} days{filterLabel ? ` · ${filterLabel}` : ""} · {filtered.length.toLocaleString()} events</div>
            </Card>
          </div>

          <details className="mt-6 rounded-2xl border border-border/80 bg-card px-4 py-3">
            <summary className="cursor-pointer list-none text-sm font-medium text-muted-foreground marker:hidden">Advanced data tools <span className="ml-1 text-xs font-normal">· For historical analytics recovery</span></summary>
            <div className="flex flex-col justify-between gap-3 border-t border-border/70 pt-4 mt-3 sm:flex-row sm:items-center"><div><p className="text-sm font-medium">Reconcile historical activity</p><p className="mt-1 max-w-2xl text-xs leading-5 text-muted-foreground">Use this only if past widget, form or approval activity is missing. It rebuilds historical analytics events and does not modify testimonials.</p></div><Button variant="outline" size="sm" onClick={() => void runBackfill()} disabled={backfillState.phase === "estimating" || backfillState.phase === "running"}>{backfillState.phase === "estimating" || backfillState.phase === "running" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Database className="mr-2 h-4 w-4" />}Reconcile data</Button></div>
          </details>
        </>
      )}

      <Dialog open={backfillState.open} onOpenChange={closeBackfill}>
        <DialogContent>
          <DialogHeader><DialogTitle>{backfillState.phase === "estimating" ? "Checking historical activity" : backfillState.phase === "running" ? "Rebuilding analytics" : backfillState.phase === "error" ? "Analytics recovery failed" : "Analytics recovery complete"}</DialogTitle><DialogDescription>{backfillState.message || "We are estimating how much historical activity can be restored. Keep this window open until the operation finishes."}</DialogDescription></DialogHeader>
          {(backfillState.phase === "estimating" || backfillState.phase === "running") && <div className="space-y-2"><Progress value={backfillState.phase === "estimating" ? 12 : Math.min(95, (backfillState.processed / Math.max(1, backfillState.total)) * 100)} /><p className="text-xs text-muted-foreground">{backfillState.phase === "estimating" ? "Estimating missing activity…" : `${backfillState.processed.toLocaleString()} of ${backfillState.total.toLocaleString()} events (estimated)`}</p></div>}
          {backfillState.phase !== "estimating" && backfillState.phase !== "running" && <div className="flex justify-end"><Button onClick={() => closeBackfill(false)}>Close</Button></div>}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
};

function StatCard({ label, value, sub, icon: Icon, tint }: { label: string; value: number; sub: string; icon: ComponentType<{ className?: string }>; tint: "orange" | "stone" | "amber" | "green" }) {
  const iconClass = {
    orange: "bg-orange-50 text-orange-800",
    stone: "bg-stone-100 text-stone-800",
    amber: "bg-amber-50 text-amber-800",
    green: "bg-emerald-50 text-emerald-800",
  }[tint];
  return <Card className="rounded-2xl border-border/80 p-4 shadow-[0_2px_8px_rgba(15,23,42,0.035)] sm:p-5"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-xs font-medium text-muted-foreground sm:text-sm">{label}</p><div className="mt-2 text-3xl font-semibold tracking-tight tabular-nums">{value.toLocaleString()}</div><p className="mt-1.5 text-xs text-muted-foreground">{sub}</p></div><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconClass}`}><Icon className="h-[18px] w-[18px]" /></span></div></Card>;
}

function ChartEmpty({ title, description, link, linkLabel }: { title: string; description: string; link: string; linkLabel: string }) {
  return <div className="flex min-h-[190px] flex-col items-center justify-center px-4 py-6 text-center"><span className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-muted-foreground"><BarChart3 className="h-5 w-5" /></span><p className="text-sm font-medium">{title}</p><p className="mt-1 max-w-xs text-xs leading-5 text-muted-foreground">{description}</p><Button asChild variant="link" size="sm" className="mt-2"><a href={link}>{linkLabel}</a></Button></div>;
}

function DataTableCard({ title, description, columns, rows, emptyTitle, emptyDescription }: { title: string; description: string; columns: string[]; rows: string[][]; emptyTitle: string; emptyDescription: string }) {
  return <Card className="min-w-0 overflow-hidden rounded-2xl shadow-none"><div className="border-b border-border/70 px-5 py-4"><h2 className="font-semibold">{title}</h2><p className="mt-1 text-xs text-muted-foreground">{description}</p></div>{rows.length === 0 ? <div className="px-5 py-8 text-center"><p className="text-sm font-medium">{emptyTitle}</p><p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-muted-foreground">{emptyDescription}</p></div> : <div className="overflow-x-auto"><table className="w-full min-w-[440px] border-collapse text-left text-sm"><thead className="bg-muted/45 text-[10px] uppercase tracking-[0.1em] text-muted-foreground"><tr>{columns.map((column, index) => <th key={column} className={`px-4 py-3 font-medium first:pl-5 last:pr-5 ${index > 0 ? "text-right" : ""}`}>{column}</th>)}</tr></thead><tbody>{rows.map((row, rowIndex) => <tr key={`${row[0]}-${rowIndex}`} className="border-t border-border/60 hover:bg-muted/30">{row.map((value, cellIndex) => <td key={`${rowIndex}-${cellIndex}`} className={`max-w-[220px] truncate px-4 py-3 text-xs first:pl-5 last:pr-5 ${cellIndex === 0 ? "font-medium text-foreground" : "text-right tabular-nums text-muted-foreground"}`}>{value}</td>)}</tr>)}</tbody></table></div>}</Card>;
}

function FunnelItem({ label, value, max, tint }: { label: string; value: number; max: number; tint: string }) {
  const percent = Math.min(100, Math.round((value / Math.max(1, max)) * 100));
  return <div className="rounded-xl border border-border/70 p-4"><div className="flex items-center justify-between gap-2"><span className="text-xs font-medium text-muted-foreground">{label}</span><span className="text-lg font-semibold tabular-nums">{value.toLocaleString()}</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full transition-all duration-500" style={{ width: `${percent}%`, background: tint }} /></div><div className="mt-2 text-right text-[10px] text-muted-foreground">{percent}% of largest stage</div></div>;
}

export default Analytics;
