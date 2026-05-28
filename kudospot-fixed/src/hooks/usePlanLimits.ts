import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export const PLAN_LIMITS = {
  free:    { testimonials: 10, ai_rewrites: 5,  widgets: 1,  case_studies: 0,  video_testimonials: 0  },
  starter: { testimonials: -1, ai_rewrites: -1, widgets: 5,  case_studies: 3,  video_testimonials: 20 },
  pro:     { testimonials: -1, ai_rewrites: -1, widgets: -1, case_studies: -1, video_testimonials: -1 },
} as const;

export type PlanName = keyof typeof PLAN_LIMITS;

const within = (count: number, max: number) => max === -1 || count < max;

export const usePlanLimits = () => {
  const { user } = useAuth();
  const [plan, setPlan] = useState<PlanName>("free");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    supabase.from("profiles").select("plan").eq("id", user.id).maybeSingle().then(({ data }) => {
      const p = (data?.plan as PlanName) || "free";
      setPlan(PLAN_LIMITS[p] ? p : "free");
      setLoading(false);
    });
  }, [user]);

  const limits = PLAN_LIMITS[plan];

  const showUpgradeToast = (feature: string) => {
    toast.error(`You've reached your ${plan} plan limit for ${feature}.`, {
      action: { label: "Upgrade →", onClick: () => { window.location.href = "/upgrade"; } },
    });
  };

  return {
    plan,
    loading,
    limits,
    canAddTestimonial: (n: number) => within(n, limits.testimonials),
    canDoAIRewrite:    (n: number) => within(n, limits.ai_rewrites),
    canAddWidget:      (n: number) => within(n, limits.widgets),
    canAddCaseStudy:   (n: number) => within(n, limits.case_studies),
    showUpgradeToast,
  };
};
