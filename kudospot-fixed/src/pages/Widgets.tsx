import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Plus, Copy, Trash2, Star, ExternalLink, LayoutGrid, Eye, MousePointerClick, Loader2, RefreshCw, Code2, Check, AlertCircle, MessageSquareQuote } from "lucide-react";
import { usePlanLimits } from "@/hooks/usePlanLimits";

const TYPES = [
  { value: "wall", label: "Wall of Love", description: "A responsive grid of customer quotes" },
  { value: "carousel", label: "Carousel", description: "Rotate through testimonials automatically" },
  { value: "single", label: "Single quote", description: "Highlight one focused customer story" },
  { value: "badge", label: "Rating badge", description: "Show your average customer rating" },
] as const;

const DEFAULT_ACCENT = "#C94320";

const makeBlank = () => ({
  widget_name: "",
  widget_type: "wall",
  testimonial_ids: [] as string[],
  campaign: "",
  settings: { primary_color: DEFAULT_ACCENT, radius: 12 },
});

type WidgetRow = Tables<"widgets">;
type TestimonialPickerItem = Pick<Tables<"testimonials">, "id" | "customer_name" | "customer_role" | "customer_company" | "approved_text" | "ai_rewritten_text" | "original_text" | "rating">;

const Widgets = () => {
  const { user } = useAuth();
  const { canAddWidget, showUpgradeToast } = usePlanLimits();
  const [widgets, setWidgets] = useState<WidgetRow[]>([]);
  const [testimonials, setTestimonials] = useState<TestimonialPickerItem[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>(makeBlank());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [testimonialError, setTestimonialError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    setTestimonialError(null);
    try {
      const [widgetResult, testimonialResult] = await Promise.all([
        supabase.from("widgets").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("testimonials")
          .select("id, customer_name, customer_role, customer_company, approved_text, ai_rewritten_text, original_text, rating")
          .eq("user_id", user.id)
          .in("status", ["approved", "published"])
          .order("created_at", { ascending: false }),
      ]);
      if (widgetResult.error) throw widgetResult.error;
      setWidgets(widgetResult.data || []);
      if (testimonialResult.error) {
        setTestimonialError("Approved testimonials could not be loaded. Refresh and try again.");
      } else {
        setTestimonials(testimonialResult.data || []);
      }
    } catch (error) {
      console.error("Failed to load widgets:", error);
      setLoadError("We couldn't load your widgets. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { void load(); }, [load]);

  const create = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user || creating) return;
    const name = String(form.widget_name || "").trim();
    if (!name) return toast.error("Give your widget a name.");
    if (!canAddWidget(widgets.length)) return showUpgradeToast("more widgets");
    if (form.testimonial_ids.length === 0) return toast.error("Choose at least one approved testimonial.");

    setCreating(true);
    try {
      const { error } = await supabase.from("widgets").insert({
        widget_name: name,
        widget_type: form.widget_type,
        testimonial_ids: form.testimonial_ids,
        campaign: String(form.campaign || "").trim() || null,
        settings: form.settings,
        user_id: user.id,
      });
      if (error) throw error;
      toast.success("Widget created");
      setOpen(false);
      setForm(makeBlank());
      await load();
    } catch (error: any) {
      toast.error(error?.message || "We couldn't create the widget. Try again.");
    } finally {
      setCreating(false);
    }
  };

  const remove = async (widget: WidgetRow) => {
    if (!user || !window.confirm(`Delete “${widget.widget_name}”? Its embed will stop working.`)) return;
    const { error } = await supabase.from("widgets").delete().eq("id", widget.id).eq("user_id", user.id);
    if (error) return toast.error("The widget could not be deleted. Please try again.");
    toast.success("Widget deleted");
    await load();
  };

  const togglePublished = async (widget: WidgetRow) => {
    if (!user || updatingIds.has(widget.id)) return;
    setUpdatingIds((current) => new Set(current).add(widget.id));
    const next = !widget.is_published;
    const { error } = await supabase.from("widgets").update({ is_published: next }).eq("id", widget.id).eq("user_id", user.id);
    setUpdatingIds((current) => {
      const updated = new Set(current);
      updated.delete(widget.id);
      return updated;
    });
    if (error) return toast.error("The publish status couldn't be changed. Please try again.");
    setWidgets((current) => current.map((item) => item.id === widget.id ? { ...item, is_published: next } : item));
    toast.success(next ? "Widget published" : "Widget unpublished");
  };

  const embedCode = (id: string) => `<iframe src="${window.location.origin}/embed/${id}" style="width:100%;border:0;min-height:240px" loading="lazy" title="KudoSpot testimonial widget"></iframe>`;

  const copyEmbed = async (widget: WidgetRow) => {
    try {
      await navigator.clipboard.writeText(embedCode(widget.id));
      setCopiedId(widget.id);
      toast.success("Embed code copied");
      window.setTimeout(() => setCopiedId((current) => current === widget.id ? null : current), 2000);
    } catch {
      toast.error("Clipboard access was blocked. Open the widget preview to copy the embed URL.");
    }
  };

  const selectedType = TYPES.find((type) => type.value === form.widget_type) || TYPES[0];

  return (
    <AppShell>
      <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-[0.13em] text-muted-foreground">Showcase</div>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Widgets</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">Turn approved customer stories into website-ready social proof. Preview, publish and copy your embed from one place.</p>
        </div>
        <Dialog open={open} onOpenChange={(nextOpen) => { setOpen(nextOpen); if (!nextOpen) setForm(makeBlank()); }}>
          <DialogTrigger asChild><Button className="h-10 rounded-xl px-4"><Plus className="mr-2 h-4 w-4" /> Create widget</Button></DialogTrigger>
          <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create a testimonial widget</DialogTitle>
              <DialogDescription>Choose approved testimonials and style the embed to match your brand.</DialogDescription>
            </DialogHeader>
            <form onSubmit={create} className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2"><Label htmlFor="widget-name">Widget name</Label><Input id="widget-name" required maxLength={80} value={form.widget_name} onChange={(event) => setForm({ ...form, widget_name: event.target.value })} placeholder="Homepage customer stories" /></div>
                <div className="space-y-2"><Label htmlFor="widget-type">Layout</Label><Select value={form.widget_type} onValueChange={(value) => setForm({ ...form, widget_type: value })}><SelectTrigger id="widget-type"><SelectValue /></SelectTrigger><SelectContent>{TYPES.map((type) => <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>)}</SelectContent></Select><p className="text-xs text-muted-foreground">{selectedType.description}</p></div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3"><Label>Approved testimonials</Label><span className="text-xs text-muted-foreground">{form.testimonial_ids.length} selected</span></div>
                {testimonialError ? (
                  <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">{testimonialError}</div>
                ) : testimonials.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border bg-muted/30 p-5">
                    <div className="flex items-start gap-3"><MessageSquareQuote className="mt-0.5 h-5 w-5 text-muted-foreground" /><div><p className="text-sm font-medium text-foreground">No approved testimonials yet</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Approve a testimonial first, then it can be selected for a public widget.</p><Link to="/testimonials" className="mt-3 inline-flex text-xs font-semibold text-foreground underline underline-offset-4">Go to testimonials</Link></div></div>
                  </div>
                ) : (
                  <div className="max-h-64 divide-y divide-border overflow-y-auto rounded-xl border border-border/80">
                    {testimonials.map((testimonial) => {
                      const checked = form.testimonial_ids.includes(testimonial.id);
                      return (
                        <label key={testimonial.id} className="flex cursor-pointer items-start gap-3 p-3 transition-colors hover:bg-muted/40">
                          <Checkbox checked={checked} onCheckedChange={(value) => {
                            const next = value ? [...form.testimonial_ids, testimonial.id] : form.testimonial_ids.filter((id: string) => id !== testimonial.id);
                            setForm({ ...form, testimonial_ids: next });
                          }} />
                          <span className="min-w-0 flex-1">
                            <span className="flex flex-wrap items-center gap-2 text-sm font-medium text-foreground">{testimonial.customer_name || "Customer"}{testimonial.rating && <span className="inline-flex items-center gap-0.5 text-xs text-amber-700"><Star className="h-3 w-3 fill-current" />{testimonial.rating}</span>}</span>
                            <span className="mt-1 block line-clamp-2 text-xs leading-5 text-muted-foreground">{testimonial.approved_text || testimonial.ai_rewritten_text || testimonial.original_text}</span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-[160px_1fr_160px]">
                <div className="space-y-2"><Label htmlFor="widget-accent">Accent color</Label><div className="flex h-10 items-center gap-2 rounded-lg border border-input bg-card px-2"><Input id="widget-accent" type="color" aria-label="Widget accent color" className="h-7 w-9 cursor-pointer border-0 bg-transparent p-0" value={form.settings.primary_color} onChange={(event) => setForm({ ...form, settings: { ...form.settings, primary_color: event.target.value } })} /><span className="text-xs font-mono text-muted-foreground">{form.settings.primary_color.toUpperCase()}</span></div></div>
                <div className="space-y-2"><Label htmlFor="widget-campaign">Campaign tag <span className="font-normal text-muted-foreground">(optional)</span></Label><Input id="widget-campaign" maxLength={80} value={form.campaign} onChange={(event) => setForm({ ...form, campaign: event.target.value })} placeholder="Product launch, homepage..." /></div>
                <div className="space-y-2"><Label htmlFor="widget-radius">Corners</Label><Select value={String(form.settings.radius)} onValueChange={(value) => setForm({ ...form, settings: { ...form.settings, radius: Number(value) } })}><SelectTrigger id="widget-radius"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="0">Square</SelectItem><SelectItem value="6">Subtle</SelectItem><SelectItem value="12">Rounded</SelectItem><SelectItem value="20">Extra rounded</SelectItem><SelectItem value="9999">Pill</SelectItem></SelectContent></Select></div>
              </div>

              <div className="rounded-2xl border border-border/80 bg-[#f4f4f3] p-4">
                <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground"><Eye className="h-3.5 w-3.5" /> Style preview</div>
                <div className="max-w-md rounded-xl border border-white bg-white p-4 shadow-sm" style={{ borderRadius: form.settings.radius }}>
                  <div className="mb-2 flex gap-0.5">{[1,2,3,4,5].map((number) => <Star key={number} className="h-3.5 w-3.5 fill-current" style={{ color: form.settings.primary_color }} />)}</div>
                  <p className="text-sm leading-6 text-[#333]">“The whole process made it much easier to share the customer feedback we’re proud of.”</p>
                  <div className="mt-4 flex items-center gap-2 border-t border-gray-100 pt-3"><span className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold text-white" style={{ background: form.settings.primary_color }}>JD</span><span><span className="block text-xs font-semibold">Jordan Davis</span><span className="block text-[10px] text-gray-500">Example customer</span></span></div>
                </div>
              </div>

              <Button type="submit" disabled={creating || testimonials.length === 0} className="h-11 w-full rounded-xl">{creating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating widget…</> : "Create widget"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card className="rounded-2xl p-4 shadow-none"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-800"><LayoutGrid className="h-5 w-5" /></span><span><span className="block text-2xl font-semibold tabular-nums">{widgets.length}</span><span className="text-xs text-muted-foreground">Total widgets</span></span></div></Card>
        <Card className="rounded-2xl p-4 shadow-none"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800"><Eye className="h-5 w-5" /></span><span><span className="block text-2xl font-semibold tabular-nums">{widgets.filter((widget) => widget.is_published).length}</span><span className="text-xs text-muted-foreground">Published</span></span></div></Card>
        <Card className="rounded-2xl p-4 shadow-none"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-stone-100 text-stone-800"><MousePointerClick className="h-5 w-5" /></span><span><span className="block text-2xl font-semibold tabular-nums">{widgets.reduce((sum, widget) => sum + Number(widget.views || 0), 0).toLocaleString()}</span><span className="text-xs text-muted-foreground">Total embed views</span></span></div></Card>
      </div>

      {loading ? (
        <div className="grid gap-4 lg:grid-cols-2">{[0,1].map((item) => <Card key={item} className="animate-pulse rounded-2xl p-5"><div className="mb-4 h-5 w-2/5 rounded bg-muted" /><div className="mb-3 h-28 rounded-xl bg-muted" /><div className="h-9 rounded-lg bg-muted" /></Card>)}</div>
      ) : loadError ? (
        <Card className="rounded-2xl p-8 text-center"><AlertCircle className="mx-auto mb-3 h-8 w-8 text-destructive" /><p className="font-medium">Widgets couldn’t be loaded</p><p className="mt-1 text-sm text-muted-foreground">{loadError}</p><Button variant="outline" className="mt-4" onClick={() => void load()}><RefreshCw className="mr-2 h-4 w-4" /> Try again</Button></Card>
      ) : widgets.length === 0 ? (
        <Card className="rounded-2xl border-dashed bg-card p-10 text-center sm:p-14">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-orange-800"><LayoutGrid className="h-7 w-7" /></div>
          <h2 className="text-lg font-semibold">Your first widget starts here</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">Choose approved testimonials, select a layout, and get an embed snippet you can paste into your website.</p>
          <Button className="mt-5 rounded-xl" onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" /> Create your first widget</Button>
          <p className="mt-4 text-xs text-muted-foreground">Need testimonials first? <Link to="/testimonials" className="font-medium text-foreground underline underline-offset-4">Review your customer stories</Link></p>
        </Card>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {widgets.map((widget) => (
            <Card key={widget.id} className="min-w-0 overflow-hidden rounded-2xl border-border/80 shadow-[0_2px_8px_rgba(15,23,42,0.035)]">
              <div className="flex items-start justify-between gap-3 p-5">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: `${(widget.settings as any)?.primary_color || DEFAULT_ACCENT}15`, color: (widget.settings as any)?.primary_color || DEFAULT_ACCENT }}><LayoutGrid className="h-5 w-5" /></div>
                  <div className="min-w-0"><h2 className="truncate font-semibold">{widget.widget_name}</h2><p className="mt-1 text-xs capitalize text-muted-foreground">{TYPES.find((type) => type.value === widget.widget_type)?.label || widget.widget_type} · {widget.testimonial_ids?.length || 0} testimonials</p><div className="mt-2 flex flex-wrap items-center gap-2"><Badge variant={widget.is_published ? "default" : "secondary"} className={widget.is_published ? "bg-emerald-50 text-emerald-800 hover:bg-emerald-50" : ""}>{widget.is_published ? "Published" : "Unpublished"}</Badge>{widget.campaign && <Badge variant="outline">{widget.campaign}</Badge>}</div></div>
                </div>
                <Button variant="ghost" size="icon" aria-label={`Delete ${widget.widget_name}`} title="Delete widget" className="shrink-0 text-muted-foreground hover:text-destructive" onClick={() => void remove(widget)}><Trash2 className="h-4 w-4" /></Button>
              </div>

              <div className="mx-5 overflow-hidden rounded-xl border border-border/70 bg-[#f7f7f6]">
                {widget.is_published ? (
                  <iframe title={`Preview of ${widget.widget_name}`} src={`/embed/${widget.id}`} loading="lazy" className="block w-full bg-transparent" style={{ height: widget.widget_type === "badge" ? 100 : widget.widget_type === "single" ? 190 : 250, border: 0 }} />
                ) : (
                  <div className="flex min-h-[180px] flex-col items-center justify-center p-6 text-center"><Eye className="mb-2 h-6 w-6 text-muted-foreground" /><p className="text-sm font-medium">Preview hidden while unpublished</p><p className="mt-1 text-xs text-muted-foreground">Publish this widget to preview exactly what visitors will see.</p></div>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                <div className="flex items-center gap-4 text-xs text-muted-foreground"><span className="inline-flex items-center gap-1.5"><Eye className="h-3.5 w-3.5" />{Number(widget.views || 0).toLocaleString()} views</span><span className="inline-flex items-center gap-1.5"><MousePointerClick className="h-3.5 w-3.5" />{Number(widget.clicks || 0).toLocaleString()} clicks</span></div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button size="sm" variant="outline" className="rounded-lg" onClick={() => window.open(`/embed/${widget.id}`, "_blank", "noopener,noreferrer")} disabled={!widget.is_published}><ExternalLink className="mr-1.5 h-3.5 w-3.5" /> Preview</Button>
                  <Button size="sm" variant="outline" className="rounded-lg" onClick={() => void copyEmbed(widget)} disabled={!widget.is_published}>{copiedId === widget.id ? <Check className="mr-1.5 h-3.5 w-3.5" /> : <Code2 className="mr-1.5 h-3.5 w-3.5" />}{copiedId === widget.id ? "Copied" : "Copy embed"}</Button>
                </div>
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-border/70 bg-muted/25 px-5 py-3">
                <span className="text-xs font-medium text-muted-foreground">{widget.is_published ? "Visible to website visitors" : "Hidden from website visitors"}</span>
                <Button variant={widget.is_published ? "ghost" : "default"} size="sm" className="rounded-lg" disabled={updatingIds.has(widget.id)} onClick={() => void togglePublished(widget)}>{updatingIds.has(widget.id) ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}{widget.is_published ? "Unpublish" : "Publish widget"}</Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </AppShell>
  );
};

export default Widgets;
