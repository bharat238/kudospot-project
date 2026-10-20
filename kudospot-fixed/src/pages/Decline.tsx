import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Loader2, CheckCircle2, AlertCircle, MailCheck, Hand } from "lucide-react";
import KudoSpotIcon from "@/components/KudoSpotIcon";

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
        if (error || data?.error || !data?.success) throw error || new Error(data?.error || "Response could not be saved");
        if (current) setState(data.already ? "already" : "success");
      } catch {
        if (current) setState("error");
      }
    };
    void decline();
    return () => { current = false; };
  }, [token]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f4f4f3] p-4">
      <Card aria-live="polite" className="w-full max-w-md rounded-2xl border-border/80 p-8 text-center shadow-[0_12px_40px_rgba(15,23,42,0.08)] sm:p-10">
        {state === "loading" && (
          <>
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-accent-foreground"><Loader2 className="h-7 w-7 animate-spin" /></div>
            <h1 className="text-xl font-semibold tracking-tight">Processing your response</h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Please keep this page open for a moment.</p>
          </>
        )}
        {state === "success" && (
          <>
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700"><Hand className="h-7 w-7" /></div>
            <h1 className="text-xl font-semibold tracking-tight">Thank you for letting us know.</h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">We recorded your response, and this testimonial will not be used publicly.</p>
          </>
        )}
        {state === "already" && (
          <>
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-accent-foreground"><MailCheck className="h-7 w-7" /></div>
            <h1 className="text-xl font-semibold tracking-tight">Response already received</h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">This link has already been used. The business has your response.</p>
          </>
        )}
        {state === "error" && (
          <>
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive"><AlertCircle className="h-7 w-7" /></div>
            <h1 className="text-xl font-semibold tracking-tight">This link could not be processed</h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">The link may have expired or already been replaced. Contact the business if you still need help.</p>
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

export default Decline;
