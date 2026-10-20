import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Plus, Copy, Trash2, Loader2, Linkedin, Instagram, Twitter, Download, Quote, type LucideIcon } from "lucide-react";
import KudoSpotIcon from "@/components/KudoSpotIcon";
import { usePlanLimits } from "@/hooks/usePlanLimits";

import type { Database, Tables } from "@/integrations/supabase/types";
type SocialPost = Database["public"]["Tables"]["social_posts"]["Row"];
type SocialPostWithTestimonial = SocialPost & {
  customer_name: string;
  customer_role: string | null;
  approved_text: string | null;
  ai_rewritten_text: string | null;
  original_text: string | null;
};

const ICONS: Record<string, LucideIcon> = { linkedin: Linkedin, instagram: Instagram, twitter: Twitter };

const tryCopyText = async (value: string) => {
  try { await navigator.clipboard.writeText(value); return true; }
  catch { return false; }
};

const SocialPosts = () => {
  const { user } = useAuth();
  const { plan, showUpgradeToast } = usePlanLimits();
  const [posts, setPosts] = useState<SocialPostWithTestimonial[]>([]);
  const [captionDrafts, setCaptionDrafts] = useState<Record<string, string>>({});
  const [savingCaptionIds, setSavingCaptionIds] = useState<Set<string>>(new Set());
  const [testimonials, setTestimonials] = useState<Pick<Tables<"testimonials">, "id" | "customer_name">[]>([]);
  const [profile, setProfile] = useState<Pick<Tables<"profiles">, "business_name" | "business_logo_url"> | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [form, setForm] = useState({ testimonial_id: "", platform: "linkedin" });
  const graphicRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const loadingMessages = [
    "Analyzing testimonial...",
    "Writing caption...",
    "Almost done...",
  ];

  const load = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Step 1: fetch social posts
      const { data: postsData, error: postsError } = await supabase
        .from("social_posts")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (postsError) throw postsError;

      // Step 2: get unique testimonial IDs
      const testimonialIds = [...new Set((postsData || []).map(p => p.testimonial_id).filter(Boolean))];

      // Step 3: fetch the testimonial fields actually needed downstream —
      // not just the name for the card list, but also role + quote text
      // for the off-screen PNG graphic export (downloadGraphic/quoteText
      // below previously referenced a `p.testimonials` join that no longer
      // exists post-fix, silently breaking the "Download PNG" feature).
      const { data: testimonialsData } = await supabase
        .from("testimonials")
        .select("id, customer_name, customer_role, approved_text, ai_rewritten_text, original_text")
        .in("id", testimonialIds);

      // Step 4: build a lookup map keyed by testimonial id
      const testimonialMap = Object.fromEntries(
        (testimonialsData || []).map((t) => [t.id, t])
      );

      // Step 5: merge the fields the UI and the PNG export both need,
      // flat onto each post (no nested join object).
      const postsWithNames = (postsData || []).map((p) => {
        const source = testimonialMap[p.testimonial_id];
        return {
          ...p,
          customer_name: source?.customer_name ?? "—",
          customer_role: source?.customer_role ?? null,
          approved_text: source?.approved_text ?? null,
          ai_rewritten_text: source?.ai_rewritten_text ?? null,
          original_text: source?.original_text ?? null,
        };
      }) as SocialPostWithTestimonial[];

      setPosts(postsWithNames);
      setCaptionDrafts(Object.fromEntries(postsWithNames.map((post) => [post.id, post.caption_text || ""])));

      const [{ data: t }, { data: pr }] = await Promise.all([
        supabase.from("testimonials").select("id, customer_name").eq("user_id", user.id).eq("approval_status", "approved"),
        supabase.from("profiles").select("business_name, business_logo_url").eq("id", user.id).maybeSingle(),
      ]);
      setTestimonials(t || []); setProfile(pr || null);
    } catch (error) {
      console.error("Error loading social posts:", error);
      toast.error("Failed to load social posts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [user]);
  
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (generating) {
      setLoadingMessageIndex(0);
      interval = setInterval(() => {
        setLoadingMessageIndex(prev => (prev + 1) % loadingMessages.length);
      }, 1500);
    }
    return () => clearInterval(interval);
  }, [generating]);

  const generate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.testimonial_id) return toast.error("Pick a testimonial.");
    if (plan === "free") return showUpgradeToast("the social post generator");
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-social-post", { body: form });
      if (error) throw error;
      
      toast.success("Post generated!");
      setOpen(false); setForm({ testimonial_id: "", platform: "linkedin" });
      load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Generation failed");
    } finally { setGenerating(false); }
  };

  const remove = async (id: string) => {
    if (!window.confirm("Delete this social post?")) return;
    const { error } = await supabase.from("social_posts").delete().eq("id", id);
    if (error) return toast.error(error.message || "The social post could not be deleted.");
    toast.success("Social post deleted");
    void load();
  };

  const saveCaption = async (id: string) => {
    const caption_text = captionDrafts[id];
    const current = posts.find((post) => post.id === id)?.caption_text || "";
    if (caption_text === undefined || caption_text === current || savingCaptionIds.has(id)) return;
    setSavingCaptionIds((currentIds) => new Set(currentIds).add(id));
    const { error } = await supabase.from("social_posts").update({ caption_text }).eq("id", id);
    setSavingCaptionIds((currentIds) => {
      const next = new Set(currentIds);
      next.delete(id);
      return next;
    });
    if (error) {
      toast.error("Caption couldn't be saved. Your edit is still in the field; try again.");
      return;
    }
    setPosts((currentPosts) => currentPosts.map((post) => post.id === id ? { ...post, caption_text } : post));
    toast.success("Caption saved");
  };

  const downloadGraphic = async (post: SocialPostWithTestimonial) => {
    const node = graphicRefs.current.get(post.id);
    if (!node) return;
    setDownloadingId(post.id);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(node, { scale: 2, backgroundColor: "#ffffff", logging: false, useCORS: true });
      const link = document.createElement("a");
      const safeName = (post.customer_name || "testimonial").toLowerCase().replace(/[^a-z0-9]+/g, "-");
      link.download = `testimonial-${post.platform}-${safeName}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (e: unknown) {
      console.error("PNG download failed:", e instanceof Error ? e.message : String(e));
      toast.error("PNG download failed. Please try in Chrome or copy the text manually.", {
        duration: 5000,
      });
    } finally {
      setDownloadingId(null);
    }
  };

  const quoteText = (t: Pick<SocialPostWithTestimonial, "approved_text" | "ai_rewritten_text" | "original_text"> | null | undefined) => t?.approved_text || t?.ai_rewritten_text || t?.original_text || "";

  return (
    <AppShell>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-1">Social posts</h1>
          <p className="text-muted-foreground">Platform-tailored captions, generated from your testimonials.</p>
        </div>
        <Dialog open={open} onOpenChange={(nextOpen) => { if (plan === "free" && nextOpen) { showUpgradeToast("the social post generator"); return; } setOpen(nextOpen); }}>
          <DialogTrigger asChild><Button onClick={(event) => { if (plan === "free") { event.preventDefault(); showUpgradeToast("the social post generator"); } }}><Plus className="h-4 w-4 mr-1" /> {plan === "free" ? "Upgrade to generate" : "Generate"}</Button></DialogTrigger>
          <DialogContent className="max-h-[85dvh] w-[calc(100vw-2rem)] max-w-md overflow-y-auto rounded-2xl sm:w-full">
            <DialogHeader>
              <DialogTitle>Generate social post</DialogTitle>
              <DialogDescription>Generate a platform-specific social post from an approved testimonial.</DialogDescription>
            </DialogHeader>
            <form onSubmit={generate} className="space-y-4">
              <div>
                <Label>Testimonial</Label>
                <Select value={form.testimonial_id} onValueChange={(v) => setForm({ ...form, testimonial_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Pick a testimonial" /></SelectTrigger>
                  <SelectContent>{testimonials.map((t) => <SelectItem key={t.id} value={t.id}>{t.customer_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Platform</Label>
                <Select value={form.platform} onValueChange={(v) => setForm({ ...form, platform: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="linkedin">LinkedIn</SelectItem>
                    <SelectItem value="instagram">Instagram</SelectItem>
                    <SelectItem value="twitter">Twitter / X</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" disabled={generating} className="w-full">
                {generating ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> {loadingMessages[loadingMessageIndex]}</> : <><KudoSpotIcon className="h-4 w-4 mr-1" /> Generate</>}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
  
        {loading ? (
          <div className="flex min-h-56 flex-col items-center justify-center px-4 py-14 text-center text-muted-foreground">
            <Loader2 className="h-12 w-12 animate-spin mb-4 opacity-20" />
            <p>Loading your social posts...</p>
          </div>
        ) : posts.length === 0 ? (
          <Card className="rounded-[22px] border-dashed border-[#dfe2e7] bg-white px-6 py-12 text-center sm:px-10 sm:py-16">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#eaffae] text-[#303a1b]"><Quote className="h-6 w-6" /></div>
            <h2 className="text-lg font-semibold text-[#202126]">Your first social post starts here.</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#777c85]">Choose a customer-approved testimonial and prepare a platform-specific caption and downloadable graphic.</p>
            <Button className="mt-5 rounded-full bg-[#202126] text-white hover:bg-[#383b43]" onClick={() => { if (plan === "free") { showUpgradeToast("the social post generator"); return; } setOpen(true); }}><Plus className="mr-2 h-4 w-4" />{plan === "free" ? "Upgrade to generate" : "Generate first post"}</Button>
          </Card>
        ) : (
          <div className="grid gap-4">
          {posts.map((p) => {
            const Icon = ICONS[p.platform] || Linkedin;
            return (
              <Card key={p.id} className="rounded-[22px] border-[#e6e8ed] bg-white p-4 shadow-[0_3px_14px_rgba(36,40,50,0.035)] sm:p-5">
                <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex min-w-0 items-center gap-2">
                    <Icon className="h-4 w-4 text-primary" />
                    <span className="font-semibold capitalize">{p.platform}</span>
                    <span className="min-w-0 truncate text-xs text-muted-foreground">· {p.customer_name}</span>
                  </div>
                  <div className="flex flex-wrap justify-end gap-1 sm:shrink-0">
                    <Button size="sm" variant="ghost" aria-label={`Copy caption for ${p.customer_name || "testimonial"}`} title="Copy caption" onClick={async () => { const copied = await tryCopyText(captionDrafts[p.id] ?? p.caption_text); if (copied) { toast.success("Caption copied"); } else { toast.error("Clipboard access was blocked by your browser."); } }}><Copy className="h-3.5 w-3.5" /></Button>
                    <Button size="sm" variant="outline" onClick={() => downloadGraphic(p)} disabled={downloadingId === p.id}>
                      {downloadingId === p.id ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Download className="h-3.5 w-3.5 mr-1" />} PNG
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive" aria-label={`Delete social post for ${p.customer_name || "testimonial"}`} title="Delete post" onClick={() => remove(p.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
                <Textarea rows={6} aria-label={`Caption for ${p.customer_name || "testimonial"}`} value={captionDrafts[p.id] ?? p.caption_text} onChange={(e) => setCaptionDrafts((current) => ({ ...current, [p.id]: e.target.value }))} onBlur={() => void saveCaption(p.id)} className="text-sm" /><div className="mt-2 flex flex-wrap justify-start text-[11px] text-muted-foreground sm:justify-end">{savingCaptionIds.has(p.id) ? "Saving caption…" : (captionDrafts[p.id] ?? p.caption_text) !== p.caption_text ? "Unsaved changes · save when you leave this field" : "Caption saved"}</div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Off-screen renderable graphics for PNG export */}
      <div style={{ position: "absolute", left: -99999, top: 0 }} aria-hidden>
        {posts.map((p) => (
          <div
            key={`gfx-${p.id}`}
            ref={(el) => el && graphicRefs.current.set(p.id, el)}
            style={{
              width: 1080, height: 1080, padding: 80, boxSizing: "border-box",
              background: "linear-gradient(135deg, #f4f4f3 0%, #ffffff 60%)",
              borderLeft: "12px solid #C8F34C", display: "flex", flexDirection: "column", justifyContent: "space-between",
              fontFamily: "Inter, system-ui, sans-serif", color: "#1a1a2e",
            }}
          >
            <div>
              <Quote size={72} color="#37431d" strokeWidth={2} />
              <p style={{ fontSize: 38, fontWeight: 500, lineHeight: 1.4, marginTop: 32, color: "#222" }}>
                "{quoteText(p)}"
              </p>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
              <div>
                <div style={{ fontSize: 28, fontWeight: 700 }}>{p.customer_name}</div>
                {p.customer_role && (
                  <div style={{ fontSize: 22, color: "#666", marginTop: 4 }}>{p.customer_role}</div>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <KudoSpotIcon className="h-12 w-12" />
                <div style={{ fontSize: 24, color: "#37431d", fontWeight: 600 }}>
                  {profile?.business_name || "KudoSpot" }
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  );
};

export default SocialPosts;
