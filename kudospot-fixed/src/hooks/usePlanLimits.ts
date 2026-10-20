import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export const PLAN_LIMITS = {
  free:    { testimonials: 10, ai_rewrites: 5,  widgets: 1,  case_studies: 0,  video_testimonials: 0  },
  starter: { testimonials: -1, ai_rewrites: -1, widgets: 5,  case_studies: 3,  video_testimonials: 0 },
  pro:     { testimonials: -1, ai_rewrites: -1, widgets: -1, case_studies: -1, video_testimonials: 0 },
} as const;

export type PlanName = keyof typeof PLAN_LIMITS;

const within = (count: number, max: number) => max === -1 || count < max;

export const usePlanLimits = () => {
  const { user } = useAuth();
  const [plan, setPlan] = useState<PlanName>("free");
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let current = true;

    const loadPlan = async () => {
      if (!user) {
        if (current) {
          setPlan("free");
          setExpiresAt(null);
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("plan,plan_expires_at")
          .eq("id", user.id)
          .maybeSingle();

        if (error) throw error;
        let nextPlan = (data?.plan as PlanName) || "free";
        if (!PLAN_LIMITS[nextPlan]) nextPlan = "free";
        let nextExpiry = data?.plan_expires_at || null;

        // Paid access is finite: the checkout grants 30 days and does not auto-renew.
        const expiryTime = nextExpiry ? new Date(nextExpiry).getTime() : NaN;
        const expired = nextPlan !== "free" && (!Number.isFinite(expiryTime) || expiryTime <= Date.now());

        if (expired) {
          const { error: resetError } = await supabase
            .from("profiles")
            .update({ plan: "free", plan_expires_at: null })
            .eq("id", user.id);
          if (resetError) console.error("Could not reset expired plan:", resetError.message);
          nextPlan = "free";
          nextExpiry = null;
          toast.info("Your paid plan has ended. Your account is now on the Free plan.");
        }

        if (current) {
          setPlan(nextPlan);
          setExpiresAt(nextExpiry);
        }
      } catch (error) {
        console.error("Could not load account plan:", error instanceof Error ? error.message : String(error));
        if (current) {
          setPlan("free");
          setExpiresAt(null);
          toast.error("Plan details couldn't be loaded. Free plan limits are being used until we can verify your plan.");
        }
      } finally {
        if (current) setLoading(false);
      }
    };

    void loadPlan();
    return () => { current = false; };
  }, [user]);

  const limits = PLAN_LIMITS[plan];

  const showUpgradeToast = (feature: string) => {
    toast.error(`You've reached your ${plan} plan limit for ${feature}.`, {
      action: { label: "Upgrade →", onClick: () => { window.location.href = "/upgrade"; } },
    });
  };

  return {
    plan,
    expiresAt,
    loading,
    limits,
    canAddTestimonial: (n: number) => within(n, limits.testimonials),
    canDoAIRewrite: (n: number) => within(n, limits.ai_rewrites),
    canAddWidget: (n: number) => within(n, limits.widgets),
    canAddCaseStudy: (n: number) => within(n, limits.case_studies),
    showUpgradeToast,
  };
};
