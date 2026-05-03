import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Check, Zap, Loader2, Star } from "lucide-react";

declare global {
  interface Window { Razorpay: any; }
}

const PLANS = [
  {
    id: "free",
    name: "Free",
    price: "₹0",
    period: "forever",
    highlight: false,
    features: ["10 testimonials", "5 AI rewrites", "1 widget", "0 case studies"],
  },
  {
    id: "starter",
    name: "Starter",
    price: "₹499",
    period: "/month",
    highlight: true,
    features: ["Unlimited testimonials", "Unlimited AI rewrites", "5 widgets", "3 case studies", "Social post generator", "Email approval flow"],
  },
  {
    id: "pro",
    name: "Pro",
    price: "₹1,299",
    period: "/month",
    highlight: false,
    features: ["Everything in Starter", "Unlimited widgets", "Unlimited case studies", "PNG social graphics", "Priority support"],
  },
];

export default function Upgrade() {
  const { user } = useAuth();
  const [currentPlan, setCurrentPlan] = useState("free");
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("plan").eq("id", user.id).maybeSingle().then(({ data }) => {
      if (data?.plan) setCurrentPlan(data.plan);
    });
  }, [user]);

  const loadRazorpay = (): Promise<boolean> =>
    new Promise((resolve) => {
      if (window.Razorpay) return resolve(true);
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });

  const handleUpgrade = async (planId: string) => {
    if (!user) return;
    setLoadingPlan(planId);

    try {
      const loaded = await loadRazorpay();
      if (!loaded) {
        toast.error("Failed to load payment gateway. Check your internet connection.");
        setLoadingPlan(null);
        return;
      }

      const { data, error } = await supabase.functions.invoke("create-razorpay-order", {
        body: { plan: planId },
      });

      if (error || !data?.order_id) {
        toast.error(error?.message || data?.error || "Failed to create order. Check Razorpay keys in Supabase secrets.");
        setLoadingPlan(null);
        return;
      }

      const options = {
        key: data.key_id,
        amount: data.amount,
        currency: data.currency,
        name: "KudoSpot",
        description: `${planId.charAt(0).toUpperCase() + planId.slice(1)} Plan – Monthly`,
        order_id: data.order_id,
        prefill: { email: user.email },
        theme: { color: "#7C3AED" },
        handler: async (response: any) => {
          const { error: verifyError, data: verifyData } = await supabase.functions.invoke("verify-razorpay-payment", {
            body: {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              plan: planId,
            },
          });

          if (verifyError || !verifyData?.success) {
            toast.error("Payment verification failed. Contact support.");
          } else {
            setCurrentPlan(planId);
            toast.success(`🎉 Upgraded to ${planId}! Enjoy your new features.`);
          }
          setLoadingPlan(null);
        },
        modal: {
          ondismiss: () => {
            toast("Payment cancelled.");
            setLoadingPlan(null);
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (e: any) {
      toast.error(e.message || "Unexpected error");
      setLoadingPlan(null);
    }
  };

  return (
    <AppShell>
      <div className="mb-8 text-center max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Choose your plan</h1>
        <p className="text-muted-foreground">Upgrade to unlock unlimited testimonials, AI rewrites, and powerful features.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
        {PLANS.map((plan) => {
          const isCurrent = currentPlan === plan.id;
          const isLoading = loadingPlan === plan.id;
          return (
            <Card
              key={plan.id}
              className={`p-6 flex flex-col ${plan.highlight ? "border-primary border-2 relative" : ""}`}
            >
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1">
                    <Star className="h-3 w-3" /> Most popular
                  </span>
                </div>
              )}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1">
                  <h2 className="font-bold text-lg">{plan.name}</h2>
                  {isCurrent && (
                    <span className="text-xs bg-success/10 text-success px-2 py-0.5 rounded-full font-medium">Current</span>
                  )}
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold">{plan.price}</span>
                  <span className="text-sm text-muted-foreground">{plan.period}</span>
                </div>
              </div>

              <ul className="space-y-2 flex-1 mb-6">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-success mt-0.5 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              {plan.id === "free" ? (
                <Button variant="outline" disabled={isCurrent}>
                  {isCurrent ? "Current plan" : "Downgrade"}
                </Button>
              ) : (
                <Button
                  variant={plan.highlight ? "default" : "outline"}
                  disabled={isCurrent || !!loadingPlan}
                  onClick={() => handleUpgrade(plan.id)}
                >
                  {isLoading ? (
                    <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Processing…</>
                  ) : isCurrent ? (
                    "Current plan"
                  ) : (
                    <><Zap className="h-4 w-4 mr-1" /> Upgrade to {plan.name}</>
                  )}
                </Button>
              )}
            </Card>
          );
        })}
      </div>

      <p className="text-center text-xs text-muted-foreground mt-8">
        Payments powered by Razorpay. Secure & encrypted. Cancel anytime.
      </p>
    </AppShell>
  );
}
