import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Check, Edit, X, ThumbsDown } from "lucide-react";
import KudoSpotIcon from "@/components/KudoSpotIcon";
import { toast } from "sonner";
import { trackEvent } from "@/lib/track";

const FALLBACK_TEMPLATES = [
  "Too short — needs more detail",
  "Customer wants edits before publishing",
  "Not representative of typical results",
  "Contains confidential information",
  "Too negative in tone",
  "Off-brand voice",
  "Inaccurate claim",
  "Needs more specific results",
  "Other",
];

const Approve = () => {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [tokenRow, setTokenRow] = useState<any | null>(null);
  const [t, setT] = useState<any | null>(null);
  const [templates, setTemplates] = useState<string[]>(FALLBACK_TEMPLATES);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState("");
  const [done, setDone] = useState<"approved" | "original" | "rejected" | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [pickedTpl, setPickedTpl] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: tk } = await supabase.from("approval_tokens").select("*").eq("token", token).maybeSingle();
      if (!tk) { setLoading(false); return; }
      if (tk.used_at) {
        setTokenRow(tk);
        setLoading(false);
        return;
      }
      setTokenRow(tk);
      const [{ data: tst }, { data: profile }] = await Promise.all([
        supabase.from("testimonials").select("*").eq("id", tk.testimonial_id).maybeSingle(),
        supabase.from("profiles").select("rejection_templates").eq("id", tk.user_id).maybeSingle(),
      ]);
      setT(tst);
      setEditText(tst?.ai_rewritten_text || tst?.original_text || "");
      if (Array.isArray(profile?.rejection_templates) && profile.rejection_templates.length) {
        setTemplates(profile.rejection_templates as string[]);
      }
      setLoading(false);
      if (tst && !tk.used_at) {
        trackEvent({ user_id: tk.user_id, event_type: "approval_opened", entity_id: tk.testimonial_id, entity_type: "approval", campaign: tk.campaign });
      }
    })();
  }, [token]);

  const finalize = async (text: string, kind: "approved" | "original") => {
    if (!tokenRow || !t) return;
    try {
      const { error } = await supabase.functions.invoke("handle-approval", {
        body: { token, action: "approve", text },
      });
      if (error) throw error;
      setDone(kind);
    } catch (err: any) {
      toast.error(err.message || "Approval failed");
    }
  };

  const reject = async () => {
    if (!tokenRow || !t) return;
    const reason = (pickedTpl && pickedTpl !== "Other" ? pickedTpl : rejectReason).trim() || pickedTpl || null;
    try {
      const { error } = await supabase.functions.invoke("handle-approval", {
        body: { token, action: "reject", reason },
      });
      if (error) throw error;
      setDone("rejected");
    } catch (err: any) {
      toast.error(err.message || "Rejection failed");
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
  if (!tokenRow || !t) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">This approval link is invalid.</div>;
  if (tokenRow.used_at || done) {
    const isReject = done === "rejected";
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary/30 p-4">
        <Card className="max-w-md w-full p-10 text-center">
          <div className={`h-14 w-14 rounded-full mx-auto mb-4 flex items-center justify-center text-white ${isReject ? "bg-destructive" : "bg-success"}`}>
            {isReject ? <X className="h-7 w-7" /> : <Check className="h-7 w-7" />}
          </div>
          <h1 className="text-2xl font-bold mb-1">{isReject ? "Got it — we won't use this." : "Thank you!"}</h1>
          <p className="text-muted-foreground">{isReject ? "We've recorded your decision." : "Your testimonial is ready to be shared."}</p>
        </Card>
      </div>
    );
  }

  const showCustomBox = pickedTpl === "Other" || pickedTpl === null;

  return (
    <div className="min-h-screen bg-secondary/30 py-10 px-4">
      <Card className="max-w-2xl mx-auto p-8">
        <h1 className="text-2xl font-bold mb-1">Hey {t.customer_name?.split(" ")[0]} — does this sound like you?</h1>
        <p className="text-muted-foreground mb-6">We polished your testimonial. Approve it, edit it, or use your original.</p>

        <div className="space-y-4 mb-6">
          <div>
            <div className="text-xs font-semibold text-muted-foreground uppercase mb-2">Your original</div>
            <Card className="p-4 bg-secondary/50"><p className="text-sm leading-relaxed">{t.original_text}</p></Card>
          </div>
          {t.ai_rewritten_text && (
            <div>
              <div className="text-xs font-semibold text-primary uppercase mb-2 flex items-center gap-1"><KudoSpotIcon className="h-3 w-3" /> Polished version</div>
              {editing ? (
                <Textarea rows={6} value={editText} onChange={(e) => setEditText(e.target.value)} />
              ) : (
                <Card className="p-4 border-primary bg-primary-light/30"><p className="text-sm leading-relaxed">{t.ai_rewritten_text}</p></Card>
              )}
            </div>
          )}
        </div>

        {!rejecting ? (
          <div className="flex flex-wrap gap-2">
            {!editing && t.ai_rewritten_text && (
              <Button onClick={() => finalize(t.ai_rewritten_text, "approved")} className="bg-success hover:bg-success/90"><Check className="h-4 w-4 mr-1" /> Yes, publish this</Button>
            )}
            {!editing && (
              <Button variant="outline" onClick={() => setEditing(true)}><Edit className="h-4 w-4 mr-1" /> Edit it</Button>
            )}
            {editing && (
              <Button onClick={() => finalize(editText, "approved")} className="bg-success hover:bg-success/90"><Check className="h-4 w-4 mr-1" /> Save my edit</Button>
            )}
            <Button variant="ghost" onClick={() => finalize(t.original_text, "original")}>Use my original</Button>
            <Button variant="ghost" className="text-destructive ml-auto" onClick={() => setRejecting(true)}><ThumbsDown className="h-4 w-4 mr-1" /> Don't use it</Button>
          </div>
        ) : (
          <div className="border-t pt-4 space-y-3">
            <Label className="text-sm font-medium">Why? <span className="text-muted-foreground font-normal">(pick one or write your own)</span></Label>
            <div className="flex flex-wrap gap-2">
              {templates.map((tpl) => (
                <button
                  key={tpl}
                  type="button"
                  onClick={() => setPickedTpl(tpl)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition ${pickedTpl === tpl ? "bg-destructive text-destructive-foreground border-destructive" : "bg-background hover:bg-secondary"}`}
                >
                  {tpl}
                </button>
              ))}
            </div>
            {showCustomBox && (
              <Textarea rows={3} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Tell them what didn't work…" />
            )}
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => { setRejecting(false); setPickedTpl(null); setRejectReason(""); }}>Cancel</Button>
              <Button variant="destructive" onClick={reject} disabled={!pickedTpl && !rejectReason.trim()}>Confirm decline</Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default Approve;
