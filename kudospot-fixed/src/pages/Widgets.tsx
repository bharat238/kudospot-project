import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Plus, Copy, Trash2, Star, ExternalLink } from "lucide-react";
import { usePlanLimits } from "@/hooks/usePlanLimits";

const TYPES = [
  { value: "wall", label: "Wall of Love (grid)" },
  { value: "carousel", label: "Carousel" },
  { value: "single", label: "Single quote" },
  { value: "badge", label: "Rating badge" },
];

const Widgets = () => {
  const { user } = useAuth();
  const { canAddWidget, showUpgradeToast } = usePlanLimits();
  const [widgets, setWidgets] = useState<Tables<"widgets">[]>([]);
  type TestimonialPickerItem = Pick<
    Tables<"testimonials">,
    "id" | "customer_name" | "approved_text" | "ai_rewritten_text" | "original_text" | "rating"
  >;
  const [testimonials, setTestimonials] = useState<TestimonialPickerItem[]>([]);
  const [open, setOpen] = useState(false);
  const blank = { widget_name: "", widget_type: "wall", testimonial_ids: [] as string[], campaign: "" as string, settings: { primary_color: "#7C3AED", radius: 12 } };
  const [form, setForm] = useState<any>(blank);

  const load = async () => {
    if (!user) return;
    const [{ data: w }, { data: t }] = await Promise.all([
      supabase.from("widgets").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("testimonials").select("id, customer_name, approved_text, ai_rewritten_text, original_text, rating").eq("user_id", user.id).eq("status", "approved"),
    ]);
    setWidgets(w || []); setTestimonials(t || []);
  };
  useEffect(() => { load(); }, [user]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!canAddWidget(widgets.length)) return showUpgradeToast("more widgets");
    if (form.testimonial_ids.length === 0) return toast.error("Pick at least one testimonial.");
    const { error } = await supabase.from("widgets").insert({ ...form, user_id: user.id });
    if (error) return toast.error(error.message);
    toast.success("Widget created");
    setOpen(false); setForm(blank); load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this widget?")) return;
    await supabase.from("widgets").delete().eq("id", id);
    toast.success("Deleted"); load();
  };

  const embedCode = (id: string) => `<iframe src="${window.location.origin}/embed/${id}" style="width:100%;border:0;min-height:400px" loading="lazy" title="KudoSpot Testimonial Widget"></iframe>`;

  return (
    <AppShell>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-1">Widgets</h1>
          <p className="text-muted-foreground">Drop testimonials onto any website.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" /> New widget</Button></DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>New widget</DialogTitle>
              <DialogDescription>Create a new testimonial widget to embed on your website.</DialogDescription>
            </DialogHeader>
            <form onSubmit={create} className="space-y-4">
              <div><Label>Name</Label><Input required value={form.widget_name} onChange={(e) => setForm({ ...form, widget_name: e.target.value })} placeholder="Homepage wall" /></div>
              <div>
                <Label>Type</Label>
                <Select value={form.widget_type} onValueChange={(v) => setForm({ ...form, widget_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Testimonials to include</Label>
                {testimonials.length === 0 ? (
                  <p className="text-sm text-muted-foreground mt-2">No approved testimonials yet. Approve some first.</p>
                ) : (
                  <div className="border rounded-lg max-h-60 overflow-y-auto divide-y">
                    {testimonials.map((t) => (
                      <label key={t.id} className="flex items-start gap-3 p-3 cursor-pointer hover:bg-secondary/40">
                        <Checkbox
                          checked={form.testimonial_ids.includes(t.id)}
                          onCheckedChange={(c) => {
                            const next = c ? [...form.testimonial_ids, t.id] : form.testimonial_ids.filter((x: string) => x !== t.id);
                            setForm({ ...form, testimonial_ids: next });
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium">{t.customer_name}</div>
                          <div className="text-xs text-muted-foreground line-clamp-2">{t.approved_text || t.ai_rewritten_text || t.original_text}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><Label>Accent color</Label><Input type="color" value={form.settings.primary_color} onChange={(e) => setForm({ ...form, settings: { ...form.settings, primary_color: e.target.value } })} /></div>
                <div><Label>Campaign tag</Label><Input value={form.campaign} onChange={(e) => setForm({ ...form, campaign: e.target.value })} placeholder="e.g. spring-launch" /></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label>Corner radius</Label>
                  <Select
                    value={String(form.settings.radius)}
                    onValueChange={(v) => setForm({ ...form, settings: { ...form.settings, radius: Number(v) } })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Sharp (0px)</SelectItem>
                      <SelectItem value="6">Subtle (6px)</SelectItem>
                      <SelectItem value="12">Rounded (12px)</SelectItem>
                      <SelectItem value="20">Rounder (20px)</SelectItem>
                      <SelectItem value="9999">Pill (full)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col">
                  <Label className="mb-2">Preview</Label>
                  <div
                    className="flex-1 border p-3 flex flex-col gap-2"
                    style={{ borderRadius: form.settings.radius, borderColor: form.settings.primary_color, borderWidth: 1 }}
                  >
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <svg key={i} xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 24 24" fill={form.settings.primary_color}>
                          <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
                        </svg>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground leading-tight line-clamp-2">Great product, loved every bit of it!</p>
                    <div className="flex items-center gap-1.5 mt-auto pt-2 border-t" style={{ borderColor: `${form.settings.primary_color}33` }}>
                      <div className="h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white" style={{ background: form.settings.primary_color }}>
                        A
                      </div>
                      <div>
                        <div className="text-[10px] font-semibold">Alex M.</div>
                        <div className="text-[9px] text-muted-foreground">CEO, Acme</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <Button type="submit" className="w-full">Create widget</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {widgets.length === 0 ? (
        <Card className="p-16 text-center text-muted-foreground">No widgets yet.</Card>
      ) : (
        <div className="grid gap-4">
          {widgets.map((w) => (
            <Card key={w.id} className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="font-semibold flex items-center gap-2">
                    {w.widget_name}
                    {w.campaign && <span className="text-[10px] uppercase tracking-wide bg-primary-light text-primary px-1.5 py-0.5 rounded font-semibold">{w.campaign}</span>}
                  </div>
                  {(w.settings as any)?.primary_color && (
                    <span
                      className="inline-block h-3 w-3 rounded-full border border-white shadow-sm"
                      style={{ background: (w.settings as any).primary_color }}
                      title={(w.settings as any).primary_color}
                    />
                  )}
                  <div className="text-xs text-muted-foreground capitalize">{w.widget_type} · {w.testimonial_ids?.length || 0} testimonials · {w.views} views</div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => window.open(`/embed/${w.id}`, "_blank")}><ExternalLink className="h-3.5 w-3.5 mr-1" /> Preview</Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => remove(w.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-secondary/50 p-2 rounded-lg">
                <code className="text-xs flex-1 truncate">{embedCode(w.id)}</code>
                <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(embedCode(w.id)); toast.success("Embed code copied"); }}><Copy className="h-3.5 w-3.5" /></Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </AppShell>
  );
};

export default Widgets;
