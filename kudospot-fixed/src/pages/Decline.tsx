import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import KudoSpotIcon from "@/components/KudoSpotIcon";
import { AlertCircle, CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

type DeclineState = "loading" | "success" | "already" | "error";

const Decline = () => {
  const { token } = useParams();
  const [state, setState] = useState<DeclineState>("loading");

  useEffect(() => {
    let current = true;

    const decline = async () => {
      if (!token) {
        setState("error");
        return;
      }
      try {
        const { data, error } = await supabase.functions.invoke("handle-approval", {
          body: { token, action: "decline" },
        });
        if (error || !data?.success) {
          if (current) setState("error");
          return;
        }
        if (current) setState(data.already ? "already" : "success");
      } catch {
        if (current) setState("error");
      }
    };

    void decline();
    return () => { current = false; };
  }, [token]);

  const heading = {
    loading: "Saving your response",
    success: "Thank you for letting us know",
    already: "This link has already been used",
    error: "We couldn't process this response",
  }[state];

  const description = {
    loading: "Please wait while we record your decision.",
    success: "The testimonial will not be approved for public use. The business can follow up with you if changes are needed.",
    already: "A response has already been recorded for this link. No further action is needed.",
    error: "This link may be invalid, expired, or already used. Please contact the business directly if you need help.",
  }[state];

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <section className="w-full max-w-lg rounded-2xl border border-border bg-card p-7 text-center shadow-sm sm:p-10">
        <div className="mb-7 flex items-center justify-center gap-2.5">
          <img src="/kudospot-icon.svg" alt="" className="h-8 w-8" />
          <span className="text-base font-semibold tracking-tight text-foreground">KudoSpot</span>
        </div>
        <div className={`mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl ${
          state === "error" ? "bg-destructive/10 text-destructive" : "bg-accent text-accent-foreground"
        }`}>
          {state === "loading" && <Loader2 className="h-6 w-6 animate-spin" />}
          {state === "success" && <CheckCircle2 className="h-6 w-6" />}
          {state === "already" && <ShieldCheck className="h-6 w-6" />}
          {state === "error" && <AlertCircle className="h-6 w-6" />}
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{heading}</h1>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-muted-foreground">{description}</p>
        {state === "error" && (
          <Button asChild variant="outline" className="mt-6">
            <a href="mailto:hello@kudospot.io?subject=Testimonial%20decline%20link">Contact support</a>
          </Button>
        )}
        <div className="mt-9 border-t border-border pt-5">
          <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground"><KudoSpotIcon className="h-3.5 w-3.5" /> Your response is handled securely by KudoSpot.</div>
        </div>
      </section>
    </main>
  );
};

export default Decline;
