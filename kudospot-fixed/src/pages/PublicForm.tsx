import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Star, Check } from "lucide-react";
import KudoSpotIcon from "@/components/KudoSpotIcon";
import { toast } from "sonner";
import { trackEvent } from "@/lib/track";
import { Helmet } from "react-helmet";
import { FunctionsHttpError } from "@supabase/supabase-js";
import type { Tables } from "@/integrations/supabase/types";

const contrastTextFor = (hex: string) => {
  const normalized = /^#[0-9a-fA-F]{6}$/.test(hex) ? hex.slice(1) : "C8F34C";
  const channels = [0, 2, 4].map((offset) => parseInt(normalized.slice(offset, offset + 2), 16) / 255);
  const linear = channels.map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
  const luminance = 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
  return luminance > 0.179 ? "#202126" : "#ffffff";
};

const PublicForm = () => {
  const { slug } = useParams();
  const [form, setForm] = useState<Tables<"collection_forms"> | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  const [data, setData] = useState({ customer_name: "", customer_role: "", customer_company: "", customer_email: "", original_text: "", rating: 5 });
  const [submitCount, setSubmitCount] = useState(0);
  const [lastSubmitTime, setLastSubmitTime] = useState(0);
  const MAX_CHARS = 2000;

  useEffect(() => {
    (async () => {
      const { data: f } = await supabase.from("collection_forms").select("*").eq("public_slug", slug).eq("is_active", true).maybeSingle();
      setForm(f); setLoading(false);
      if (f) trackEvent({ user_id: f.user_id, event_type: "form_view", entity_id: f.id, entity_type: "form", campaign: f.campaign });
    })();
  }, [slug]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;

    if (honeypot) {
      // Bot detected — silently succeed without inserting
      setSubmitted(true);
      return;
    }

    // Minimum length validation
    if ((data.original_text || "").trim().length < 20) {
      toast.error("Please write at least 20 characters.");
      return;
    }

    // Rate limiting: max 3 submissions per minute
    const now = Date.now();
    if (submitCount >= 3 && now - lastSubmitTime < 60000) {
      toast.error("Too many submissions. Please wait a minute.");
      return;
    }
    setSubmitCount((prev) => prev + 1);
    setLastSubmitTime(now);

    setSubmitting(true);
    try {
      const { data: responseData, error } = await supabase.functions.invoke("submit-testimonial", {
        body: {
          user_id: form.user_id,
          form_id: form.id,
          customer_name: data.customer_name,
          customer_role: data.customer_role || null,
          customer_company: data.customer_company || null,
          customer_email: data.customer_email || null,
          original_text: data.original_text,
          rating: form.collect_rating ? data.rating : null,
          campaign: form.campaign || null,
        },
      });
      if (error) {
        const status = error instanceof FunctionsHttpError ? error.context.status : undefined;
        if (status === 429) {
          toast.error("Too many submissions — please wait a minute and try again.");
        } else {
          toast.error("Something went wrong. Please try again.");
        }
        return;
      }
      try {
        await supabase.functions.invoke("notify-owner", {
          body: {
            form_id: form.id,
            testimonial_id: responseData?.id,
          },
        });
      } catch {
        // Non-critical — don't block the thank-you screen if this fails
      }
      setSubmitted(true);
    } finally {
      // keep submit button disabled for 3s to avoid double clicks
      setTimeout(() => setSubmitting(false), 3000);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
  if (!form) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Form not found.</div>;

  const accent = form.brand_color || "#C8F34C";
  const accentText = contrastTextFor(accent);
  const questions: string[] = Array.isArray(form.questions) ? form.questions : [];
  const pageTitle = form.form_name || form.headline || "Share your experience";
  const pageDesc = form.subheadline || `Share your experience with ${pageTitle}.`;

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary/30 p-4">
        <Helmet>
          <title>{pageTitle}</title>
          <meta name="description" content={pageDesc} />
          <meta property="og:title" content={pageTitle} />
          <meta property="og:description" content={pageDesc} />
          <meta name="robots" content="noindex" />
        </Helmet>
        <Card className="max-w-md w-full p-10 text-center">
          {form.logo_url && <img src={form.logo_url} alt="Logo" className="h-12 mx-auto mb-4 object-contain" />}
          <div className="h-14 w-14 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: accent, color: accentText }}>
            <Check className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold mb-2">{form.thank_you_message}</h1>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-[#eaebef] px-3 py-6 sm:px-4 sm:py-10">
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDesc} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDesc} />
        <meta name="robots" content="noindex" />
      </Helmet>
      <Card className="mx-auto w-full max-w-xl rounded-[22px] border-[#e6e8ed] p-5 shadow-[0_6px_24px_rgba(30,34,42,0.06)] sm:p-8">
        {form.logo_url ? (
          <img src={form.logo_url} alt="Logo" className="h-12 mb-5 object-contain" />
        ) : (
          <div className="flex items-center gap-2 text-xs font-semibold uppercase mb-4" style={{ color: accent }}>
            <KudoSpotIcon className="h-3.5 w-3.5" /> Powered by KudoSpot
          </div>
        )}
        <h1 className="text-3xl font-bold mb-2">{form.headline}</h1>
        {form.subheadline && <p className="text-muted-foreground mb-6">{form.subheadline}</p>}

        <form onSubmit={submit} className="space-y-4">
          <input
            type="text"
            name="website"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
            style={{ display: 'none' }}
            tabIndex={-1}
            autoComplete="off"
          />
          {form.collect_rating && (
            <div>
              <Label>How would you rate your experience?</Label>
              <div className="flex gap-1 mt-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button type="button" key={n} onClick={() => setData({ ...data, rating: n })}>
                    <Star className={`h-8 w-8 ${n <= data.rating ? "fill-warning text-warning" : "text-muted"}`} />
                  </button>
                ))}
              </div>
            </div>
          )}
          <div>
            <Label>Your testimonial *</Label>
            {questions.length > 0 && (
              <ul className="text-xs text-muted-foreground mt-1 mb-2 list-disc pl-5 space-y-0.5">
                {questions.map((q, i) => <li key={i}>{q}</li>)}
              </ul>
            )}
            <Textarea
              required
              rows={6}
              value={data.original_text}
              onChange={(e) => setData({ ...data, original_text: e.target.value })}
              maxLength={MAX_CHARS}
              placeholder="Tell us your story…"
            />
            <div style={{ 
              textAlign: 'right', 
              fontSize: '12px', 
              marginTop: '4px', 
              color: data.original_text.length >= MAX_CHARS 
                ? '#ef4444' 
                : data.original_text.length >= MAX_CHARS * 0.9 
                ? '#f59e0b' 
                : '#9ca3af', 
            }}>
              {data.original_text.length} / {MAX_CHARS}
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div><Label>Name *</Label><Input required value={data.customer_name} onChange={(e) => setData({ ...data, customer_name: e.target.value })} /></div>
            <div><Label>Email</Label><Input type="email" value={data.customer_email} onChange={(e) => setData({ ...data, customer_email: e.target.value })} /></div>
            <div><Label>Role</Label><Input value={data.customer_role} onChange={(e) => setData({ ...data, customer_role: e.target.value })} /></div>
            <div><Label>Company</Label><Input value={data.customer_company} onChange={(e) => setData({ ...data, customer_company: e.target.value })} /></div>
          </div>
          <Button type="submit" disabled={submitting} className="w-full font-semibold" style={{ background: accent, color: accentText }}>
            {submitting ? "Sending…" : "Submit testimonial"}
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default PublicForm;
