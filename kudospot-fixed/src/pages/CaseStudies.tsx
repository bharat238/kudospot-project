import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Plus, ExternalLink, Trash2, Loader2, Copy, X } from "lucide-react";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import KudoSpotIcon from "@/components/KudoSpotIcon";

import type { Database } from "@/integrations/supabase/types";
type CaseStudy = Database["public"]["Tables"]["case_studies"]["Row"];

const tryCopyText = async (value: string) => {
  try { await navigator.clipboard.writeText(value); return true; }
  catch { return false; }
};

const CaseStudies = () => {
  const { user } = useAuth();
  const { canAddCaseStudy, showUpgradeToast } = usePlanLimits();
  const [items, setItems] = useState<Tables<"case_studies">[]>([]);
  type TestimonialPickerItem = Pick<
    Tables<"testimonials">,
    "id" | "customer_name" | "approved_text" | "ai_rewritten_text" | "original_text"
  >;
  const [testimonials, setTestimonials] = useState<TestimonialPickerItem[]>([]);
  const [open, setOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [active, setActive] = useState<Tables<"case_studies"> | null>(null);
  const [form, setForm] = useState({ client_name: "", context: "", campaign: "", testimonial_ids: [] as string[] });

  const load = async () => {
    if (!user) return;
    const [{ data: cs }, { data: t }] = await Promise.all([
      supabase.from("case_studies").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("testimonials").select("id, customer_name, approved_text, ai_rewritten_text, original_text").eq("user_id", user.id).eq("approval_status", "approved"),
    ]);
    setItems(cs || []); setTestimonials(t || []);
  };
  useEffect(() => { load(); }, [user]);

  const generate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canAddCaseStudy(items.length)) return showUpgradeToast("case studies");
    if (form.testimonial_ids.length < 1) return toast.error("Pick at least one testimonial.");
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-case-study", {
        body: { testimonial_ids: form.testimonial_ids, client_name: form.client_name, context: form.context, campaign: form.campaign || null },
      });
      if (error) throw error;
      toast.success("Case study generated!");
      setOpen(false); setForm({ client_name: "", context: "", campaign: "", testimonial_ids: [] });
      setActive(data.case_study);
      load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Generation failed");
    } finally { setGenerating(false); }
  };

  const remove = async (id: string) => {
    if (!user || !window.confirm("Delete this case study? This cannot be undone.")) return;
    const { error } = await supabase.from("case_studies").delete().eq("id", id).eq("user_id", user.id);
    if (error) return toast.error(error.message || "The case study could not be deleted.");
    toast.success("Case study deleted");
    setActive(null);
    void load();
  };

  const togglePublish = async (cs: CaseStudy) => {
    if (!user) return;
    const next = !cs.is_published;
    const { error } = await supabase.from("case_studies").update({ is_published: next }).eq("id", cs.id).eq("user_id", user.id);
    if (error) return toast.error(error.message || "Publish status couldn't be changed.");
    toast.success(next ? "Case study published" : "Case study unpublished");
    setActive({ ...cs, is_published: next });
    void load();
  };

  const update = (field: "title" | "challenge" | "solution" | "results" | "pull_quote" | "campaign", value: string) => {
    if (!active) return;
    setActive({ ...active, [field]: value });
  };
  const saveActive = async () => {
    if (!active) return;
    const cleanedStats = Array.isArray(active.key_stats) ? active.key_stats.map((s: string) => (s || "").trim()).filter(Boolean) : [];
    const { error } = await supabase.from("case_studies").update({
      title: active.title, challenge: active.challenge, solution: active.solution, results: active.results, pull_quote: active.pull_quote, campaign: active.campaign || null, key_stats: cleanedStats,
    }).eq("id", active.id);
    if (error) return toast.error(error.message);
    toast.success("Saved"); load();
  };

  const updateStat = (i: number, v: string) => {
    if (!active) return;
    const stats = Array.isArray(active.key_stats) ? [...active.key_stats] : [];
    stats[i] = v;
    setActive({ ...active, key_stats: stats });
  };
  const addStat = () => {
    if (!active) return;
    const stats = Array.isArray(active.key_stats) ? [...active.key_stats] : [];
    if (stats.length >= 6) return toast.error("Max 6 stats.");
    setActive({ ...active, key_stats: [...stats, ""] });
  };
  const removeStat = (i: number) => {
    if (!active) return;
    const stats = Array.isArray(active.key_stats) ? [...active.key_stats] : [];
    setActive({ ...active, key_stats: stats.filter((_, j) => j !== i) });
  };

  const publicUrl = (slug: string) => `${window.location.origin}/case-studies/${slug}`;

  return (
    <AppShell>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-1">Case studies</h1>
          <p className="text-muted-foreground">Turn approved testimonials into shareable stories.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" /> Generate</Button></DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Generate case study</DialogTitle>
              <DialogDescription>Generate a new case study from your approved testimonials.</DialogDescription>
            </DialogHeader>
            <form onSubmit={generate} className="space-y-4">
              <div><Label>Client name</Label><Input value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })} placeholder="Acme Inc." /></div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div><Label>One-line context (optional)</Label><Input value={form.context} onChange={(e) => setForm({ ...form, context: e.target.value })} placeholder="B2B SaaS, used us for onboarding" /></div>
                <div><Label>Campaign tag</Label><Input value={form.campaign} onChange={(e) => setForm({ ...form, campaign: e.target.value })} placeholder="e.g. q4-enterprise" /></div>
              </div>
              <div>
                <Label>Source testimonials *</Label>
                {testimonials.length === 0 ? (
                  <p className="text-sm text-muted-foreground mt-2">Approve some testimonials first.</p>
                ) : (
                  <div className="border rounded-lg max-h-60 overflow-y-auto divide-y">
                    {testimonials.map((t) => (
                      <label key={t.id} className="flex items-start gap-3 p-3 cursor-pointer hover:bg-secondary/40">
                        <Checkbox
                          checked={form.testimonial_ids.includes(t.id)}
                          onCheckedChange={(c) => {
                            const next = c ? [...form.testimonial_ids, t.id] : form.testimonial_ids.filter((x) => x !== t.id);
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
              <Button type="submit" disabled={generating} className="w-full">
                {generating ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Generating…</> : <><KudoSpotIcon className="h-4 w-4 mr-1" /> Generate with AI</>}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {items.length === 0 ? (
        <Card className="rounded-[22px] border-dashed border-[#dfe2e7] bg-white px-6 py-12 text-center text-muted-foreground sm:px-10 sm:py-16">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#eaffae] text-[#303a1b]"><KudoSpotIcon className="h-6 w-6" /></div>
          <h2 className="text-lg font-semibold text-[#202126]">Turn an approved customer story into a case study.</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-[#777c85]">Choose approved testimonials and let AI draft the challenge, solution and results. You can edit the content before publishing a shareable page.</p>
          <Button className="mt-5 rounded-full bg-[#202126] text-white hover:bg-[#383b43]" onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" />Generate first case study</Button>
        </Card>
      ) : (
        <div className="grid gap-4">
          {items.map((cs) => (
            <Card key={cs.id} className="group h-full cursor-pointer rounded-[20px] border-[#e6e8ed] bg-white p-5 shadow-[0_2px_10px_rgba(35,38,48,0.025)] transition-all hover:-translate-y-0.5 hover:border-[#c8f34c] hover:shadow-[0_8px_24px_rgba(35,38,48,0.07)]" onClick={() => setActive(cs)}>
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#eaffae] text-[#303a1b]"><KudoSpotIcon className="h-4 w-4" /></span>
                  <div className="min-w-0"><p className="truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-[#777c85]">{cs.client_name || "Customer story"}</p><h2 className="mt-1 line-clamp-2 font-semibold leading-5 text-[#202126] group-hover:text-[#343c21]">{cs.title}</h2></div>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold ${cs.is_published ? "border border-[#dcebb8] bg-[#f1f8dd] text-[#405022]" : "border border-[#e6e8ed] bg-[#f5f6f8] text-[#626671]"}`}>
                  {cs.is_published ? "Published" : "Draft"}
                </span>
              </div>
              <p className="line-clamp-3 text-sm leading-6 text-[#686d77]">{cs.pull_quote || "Open this story to add the customer quote, challenge, solution and results."}</p>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[#eff0f3] pt-3 text-[10px] text-[#777c85]">
                <span>{cs.campaign ? `Campaign · ${cs.campaign}` : "AI-generated from approved testimonials"}</span>
                <span className="inline-flex items-center gap-1 font-semibold text-[#424750]">Edit story <ExternalLink className="h-3 w-3" /></span>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {active && (
            <>
              <DialogHeader>
                <DialogTitle>Case study</DialogTitle>
                <DialogDescription>View and manage this case study.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div><Label>Title</Label><Input value={active.title || ""} onChange={(e) => update("title", e.target.value)} /></div>
                  <div><Label>Campaign tag</Label><Input value={active.campaign || ""} onChange={(e) => update("campaign", e.target.value)} placeholder="Override or leave blank" /></div>
                </div>
                <div><Label>Pull quote</Label><Textarea rows={2} value={active.pull_quote || ""} onChange={(e) => update("pull_quote", e.target.value)} /></div>
                <div><Label>Challenge</Label><Textarea rows={4} value={active.challenge || ""} onChange={(e) => update("challenge", e.target.value)} /></div>
                <div><Label>Solution</Label><Textarea rows={4} value={active.solution || ""} onChange={(e) => update("solution", e.target.value)} /></div>
                <div><Label>Results</Label><Textarea rows={4} value={active.results || ""} onChange={(e) => update("results", e.target.value)} /></div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>Key stats</Label>
                    <Button type="button" size="sm" variant="outline" onClick={addStat}><Plus className="h-3 w-3 mr-1" /> Add stat</Button>
                  </div>
                  <div className="space-y-2">
                    {(Array.isArray(active.key_stats) ? active.key_stats : []).map((s: string, i: number) => (
                      <div key={i} className="flex items-center gap-2">
                        <Input value={s} onChange={(e) => updateStat(i, e.target.value)} placeholder={`Stat ${i + 1}`} />
                        <Button type="button" size="icon" variant="ghost" onClick={() => removeStat(i)}><X className="h-4 w-4" /></Button>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-3 pt-2 border-t">
                  <Switch checked={active.is_published} onCheckedChange={() => togglePublish(active)} />
                  <span className="text-sm">{active.is_published ? "Public" : "Private"}</span>
                  {active.is_published && (
                    <div className="flex items-center gap-1 ml-auto">
                      <Button size="sm" variant="outline" onClick={async () => { const copied = await tryCopyText(publicUrl(active.published_slug)); if (copied) { toast.success("Case study link copied"); } else { toast.error("Clipboard access was blocked. Copy the URL from your browser."); } }}><Copy className="h-3.5 w-3.5 mr-1" /> Copy link</Button>
                      <Button size="sm" variant="outline" onClick={() => window.open(publicUrl(active.published_slug), "_blank", "noopener,noreferrer")}><ExternalLink className="h-3.5 w-3.5 mr-1" /> Open</Button>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 pt-2">
                  <Button onClick={saveActive}>Save changes</Button>
                  <Button variant="ghost" className="text-destructive ml-auto" onClick={() => remove(active.id)}><Trash2 className="h-4 w-4 mr-1" /> Delete</Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
};

export default CaseStudies;
