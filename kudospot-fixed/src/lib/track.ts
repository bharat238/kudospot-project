import { supabase } from "@/integrations/supabase/client";

export type TrackEventType =
  | "widget_view"
  | "widget_click"
  | "case_study_view"
  | "form_view"
  | "form_submit"
  | "approval_sent"
  | "approval_opened"
  | "approval_approved"
  | "approval_rejected";

export type EntityType = "widget" | "case_study" | "form" | "approval";

export const trackEvent = async (params: {
  user_id: string;
  event_type: TrackEventType;
  entity_id: string;
  entity_type: EntityType;
  source?: string;
  campaign?: string | null;
  metadata?: Record<string, any>;
}) => {
  try {
    await supabase.from("analytics_events").insert({
      user_id: params.user_id,
      event_type: params.event_type,
      entity_id: params.entity_id,
      entity_type: params.entity_type,
      source: params.source || (typeof document !== "undefined" ? new URL(document.referrer || window.location.href).hostname : null),
      campaign: params.campaign ?? null,
      metadata: params.metadata || {},
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 200) : null,
      referrer: typeof document !== "undefined" ? document.referrer.slice(0, 500) : null,
    });
  } catch {
    /* tracking is best-effort */
  }
};
