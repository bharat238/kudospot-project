import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Eye, MousePointerClick, FileText, CheckCircle2, Download, TrendingUp, Loader2, Database, FileDown } from "lucide-react";
import { toast } from "sonner";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

type Ev = {
  id: string;
  event_type: string;
  entity_id: string | null;
  entity_type: string | null;
  source: string | null;
  campaign: string | null;
  created_at: string;
  referrer: string | null;
};

const RANGES = [
  { key: "7", label: "Last 7 days" },
  { key: "30", label: "Last 30 days" },
  { key: "90", label: "Last 90 days" },
];

const ALL = "__all__";

const Analytics = () => {
  const { user } = useAuth();
  const [range, setRange] = useState("30");
  const [campaignFilter, setCampaignFilter] = useState<string>(ALL);
  const [sourceFilter, setSourceFilter] = useState<string>(ALL);
  const [events, setEvents] = useState<Ev[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [backfillState, setBackfillState] = useState<{
    open: boolean; phase: "idle" | "estimating" | "running" | "done" | "error";
    total: number; processed: number; startedAt: number; etaSec: number; message?: string;
  }>({ open: false, phase: "idle", total: 0, processed: 0, startedAt: 0, etaSec: 0 });
  const reportRef = useRef<HTMLDivElement>(null);

  const loadEvents = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const since = new Date();
    since.setDate(since.getDate() - parseInt(range));
    const [{ data: ev }, { data: pr }] = await Promise.all([
      supabase
        .from("analytics_events")
        .select("id,event_type,entity_id,entity_type,source,campaign,created_at,referrer")
        .eq("user_id", user.id)
        .gte("created_at", since.toISOString())
        .order("created_at", { ascending: false })
        .limit(5000),
      supabase.from("profiles").select("business_name,full_name").eq("id", user.id).maybeSingle(),
    ]);
    setEvents((ev || []) as Ev[]);
    setProfile(pr);
    setLoading(false);
  }, [user, range]);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  // Apply client-side filters
  const filtered = useMemo(() => {
    return events.filter((e) => {
      if (campaignFilter !== ALL && (e.campaign || "") !== (campaignFilter === "__none__" ? "" : campaignFilter)) return false;
      if (sourceFilter !== ALL) {
        const src = (e.source || "direct").replace(/^www\./, "");
        if (src !== sourceFilter) return false;
      }
      return true;
    });
  }, [events, campaignFilter, sourceFilter]);

  const campaigns = useMemo(() => {
    const set = new Set<string>();
    let hasUntagged = false;
    for (const e of events) {
      if (e.campaign) set.add(e.campaign);
      else hasUntagged = true;
    }
    return { list: [...set].sort(), hasUntagged };
  }, [events]);

  const sources = useMemo(() => {
    const set = new Set<string>();
    for (const e of events) set.add((e.source || "direct").replace(/^www\./, ""));
    return [...set].sort();
  }, [events]);

  const stats = useMemo(() => {
    const count = (t: string) => filtered.filter((e) => e.event_type === t).length;
    const widgetViews = count("widget_view");
    const widgetClicks = count("widget_click");
    const caseViews = count("case_study_view");
    const approvalsSent = count("approval_sent");
    const approvalsApproved = count("approval_approved");
    const approvalsRejected = count("approval_rejected");
    return {
      widgetViews,
      widgetClicks,
      ctr: widgetViews ? Math.round((widgetClicks / widgetViews) * 1000) / 10 : 0,
      caseViews,
      approvalsSent,
      approvalsApproved,
      approvalsRejected,
      conversionRate: approvalsSent ? Math.round((approvalsApproved / approvalsSent) * 1000) / 10 : 0,
    };
  }, [filtered]);

  const bySource = useMemo(() => {
    const map = new Map<string, { source: string; views: number; clicks: number; submits: number; approvals: number }>();
    for (const e of filtered) {
      const key = (e.source || "direct").replace(/^www\./, "");
      const row = map.get(key) || { source: key, views: 0, clicks: 0, submits: 0, approvals: 0 };
      if (e.event_type.endsWith("_view")) row.views++;
      else if (e.event_type === "widget_click") row.clicks++;
      else if (e.event_type === "form_submit") row.submits++;
      else if (e.event_type === "approval_approved") row.approvals++;
      map.set(key, row);
    }
    return [...map.values()].sort((a, b) => b.views + b.submits - (a.views + a.submits)).slice(0, 12);
  }, [filtered]);

  const byCampaign = useMemo(() => {
    const map = new Map<string, { campaign: string; views: number; submits: number; approvals: number }>();
    for (const e of filtered) {
      const key = e.campaign || "(untagged)";
      const row = map.get(key) || { campaign: key, views: 0, submits: 0, approvals: 0 };
      if (e.event_type.endsWith("_view")) row.views++;
      else if (e.event_type === "form_submit") row.submits++;
      else if (e.event_type === "approval_approved") row.approvals++;
      map.set(key, row);
    }
    return [...map.values()].sort((a, b) => b.approvals - a.approvals);
  }, [filtered]);

  const sparkline = useMemo(() => {
    const days = parseInt(range);
    const buckets: { date: string; widgetViews: number; caseViews: number; approvals: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      buckets.push({ date: d.toISOString().slice(0, 10), widgetViews: 0, caseViews: 0, approvals: 0 });
    }
    const idx = new Map(buckets.map((b, i) => [b.date, i]));
    for (const e of filtered) {
      const d = e.created_at.slice(0, 10);
      const i = idx.get(d);
      if (i === undefined) continue;
      if (e.event_type === "widget_view") buckets[i].widgetViews++;
      else if (e.event_type === "case_study_view") buckets[i].caseViews++;
      else if (e.event_type === "approval_approved") buckets[i].approvals++;
    }
    return buckets;
  }, [filtered, range]);

  const exportCSV = useCallback(() => {
    const rows: string[][] = [];
    rows.push(["Section", "Date / Source / Campaign", "Metric", "Value"]);
    // Daily breakdown
    for (const b of sparkline) {
      rows.push(["daily", b.date, "widget_views", String(b.widgetViews)]);
      rows.push(["daily", b.date, "case_study_views", String(b.caseViews)]);
      rows.push(["daily", b.date, "approvals", String(b.approvals)]);
    }
    for (const r of bySource) {
      rows.push(["by_source", r.source, "views", String(r.views)]);
      rows.push(["by_source", r.source, "clicks", String(r.clicks)]);
      rows.push(["by_source", r.source, "submits", String(r.submits)]);
      rows.push(["by_source", r.source, "approvals", String(r.approvals)]);
    }
    for (const r of byCampaign) {
      rows.push(["by_campaign", r.campaign, "views", String(r.views)]);
      rows.push(["by_campaign", r.campaign, "submits", String(r.submits)]);
      rows.push(["by_campaign", r.campaign, "approvals", String(r.approvals)]);
    }
    rows.push(["funnel", "all", "approvals_sent", String(stats.approvalsSent)]);
    rows.push(["funnel", "all", "approvals_approved", String(stats.approvalsApproved)]);
    rows.push(["funnel", "all", "approvals_rejected", String(stats.approvalsRejected)]);
    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const filterTag = [campaignFilter !== ALL ? campaignFilter : null, sourceFilter !== ALL ? sourceFilter : null].filter(Boolean).join("-") || "all";
    a.href = url;
    a.download = `kudospot-analytics-${range}d-${filterTag}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported");
  }, [sparkline, bySource, byCampaign, stats, campaignFilter, sourceFilter, range]);

  const downloadPDF = useCallback(async () => {
    setExporting(true);
    try {
      const { default: jsPDF } = await import("jspdf");
      const html2canvas = (await import("html2canvas")).default;
      const node = reportRef.current!;
      const canvas = await html2canvas(node, { background: "#ffffff", scale: 2 } as any);
      const img = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "p", unit: "pt", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const ratio = Math.min(pageW / canvas.width, pageH / canvas.height);
      const w = canvas.width * ratio;
      const h = canvas.height * ratio;
      pdf.addImage(img, "PNG", (pageW - w) / 2, 20, w, h);
      const filterTag = [campaignFilter !== ALL ? campaignFilter : null, sourceFilter !== ALL ? sourceFilter : null].filter(Boolean).join("-") || "all";
      pdf.save(`kudospot-${range}d-${filterTag}-${new Date().toISOString().slice(0, 10)}.pdf`);
      toast.success("Report downloaded");
    } catch (e: any) {
      toast.error(e.message || "Export failed");
    } finally {
      setExporting(false);
    }
  }, [range, campaignFilter, sourceFilter]);

  const runBackfill = async () => {
    if (!user) return;
    // Phase 1: estimate via dry run
    setBackfillState({ open: true, phase: "estimating", total: 0, processed: 0, startedAt: Date.now(), etaSec: 0 });
    try {
      // Estimate first via dry run (manual fetch — invoke doesn't pass query strings)
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      const baseUrl = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/backfill-analytics`;
      const dryRes = await fetch(`${baseUrl}?dry_run=1`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      const dryData = await dryRes.json();
      if (!dryRes.ok) throw new Error(dryData?.error || "Estimate failed");
      const total = dryData.total || 0;
      // Estimate ~600 events/sec server-side insert throughput
      const etaSec = Math.max(2, Math.ceil(total / 600));

      if (total === 0) {
        setBackfillState((s) => ({ ...s, phase: "done", total: 0, processed: 0, message: "Nothing to backfill — your analytics are already current." }));
        return;
      }

      if (!confirm(`Backfill ~${total.toLocaleString()} historical events? Estimated ${etaSec}s.`)) {
        setBackfillState({ open: false, phase: "idle", total: 0, processed: 0, startedAt: 0, etaSec: 0 });
        return;
      }

      // Phase 2: run real backfill, animate progress optimistically against ETA
      setBackfillState({ open: true, phase: "running", total, processed: 0, startedAt: Date.now(), etaSec });
      const tickEvery = 250;
      const interval = setInterval(() => {
        setBackfillState((s) => {
          if (s.phase !== "running") return s;
          const elapsed = (Date.now() - s.startedAt) / 1000;
          const pct = Math.min(0.95, elapsed / s.etaSec);
          return { ...s, processed: Math.floor(s.total * pct) };
        });
      }, tickEvery);

      const realRes = await fetch(baseUrl, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      const realData = await realRes.json();
      clearInterval(interval);
      if (!realRes.ok) throw new Error(realData?.error || "Backfill failed");

      setBackfillState((s) => ({ ...s, phase: "done", processed: realData.inserted || s.total, total: realData.inserted || s.total, message: realData.skipped ? "Backfill already ran previously." : `Inserted ${(realData.inserted || 0).toLocaleString()} historical events.` }));
      loadEvents();
    } catch (e: any) {
      setBackfillState((s) => ({ ...s, phase: "error", message: e.message || "Backfill failed" }));
      toast.error(e.message || "Backfill failed");
    }
  };

  const chartDataByDay = useMemo(() => {
    const grouped: Record<string, number> = {};
    filtered
      .filter((e) => e.event_type === "form_submit" || e.event_type === "approval_approved")
      .forEach((e) => {
        const d = new Date(e.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
        grouped[d] = (grouped[d] || 0) + 1;
      });
    return Object.entries(grouped).map(([date, count]) => ({ date, count }));
  }, [filtered]);

  const widgetChartData = useMemo(() => {
    const grouped: Record<string, { widget: string; views: number; clicks: number }> = {};
    filtered
      .filter((e) => e.event_type === "widget_view" || e.event_type === "widget_click")
      .forEach((e) => {
        const key = e.entity_id || "unknown";
        if (!grouped[key]) grouped[key] = { widget: key.slice(0, 8) + "…", views: 0, clicks: 0 };
        if (e.event_type === "widget_view") grouped[key].views++;
        else grouped[key].clicks++;
      });
    return Object.values(grouped);
  }, [filtered]);

  const sparkMax = Math.max(1, ...sparkline.map((b) => b.widgetViews + b.caseViews + b.approvals));
  const filterLabel = [
    campaignFilter !== ALL ? `Campaign: ${campaignFilter === "__none__" ? "untagged" : campaignFilter}` : null,
    sourceFilter !== ALL ? `Source: ${sourceFilter}` : null,
  ].filter(Boolean).join(" · ");

  return (
    <AppShell>
      <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold mb-1">Analytics</h1>
          <p className="text-muted-foreground">How your social proof is performing.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Tabs value={range} onValueChange={setRange}>
            <TabsList>
              {RANGES.map((r) => <TabsTrigger key={r.key} value={r.key}>{r.label}</TabsTrigger>)}
            </TabsList>
          </Tabs>
          <Button variant="outline" onClick={runBackfill} disabled={backfillState.phase === "estimating" || backfillState.phase === "running" || loading}>
            {backfillState.phase === "estimating" || backfillState.phase === "running" ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Database className="h-4 w-4 mr-1" />}
            Backfill
          </Button>
          <Button variant="outline" onClick={exportCSV} disabled={loading}>
            <FileDown className="h-4 w-4 mr-1" /> Export CSV
          </Button>
          <Button onClick={downloadPDF} disabled={exporting || loading}>
            {exporting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Download className="h-4 w-4 mr-1" />}
            Download PDF
          </Button>
        </div>
      </div>

      <div className="mb-6 flex gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Campaign</span>
          <Select value={campaignFilter} onValueChange={setCampaignFilter}>
            <SelectTrigger className="w-44 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All campaigns</SelectItem>
              {campaigns.hasUntagged && <SelectItem value="__none__">(untagged)</SelectItem>}
              {campaigns.list.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Source</span>
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="w-44 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All sources</SelectItem>
              {sources.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {(campaignFilter !== ALL || sourceFilter !== ALL) && (
          <Button size="sm" variant="ghost" onClick={() => { setCampaignFilter(ALL); setSourceFilter(ALL); }}>Clear filters</Button>
        )}
      </div>

      {loading ? (
        <div className="py-24 text-center text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
      ) : (
        <div ref={reportRef} className="bg-background space-y-6 p-2">

        {chartDataByDay.length > 0 && (
          <Card className="p-6 mb-6">
            <h2 className="font-semibold mb-1">Testimonials collected over time</h2>
            <p className="text-xs text-muted-foreground mb-4">Form submissions and approved testimonials</p>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartDataByDay} margin={{ top: 4, right: 16, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(var(--border))" }} />
                <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} name="Testimonials" />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        )}

        {widgetChartData.length > 0 && (
          <Card className="p-6 mb-6">
            <h2 className="font-semibold mb-1">Widget performance</h2>
            <p className="text-xs text-muted-foreground mb-4">Views vs clicks per widget</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={widgetChartData} margin={{ top: 4, right: 16, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="widget" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(var(--border))" }} />
                <Legend iconSize={10} />
                <Bar dataKey="views" fill="hsl(var(--primary))" name="Views" radius={[4, 4, 0, 0]} />
                <Bar dataKey="clicks" fill="hsl(var(--success))" name="Clicks" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        )}
          <div className="pb-4 border-b">
            <div className="text-2xl font-bold">{profile?.business_name || profile?.full_name || "KudoSpot"} — Performance Report</div>
            <div className="text-sm text-muted-foreground mt-1">
              Generated {new Date().toLocaleDateString("en", { month: "long", day: "numeric", year: "numeric" })} · Last {range} days
              {sourceFilter !== ALL && ` · Source: ${sourceFilter}`}
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5 items-center">
              <span className="text-xs uppercase tracking-wide text-muted-foreground mr-1">Campaigns:</span>
              {campaignFilter !== ALL ? (
                <span className="text-xs px-2 py-0.5 rounded-full bg-primary text-primary-foreground">
                  {campaignFilter === "__none__" ? "untagged" : campaignFilter}
                </span>
              ) : byCampaign.length === 0 ? (
                <span className="text-xs text-muted-foreground">none tagged</span>
              ) : (
                byCampaign.slice(0, 8).map((c) => (
                  <span key={c.campaign} className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                    {c.campaign} <span className="text-muted-foreground">· {c.approvals}</span>
                  </span>
                ))
              )}
              {byCampaign.length > 8 && campaignFilter === ALL && (
                <span className="text-xs text-muted-foreground">+{byCampaign.length - 8} more</span>
              )}
            </div>
            {filterLabel && (
              <div className="text-xs text-muted-foreground mt-2">Showing {filtered.length.toLocaleString()} events matching active filters.</div>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Stat label="Widget views" value={stats.widgetViews} icon={Eye} accent="text-primary bg-primary-light" />
            <Stat label="Widget clicks" value={stats.widgetClicks} icon={MousePointerClick} sub={`${stats.ctr}% CTR`} accent="text-primary bg-primary-light" />
            <Stat label="Case study views" value={stats.caseViews} icon={FileText} accent="text-success bg-success/10" />
            <Stat label="Approvals" value={stats.approvalsApproved} icon={CheckCircle2} sub={`${stats.conversionRate}% rate`} accent="text-success bg-success/10" />
          </div>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">Engagement over time</h2>
              <div className="text-xs text-muted-foreground flex gap-3">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-primary" /> Widget views</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-success" /> Case views</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-warning" /> Approvals</span>
              </div>
            </div>
            <div className="flex items-end gap-1 h-40">
              {sparkline.map((b, i) => (
                <div key={i} className="flex-1 flex flex-col-reverse gap-px" title={`${b.date}: ${b.widgetViews + b.caseViews + b.approvals} events`}>
                  <div style={{ height: `${(b.widgetViews / sparkMax) * 100}%` }} className="bg-primary rounded-t-sm min-h-[1px]" />
                  <div style={{ height: `${(b.caseViews / sparkMax) * 100}%` }} className="bg-success min-h-[1px]" />
                  <div style={{ height: `${(b.approvals / sparkMax) * 100}%` }} className="bg-warning min-h-[1px]" />
                </div>
              ))}
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground mt-2">
              <span>{sparkline[0]?.date}</span>
              <span>{sparkline[sparkline.length - 1]?.date}</span>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">Conversion by source</h2>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </div>
            {bySource.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No traffic yet — share a widget or form to start tracking.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground uppercase border-b">
                  <tr>
                    <th className="text-left py-2 font-medium">Source</th>
                    <th className="text-right py-2 font-medium">Views</th>
                    <th className="text-right py-2 font-medium">Clicks</th>
                    <th className="text-right py-2 font-medium">Submits</th>
                    <th className="text-right py-2 font-medium">Approvals</th>
                    <th className="text-right py-2 font-medium">Conv. rate</th>
                  </tr>
                </thead>
                <tbody>
                  {bySource.map((r) => {
                    const total = r.views + r.submits;
                    const conv = total ? Math.round(((r.clicks + r.approvals) / total) * 1000) / 10 : 0;
                    return (
                      <tr key={r.source} className="border-b last:border-0">
                        <td className="py-2.5 font-medium">{r.source}</td>
                        <td className="text-right">{r.views}</td>
                        <td className="text-right">{r.clicks}</td>
                        <td className="text-right">{r.submits}</td>
                        <td className="text-right text-success font-medium">{r.approvals}</td>
                        <td className="text-right">{conv}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">Performance by campaign</h2>
              <span className="text-xs text-muted-foreground">{byCampaign.length} {byCampaign.length === 1 ? "tag" : "tags"}</span>
            </div>
            {byCampaign.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">Add a campaign tag to your forms or widgets to compare.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground uppercase border-b">
                  <tr>
                    <th className="text-left py-2 font-medium">Campaign</th>
                    <th className="text-right py-2 font-medium">Views</th>
                    <th className="text-right py-2 font-medium">Submits</th>
                    <th className="text-right py-2 font-medium">Approvals</th>
                    <th className="text-right py-2 font-medium">Conv. rate</th>
                  </tr>
                </thead>
                <tbody>
                  {byCampaign.map((r) => {
                    const conv = r.submits ? Math.round((r.approvals / r.submits) * 1000) / 10 : 0;
                    return (
                      <tr key={r.campaign} className="border-b last:border-0">
                        <td className="py-2.5 font-medium">{r.campaign}</td>
                        <td className="text-right">{r.views}</td>
                        <td className="text-right">{r.submits}</td>
                        <td className="text-right text-success font-medium">{r.approvals}</td>
                        <td className="text-right">{conv}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </Card>

          <Card className="p-6">
            <h2 className="font-semibold mb-4">Approval funnel</h2>
            <div className="space-y-3">
              <FunnelRow label="Approval requests sent" count={stats.approvalsSent} max={stats.approvalsSent || 1} color="bg-primary" />
              <FunnelRow label="Customers approved" count={stats.approvalsApproved} max={stats.approvalsSent || 1} color="bg-success" />
              <FunnelRow label="Customers rejected" count={stats.approvalsRejected} max={stats.approvalsSent || 1} color="bg-destructive" />
            </div>
          </Card>
        </div>
      )}

      <Dialog
        open={backfillState.open}
        onOpenChange={(o) => {
          if (!o && (backfillState.phase === "done" || backfillState.phase === "error" || backfillState.phase === "idle")) {
            setBackfillState({ open: false, phase: "idle", total: 0, processed: 0, startedAt: 0, etaSec: 0 });
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" /> Backfilling analytics
            </DialogTitle>
            <DialogDescription>
              {backfillState.phase === "estimating" && "Counting historical widgets, case studies, and approvals…"}
              {backfillState.phase === "running" && "Synthesizing events from existing counters and approval timestamps."}
              {backfillState.phase === "done" && (backfillState.message || "Done.")}
              {backfillState.phase === "error" && (backfillState.message || "Something went wrong.")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {(backfillState.phase === "estimating" || backfillState.phase === "running") && (
              <>
                <Progress
                  value={
                    backfillState.phase === "estimating"
                      ? 5
                      : backfillState.total
                        ? Math.min(99, (backfillState.processed / backfillState.total) * 100)
                        : 50
                  }
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>
                    {backfillState.phase === "estimating"
                      ? "Estimating…"
                      : `${backfillState.processed.toLocaleString()} / ${backfillState.total.toLocaleString()} events`}
                  </span>
                  <span>
                    {backfillState.phase === "estimating"
                      ? "—"
                      : (() => {
                          const elapsed = (Date.now() - backfillState.startedAt) / 1000;
                          const remaining = Math.max(0, Math.ceil(backfillState.etaSec - elapsed));
                          return remaining > 0 ? `~${remaining}s remaining` : "Finalizing…";
                        })()}
                  </span>
                </div>
              </>
            )}
            {backfillState.phase === "done" && (
              <div className="rounded-md bg-success/10 text-success px-3 py-2 text-sm flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" /> {backfillState.message}
              </div>
            )}
            {backfillState.phase === "error" && (
              <div className="rounded-md bg-destructive/10 text-destructive px-3 py-2 text-sm">{backfillState.message}</div>
            )}
            {(backfillState.phase === "done" || backfillState.phase === "error") && (
              <div className="flex justify-end">
                <Button onClick={() => setBackfillState({ open: false, phase: "idle", total: 0, processed: 0, startedAt: 0, etaSec: 0 })}>
                  Close
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
};

const Stat = ({ label, value, icon: Icon, sub, accent }: any) => (
  <Card className="p-5">
    <div className={`h-10 w-10 rounded-lg flex items-center justify-center mb-3 ${accent}`}><Icon className="h-5 w-5" /></div>
    <div className="text-3xl font-bold">{value}</div>
    <div className="text-sm text-muted-foreground">{label}</div>
    {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
  </Card>
);

const FunnelRow = ({ label, count, max, color }: { label: string; count: number; max: number; color: string }) => (
  <div>
    <div className="flex justify-between text-sm mb-1"><span>{label}</span><span className="font-semibold">{count}</span></div>
    <div className="h-2 bg-secondary rounded-full overflow-hidden">
      <div className={`h-full ${color} transition-all`} style={{ width: `${Math.min(100, (count / max) * 100)}%` }} />
    </div>
  </div>
);

export default Analytics;
