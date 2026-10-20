import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, AlertCircle, MailCheck, ShieldCheck } from "lucide-react";
import KudoSpotIcon from "@/components/KudoSpotIcon";

type ApprovalState = "checking" | "ready" | "loading" | "success" | "already" | "error";

const Approve = () => {
  const { token } = useParams();
  const [state, setState] = useState<ApprovalState>("checking");
  const [name, setName] = useState("");
  const [testimonialText, setTestimonialText] = useState("");

  const loadPreview = useCallback(async () => {
    if (!token) {
      setState("error");
      return;
    }
    setState("checking");
    try {
      const { data, error } = await supabase.functions.invoke("handle-approval", {
        body: { token, action: "preview" },
      });
      if (error || data?.error || !data?.success) throw error || new Error(data?.error || "This link could not be verified.");
      if (typeof data.customer_name === "string") setName(data.customer_name);
      if (data.already) {
        setState("already");
        return;
      }
      setTestimonialText(typeof data.testimonial_text === "string" ? data.testimonial_text : "");
      setState("ready");
    } catch (error) {
      console.error("Could not load approval preview:", error instanceof Error ? error.message : String(error));
      setState("error");
    }
  }, [token]);

  useEffect(() => {
    void loadPreview();
  }, [loadPreview]);

  const confirmApproval = async () => {
    if (!token || state !== "ready") return;
    setState("loading");
    try {
      const { data, error } = await supabase.functions.invoke("handle-approval", {
        body: { token, action: "approve" },
      });
      if (error || data?.error || !data?.success) throw error || new Error(data?.error || "Approval could not be saved.");
      if (typeof data.customer_name === "string" && data.customer_name.trim()) setName(data.customer_name);
      setState(data.already ? "already" : "success");
    } catch (error) {
      console.error("Could not save customer approval:", error instanceof Error ? error.message : String(error));
      setState("error");
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f4f4f3] p-4">
      <Card aria-live="polite" className="w-full max-w-lg rounded-2xl border-border/80 p-7 text-center shadow-[0_12px_40px_rgba(15,23,42,0.08)] sm:p-10">
        <div className="mb-7 flex items-center justify-center gap-2.5">
          <img src="/kudospot-icon.svg" alt="" className="h-8 w-8" />
          <span className="text-base font-semibold tracking-tight text-foreground">KudoSpot</span>
        </div>
        {state === "checking" && (
          <>
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-accent-foreground"><Loader2 className="h-7 w-7 animate-spin" /></div>
            <h1 className="text-xl font-semibold tracking-tight">Checking your approval link</h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Loading the exact wording the business asked you to review.</p>
          </>
        )}
        {state === "ready" && (
          <>
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-accent-foreground"><ShieldCheck className="h-7 w-7" /></div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Customer approval</p>
            <h1 className="text-2xl font-semibold tracking-tight">{name ? "Review your testimonial, " + name : "Review your testimonial"}</h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">Read the exact wording below. Approving confirms that it reflects your experience and may be displayed publicly by the business.</p>
            <blockquote className="mt-5 rounded-xl border border-border/80 bg-muted/30 p-4 text-left text-sm leading-6 text-foreground whitespace-pre-wrap">“{testimonialText}”</blockquote>
            <Button className="mt-6 w-full rounded-xl" onClick={() => void confirmApproval()}>Approve this wording</Button>
            <p className="mt-3 text-xs text-muted-foreground">Nothing is approved until you press the button above.</p>
          </>
        )}
        {state === "loading" && (
          <>
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-accent-foreground"><Loader2 className="h-7 w-7 animate-spin" /></div>
            <h1 className="text-xl font-semibold tracking-tight">Saving your approval</h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Please keep this page open for a moment.</p>
          </>
        )}
        {state === "success" && (
          <>
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700"><CheckCircle2 className="h-7 w-7" /></div>
            <h1 className="text-2xl font-semibold tracking-tight">{name ? "Thank you, " + name + "." : "Thank you for your approval."}</h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">Your approval has been recorded. The business can now showcase the wording you reviewed.</p>
          </>
        )}
        {state === "already" && (
          <>
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-accent-foreground"><MailCheck className="h-7 w-7" /></div>
            <h1 className="text-xl font-semibold tracking-tight">Response already received</h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">This link has already been used or a response was recorded. No further action is needed.</p>
          </>
        )}
        {state === "error" && (
          <>
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive"><AlertCircle className="h-7 w-7" /></div>
            <h1 className="text-xl font-semibold tracking-tight">We couldn't verify your approval link</h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">The link may have expired or the connection may have failed. You can check the link again or ask the business for a fresh one.</p>
            {token && <Button className="mt-5 w-full rounded-xl" variant="outline" onClick={() => void loadPreview()}>Try again</Button>}
          </>
        )}
        <div className="mt-8 border-t border-border/70 pt-5">
          <div className="flex items-center justify-center gap-2"><KudoSpotIcon className="h-5 w-5" /><span className="text-sm font-semibold text-foreground">KudoSpot</span></div>
          <p className="mt-1 text-[11px] text-muted-foreground">Customer testimonials, with permission.</p>
        </div>
      </Card>
    </main>
  );
};

export default Approve;
