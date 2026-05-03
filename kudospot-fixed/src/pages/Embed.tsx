import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Star } from "lucide-react";
import { trackEvent } from "@/lib/track";

const Embed = () => {
  const { id } = useParams();
  const [widget, setWidget] = useState<any | null>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    (async () => {
      const { data: w } = await supabase.from("widgets").select("*").eq("id", id).eq("is_published", true).maybeSingle();
      if (!w) { setLoading(false); return; }
      setWidget(w);
      if (w.testimonial_ids?.length) {
        const { data: t } = await supabase.from("testimonials").select("*").in("id", w.testimonial_ids);
        setItems(t || []);
      }
      // atomic increment views (best-effort)
      supabase.rpc("increment_widget_views", { widget_id: w.id }).then(() => {});
      trackEvent({ user_id: w.user_id, event_type: "widget_view", entity_id: w.id, entity_type: "widget", campaign: w.campaign });
      setLoading(false);
    })();
  }, [id]);

  const handleClick = () => {
    if (!widget) return;
    supabase.rpc("increment_widget_clicks", { widget_id: widget.id }).then(() => {});
    trackEvent({ user_id: widget.user_id, event_type: "widget_click", entity_id: widget.id, entity_type: "widget", campaign: widget.campaign });
  };

  useEffect(() => {
    if (widget?.widget_type !== "carousel" || items.length < 2) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % items.length), 5000);
    return () => clearInterval(t);
  }, [widget, items]);

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  if (!widget) return <div className="p-6 text-sm text-muted-foreground">Widget unavailable.</div>;

  const accent = widget.settings?.primary_color || "#7C3AED";
  const radius = widget.settings?.radius ?? 12;
  const text = (t: any) => t.approved_text || t.ai_rewritten_text || t.original_text;

  const Quote = ({ t }: { t: any }) => (
    <div onClick={handleClick} className="bg-white border p-5 shadow-sm cursor-pointer hover:shadow-md transition" style={{ borderRadius: radius }}>
      {t.rating && <div className="flex mb-2">{[...Array(t.rating)].map((_, i) => <Star key={i} className="h-3.5 w-3.5 fill-current" style={{ color: accent }} />)}</div>}
      <p className="text-sm leading-relaxed text-gray-700 mb-3">"{text(t)}"</p>
      <div className="flex items-center gap-2">
        <div className="h-9 w-9 rounded-full flex items-center justify-center text-white font-semibold text-sm" style={{ background: accent }}>{t.customer_name?.[0]?.toUpperCase()}</div>
        <div>
          <div className="text-sm font-semibold">{t.customer_name}</div>
          <div className="text-xs text-gray-500">{[t.customer_role, t.customer_company].filter(Boolean).join(" · ")}</div>
        </div>
      </div>
    </div>
  );

  if (widget.widget_type === "badge") {
    const avg = items.reduce((s, t) => s + (t.rating || 5), 0) / Math.max(items.length, 1);
    return (
      <div className="p-4 inline-flex items-center gap-2 bg-white border" style={{ borderRadius: radius }}>
        <Star className="h-5 w-5 fill-current" style={{ color: accent }} />
        <span className="font-bold">{avg.toFixed(1)}</span>
        <span className="text-sm text-gray-600">from {items.length} customers</span>
      </div>
    );
  }

  if (widget.widget_type === "single") {
    return <div className="p-4">{items[0] && <Quote t={items[0]} />}</div>;
  }

  if (widget.widget_type === "carousel") {
    return (
      <div className="p-4">
        {items[idx] && <Quote t={items[idx]} />}
        <div className="flex gap-1 justify-center mt-3">
          {items.map((_, i) => <button key={i} onClick={() => setIdx(i)} className="h-1.5 rounded-full transition-all" style={{ width: i === idx ? 24 : 8, background: i === idx ? accent : "#d1d5db" }} />)}
        </div>
      </div>
    );
  }

  // wall
  return (
    <div className="p-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map((t) => <Quote key={t.id} t={t} />)}
    </div>
  );
};

export default Embed;
