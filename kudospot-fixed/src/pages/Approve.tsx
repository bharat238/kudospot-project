import { useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, AlertCircle, MailCheck, ShieldCheck } from "lucide-react";
import KudoSpotIcon from "@/components/KudoSpotIcon";
import { toast } from "sonner";

type ApprovalState = "ready" | "loading" | "success" | "already" | "error";

const Approve = () => {
  const { token } = useParams();
  const [state, setState] = useState<ApprovalState>("ready");
  const [name, setName] = useState("");

  const confirmApproval = async () => {
    if (!token || state === "loading") {
      if (!token) setState("error");
      return;
    }
    setState("loading");
    try {
      const { data, error } = await supabase.functions.invoke("handle-approval", {
        body: { token, action: "approve" },
      });
      if (error || data?.error || !data?.success) throw error || new Error(data?.error || "Approval could not be saved");
      if (typeof data.name === "string" && data.name.trim()) setName(data.name);
      setState(data.already ? "already" : "success");
    } catch (error) {
      console.error("Could not save customer approval:", error);
      toast.error("Your response wasn't saved. Please try again.");
      setState("error");
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f4f4f3] p-4">
      <Card aria-live="polite" className="w-full max-w-md rounded-2xl border-border/80 p-8 text-center shadow-[0_12px_40px_rgba(15,23,42,0.08)] sm:p-10">
        {state === "ready" && (
          <>
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-accent-foreground"><ShieldCheck className="h-7 w-7" /></div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Customer approval</p>
            <h1 className="text-2xl font-semibold tracking-tight">Review your testimonial</h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">By approving, you confirm that the testimonial shown in the email accurately reflects your experience and may be displayed publicly by the business.</p>
            <Button className="mt-6 w-full rounded-xl" onClick={() => void confirmApproval()}>Approve testimonial</Button>
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
            <p className="mt-3 text-sm leading-6 text-muted-foreground">Your approval has been recorded. The business can now showcase your testimonial.</p>
          </>
        )}
        {state === "already" && (
          <>
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-accent-foreground"><MailCheck className="h-7 w-7" /></div>
            <h1 className="text-xl font-semibold tracking-tight">Response already received</h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">This link has already been used. Thank you for taking the time to respond.</p>
          </>
        )}
        {state === "error" && (
          <>
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive"><AlertCircle className="h-7 w-7" /></div>
            <h1 className="text-xl font-semibold tracking-tight">We couldn't save your approval</h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">The link may have expired or the connection may have failed. Reopen the email and try again, or contact the business for a fresh link.</p>
            {token && <Button className="mt-5 w-full rounded-xl" variant="outline" onClick={() => setState("ready")}>Try again</Button>}
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
