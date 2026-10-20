import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Star, MessageSquareQuote, AlertCircle } from "lucide-react";
import { trackEvent } from "@/lib/track";

type WidgetRecord = {
  id: string;
  user_id: string;
  widget_type: string;
  testimonial_ids: string[] | null;
  settings: { primary_color?: string; radius?: number } | null;
  campaign: string | null;
};

type PublicTestimonial = {
  id: string;
  customer_name: string | null;
  customer_role: string | null;
  customer_company: string | null;
  approved_text: string | null;
  ai_rewritten_text: string | null;
  original_text: string;
  rating: number | null;
  status: string;
};

const Embed = () => {
  const { id } = useParams();
  const [widget, setWidget] = useState<WidgetRecord | null>(null);
  const [items, setItems] = useState<PublicTestimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    let current = true;
    const load = async () => {
      setLoading(true);
      setFailed(false);
      setWidget(null);
      setItems([]);
      if (!id) {
        setFailed(true);
        setLoading(false);
        return;
      }
      try {
        const { data: foundWidget, error: widgetError } = await supabase
          .from("widgets")
          .select("id,user_id,widget_type,testimonial_ids,settings,campaign")
          .eq("id", id)
          .eq("is_published", true)
          .maybeSingle();
        if (widgetError) throw widgetError;
        if (!foundWidget) {
          if (current) setLoading(false);
          return;
        }
        const safeWidget = foundWidget as WidgetRecord;
        let approvedItems: PublicTestimonial[] = [];
        if (safeWidget.testimonial_ids?.length) {
          const { data, error } = await supabase
            .from("testimonials")
            .select("id,customer_name,customer_role,customer_company,approved_text,ai_rewritten_text,original_text,rating,status")
            .in("id", safeWidget.testimonial_ids)
            .eq("approval_status", "approved");
          if (error) throw error;
          approvedItems = ((data || []) as PublicTestimonial[]).sort((a, b) => {
            const aIndex = safeWidget.testimonial_ids?.indexOf(a.id) ?? -1;
            const bIndex = safeWidget.testimonial_ids?.indexOf(b.id) ?? -1;
            return (aIndex < 0 ? Number.MAX_SAFE_INTEGER : aIndex) - (bIndex < 0 ? Number.MAX_SAFE_INTEGER : bIndex);
          });
        }
        if (!current) return;
        setWidget(safeWidget);
        setItems(approvedItems);
        void supabase.rpc("increment_widget_views", { widget_id: safeWidget.id });
        void trackEvent({ user_id: safeWidget.user_id, event_type: "widget_view", entity_id: safeWidget.id, entity_type: "widget", campaign: safeWidget.campaign });
      } catch (error) {
        console.error("Unable to load published widget:", error);
        if (current) setFailed(true);
      } finally {
        if (current) setLoading(false);
      }
    };
    void load();
    return () => { current = false; };
  }, [id]);

  useEffect(() => {
    if (widget?.widget_type !== "carousel" || items.length < 2) return;
    const timer = window.setInterval(() => setIdx((current) => (current + 1) % items.length), 5000);
    return () => window.clearInterval(timer);
  }, [widget?.widget_type, items.length]);

  // Tell the host page how tall the rendered embed is. The embed snippet and
  // the in-product preview both listen for this message to avoid clipped grids.
  useEffect(() => {
    if (!id || window.parent === window) return;

    const notifyHeight = () => {
      const height = Math.max(
        document.documentElement.scrollHeight,
        document.body?.scrollHeight || 0,
      );
      window.parent.postMessage({
        type: "kudospot-widget-resize",
        widgetId: id,
        height: Math.ceil(height),
      }, "*");
    };

    notifyHeight();
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(notifyHeight) : null;
    observer?.observe(document.documentElement);
    if (document.body) observer?.observe(document.body);
    window.addEventListener("load", notifyHeight);

    return () => {
      observer?.disconnect();
      window.removeEventListener("load", notifyHeight);
    };
  }, [id, loading, failed, widget, items, idx]);

  const accent = widget?.settings?.primary_color || "#C94320";
  const radius = widget?.settings?.radius ?? 12;
  const displayText = (item: PublicTestimonial) => item.approved_text || item.ai_rewritten_text || item.original_text;
  const ratedItems = useMemo(() => items.filter((item) => typeof item.rating === "number" && item.rating >= 1 && item.rating <= 5), [items]);
  const averageRating = ratedItems.length ? ratedItems.reduce((sum, item) => sum + (item.rating || 0), 0) / ratedItems.length : null;

  const trackMeaningfulClick = () => {
    if (!widget) return;
    void supabase.rpc("increment_widget_clicks", { widget_id: widget.id });
    void trackEvent({ user_id: widget.user_id, event_type: "widget_click", entity_id: widget.id, entity_type: "widget", campaign: widget.campaign });
  };

  const Quote = ({ item }: { item: PublicTestimonial }) => (
    <article className="min-w-0 border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md" style={{ borderRadius: radius }}>
      {item.rating && (
        <div className="mb-2 flex gap-0.5" aria-label={`Rated ${item.rating} out of 5`}>
          {[1, 2, 3, 4, 5].map((number) => <Star key={number} className={`h-3.5 w-3.5 ${number <= item.rating! ? "fill-current" : ""}`} style={{ color: accent, opacity: number <= item.rating! ? 1 : 0.22 }} />)}
        </div>
      )}
      <p className="mb-4 whitespace-pre-line break-words text-sm leading-6 text-gray-700">“{displayText(item)}”</p>
      <div className="flex items-center gap-2.5 border-t border-gray-100 pt-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white" style={{ background: accent }}>{item.customer_name?.trim()?.[0]?.toUpperCase() || "C"}</div>
        <div className="min-w-0"><div className="truncate text-sm font-semibold text-gray-900">{item.customer_name || "Customer"}</div>{(item.customer_role || item.customer_company) && <div className="truncate text-xs text-gray-500">{[item.customer_role, item.customer_company].filter(Boolean).join(" · ")}</div>}</div>
      </div>
    </article>
  );

  if (loading) return <div className="flex min-h-[110px] items-center justify-center p-6 text-sm text-gray-500" aria-live="polite">Loading testimonials…</div>;

  if (!widget || failed) {
    return (
      <div className="flex min-h-[160px] flex-col items-center justify-center p-6 text-center font-sans text-gray-600">
        <AlertCircle className="mb-2 h-6 w-6 text-gray-400" />
        <p className="text-sm font-semibold">Widget unavailable</p>
        <p className="mt-1 max-w-xs text-xs leading-5">This widget may have been unpublished or the link may be incorrect. Please check the embed settings.</p>
      </div>
    );
  }

  if (widget.widget_type === "badge") {
    if (items.length === 0) {
      return <div className="inline-flex items-center gap-2 border border-gray-200 bg-white px-4 py-3 text-sm text-gray-600" style={{ borderRadius: radius }}><MessageSquareQuote className="h-4 w-4" style={{ color: accent }} /> No approved testimonials yet</div>;
    }
    return (
      <div className="inline-flex flex-wrap items-center gap-2 border border-gray-200 bg-white px-4 py-3 text-gray-900 shadow-sm" style={{ borderRadius: radius }}>
        <Star className="h-5 w-5 fill-current" style={{ color: accent }} />
        {averageRating !== null ? <span className="font-semibold tabular-nums">{averageRating.toFixed(1)} / 5</span> : <span className="font-semibold">Customer feedback</span>}
        <span className="text-sm text-gray-600">{ratedItems.length ? `from ${ratedItems.length} ratings` : `from ${items.length} testimonials`}</span>
      </div>
    );
  }

  if (items.length === 0) {
    return <div className="flex min-h-[160px] flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white p-6 text-center text-gray-600" style={{ borderRadius: radius }}><MessageSquareQuote className="mb-2 h-6 w-6" style={{ color: accent }} /><p className="text-sm font-semibold">No approved testimonials to show</p><p className="mt-1 max-w-xs text-xs leading-5">Add approved customer stories to this widget to display them here.</p></div>;
  }

  if (widget.widget_type === "single") return <div className="p-2 sm:p-3"><Quote item={items[0]} /></div>;

  if (widget.widget_type === "carousel") {
    const activeIndex = idx < items.length ? idx : 0;
    return (
      <div className="p-2 sm:p-3">
        <Quote item={items[activeIndex]} />
        {items.length > 1 && <div className="mt-3 flex justify-center gap-1.5" role="group" aria-label="Choose testimonial">
          {items.map((item, index) => <button key={item.id} type="button" aria-label={`Show testimonial ${index + 1}`} aria-pressed={index === activeIndex} onClick={() => { setIdx(index); trackMeaningfulClick(); }} className="h-2 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2" style={{ width: index === activeIndex ? 24 : 8, background: index === activeIndex ? accent : "#d1d5db", outlineColor: accent }} />)}
        </div>}
      </div>
    );
  }

  return <div className="grid grid-cols-1 gap-3 p-2 sm:grid-cols-2 sm:p-3 lg:grid-cols-3"><>{items.map((item) => <Quote key={item.id} item={item} />)}</></div>;
};

export default Embed;
