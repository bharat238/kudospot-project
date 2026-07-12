import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Plus, Copy, Trash2, Loader2, Linkedin, Instagram, Twitter, Download, Quote } from "lucide-react";
import KudoSpotIcon from "@/components/KudoSpotIcon";
import { usePlanLimits } from "@/hooks/usePlanLimits";

import type { Database } from "@/integrations/supabase/types";
type SocialPost = Database["public"]["Tables"]["social_posts"]["Row"];
type SocialPostWithTestimonial = SocialPost & {
  customer_name: string;
  customer_role: string | null;
  approved_text: string | null;
  ai_rewritten_text: string | null;
  original_text: string | null;
};

const ICONS: Record<string, any> = { linkedin: Linkedin, instagram: Instagram, twitter: Twitter };

const SocialPosts = () => {
  const { user } = useAuth();
  const { plan, canDoAIRewrite, showUpgradeToast } = usePlanLimits();
  const [posts, setPosts] = useState<SocialPostWithTestimonial[]>([]);
  const [testimonials, setTestimonials] = useState<any[]>([]);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [form, setForm] = useState({ testimonial_id: "", platform: "linkedin" });
  const graphicRefs = useRef<Map<string, HTMLDivElement>>(new Map());

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

      const [{ data: t }, { data: pr }] = await Promise.all([
        supabase.from("testimonials").select("id, customer_name").eq("user_id", user.id).eq("status", "approved"),
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

  const generate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.testimonial_id) return toast.error("Pick a testimonial.");
    if (plan === "free") {
      const generatedCount = posts.length;
      if (!canDoAIRewrite(generatedCount)) return showUpgradeToast("more AI social posts");
    }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-social-post", { body: form });
      if (error) throw error;
      
      toast.success("Post generated!");
      setOpen(false); setForm({ testimonial_id: "", platform: "linkedin" });
      load();
    } catch (e: any) {
      toast.error(e.message || "Generation failed");
    } finally { setGenerating(false); }
  };

  const remove = async (id: string) => {
    await supabase.from("social_posts").delete().eq("id", id);
    toast.success("Deleted"); load();
  };

  const updateCaption = async (id: string, caption_text: string) => {
    await supabase.from("social_posts").update({ caption_text }).eq("id", id);
    setPosts((ps) => ps.map((p) => p.id === id ? { ...p, caption_text } : p));
  };

  const downloadGraphic = async (post: any) => {
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
    } catch (e: any) {
      console.error("PNG download failed:", e);
      toast.error("PNG download failed. Please try in Chrome or copy the text manually.", {
        duration: 5000,
      });
    } finally {
      setDownloadingId(null);
    }
  };

  const quoteText = (t: any) => t?.approved_text || t?.ai_rewritten_text || t?.original_text || "";

  return (
    <AppShell>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-1">Social posts</h1>
          <p className="text-muted-foreground">Platform-tailored captions, generated from your testimonials.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" /> Generate</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Generate social post</DialogTitle></DialogHeader>
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
                {generating ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Generating…</> : <><KudoSpotIcon className="h-4 w-4 mr-1" /> Generate</>}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
  
        {loading ? (
          <div className="flex flex-col items-center justify-center p-24 text-muted-foreground">
            <Loader2 className="h-12 w-12 animate-spin mb-4 opacity-20" />
            <p>Loading your social posts...</p>
          </div>
        ) : posts.length === 0 ? (
          <Card className="p-16 text-center text-muted-foreground">
            <KudoSpotIcon className="h-12 w-12 mx-auto mb-3 opacity-20" />
            No posts yet. Generate your first one.
          </Card>
        ) : (
          <div className="grid gap-4">
          {posts.map((p) => {
            const Icon = ICONS[p.platform] || Linkedin;
            return (
              <Card key={p.id} className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-primary" />
                    <span className="font-semibold capitalize">{p.platform}</span>
                    <span className="text-xs text-muted-foreground">· {p.customer_name}</span>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(p.caption_text); toast.success("Caption copied"); }}><Copy className="h-3.5 w-3.5" /></Button>
                    <Button size="sm" variant="outline" onClick={() => downloadGraphic(p)} disabled={downloadingId === p.id}>
                      {downloadingId === p.id ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Download className="h-3.5 w-3.5 mr-1" />} PNG
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => remove(p.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
                <Textarea rows={6} value={p.caption_text} onChange={(e) => updateCaption(p.id, e.target.value)} className="text-sm" />
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
              background: "linear-gradient(135deg, #faf5ff 0%, #ffffff 60%)",
              borderLeft: "12px solid #7C3AED", display: "flex", flexDirection: "column", justifyContent: "space-between",
              fontFamily: "Inter, system-ui, sans-serif", color: "#1a1a2e",
            }}
          >
            <div>
              <Quote size={72} color="#7C3AED" strokeWidth={2} />
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
                <div style={{ fontSize: 24, color: "#7C3AED", fontWeight: 600 }}>
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
