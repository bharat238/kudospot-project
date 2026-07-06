import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Plus, X, GripVertical, Zap, Copy, ChevronRight, HelpCircle, Mail, FileText, Shield } from "lucide-react";
import KudoSpotIcon from "@/components/KudoSpotIcon";
import { PLAN_LIMITS, type PlanName } from "@/hooks/usePlanLimits";

const DEFAULT_TEMPLATES = [
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

const Settings = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>({ business_name: "", full_name: "", brand_voice: "friendly", rejection_templates: DEFAULT_TEMPLATES, plan: "free" });
  const [saving, setSaving] = useState(false);
  const [usage, setUsage] = useState({ testimonials: 0, ai_rewrites: 0, widgets: 0, case_studies: 0 });

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle().then(({ data }) => {
      if (data) {
        setProfile({
          ...data,
          rejection_templates: Array.isArray(data.rejection_templates) ? data.rejection_templates : DEFAULT_TEMPLATES,
        });
      }
    });
    (async () => {
      const [{ count: t }, { count: w }, { count: c }, { data: rew }] = await Promise.all([
        supabase.from("testimonials").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("widgets").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("case_studies").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("testimonials").select("id").eq("user_id", user.id).not("ai_rewritten_text", "is", null),
      ]);
      setUsage({ testimonials: t || 0, ai_rewrites: rew?.length || 0, widgets: w || 0, case_studies: c || 0 });
    })();
  }, [user]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const cleaned = (profile.rejection_templates || []).map((t: string) => t.trim()).filter(Boolean);
    const { error } = await supabase.from("profiles").update({
      business_name: profile.business_name,
      full_name: profile.full_name,
      brand_voice: profile.brand_voice,
      rejection_templates: cleaned,
      updated_at: new Date().toISOString(),
    }).eq("id", user.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Saved");
  };

  const updateTpl = (i: number, v: string) => {
    const next = [...(profile.rejection_templates || [])];
    next[i] = v;
    setProfile({ ...profile, rejection_templates: next });
  };
  const addTpl = () => setProfile({ ...profile, rejection_templates: [...(profile.rejection_templates || []), ""] });
  const removeTpl = (i: number) => setProfile({ ...profile, rejection_templates: profile.rejection_templates.filter((_: any, j: number) => j !== i) });
  const resetTpl = () => setProfile({ ...profile, rejection_templates: DEFAULT_TEMPLATES });

  const plan = (profile.plan as PlanName) || "free";
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;
  const fmt = (count: number, max: number) => max === -1 ? "Unlimited" : `${count} / ${max}`;
  const planBadgeCls = plan === "pro" ? "bg-primary-light text-primary" : plan === "starter" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground";

  return (
    <AppShell>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-1">Settings</h1>
        <p className="text-muted-foreground">Profile, branding, and billing.</p>
      </div>

      <div className="max-w-2xl space-y-6">
        {/* Profile Section */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Profile</h2>
          <Card className="p-6">
            <form onSubmit={save} className="space-y-5">
              <div><Label>Your name</Label><Input value={profile.full_name || ""} onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} /></div>
              <div><Label>Business name</Label><Input value={profile.business_name || ""} onChange={(e) => setProfile({ ...profile, business_name: e.target.value })} /></div>
              <div>
                <Label>Brand voice</Label>
                <Select value={profile.brand_voice} onValueChange={(v) => setProfile({ ...profile, brand_voice: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="friendly">Friendly</SelectItem>
                    <SelectItem value="bold">Bold</SelectItem>
                    <SelectItem value="casual">Casual</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">AI rewrites will match this tone.</p>
              </div>

              <div className="border-t pt-5">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <Label>Rejection reason templates</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">Quick-pick options shown to customers when they decline an approval.</p>
                  </div>
                  <div className="flex gap-1">
                    <Button type="button" size="sm" variant="ghost" onClick={resetTpl}>Reset</Button>
                    <Button type="button" size="sm" variant="outline" onClick={addTpl}><Plus className="h-3 w-3 mr-1" /> Add</Button>
                  </div>
                </div>
                <div className="space-y-2 mt-3">
                  {(profile.rejection_templates || []).map((t: string, i: number) => (
                    <div key={i} className="flex items-center gap-2">
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                      <Input value={t} onChange={(e) => updateTpl(i, e.target.value)} placeholder={`Reason ${i + 1}`} />
                      <Button type="button" size="icon" variant="ghost" onClick={() => removeTpl(i)}><X className="h-4 w-4" /></Button>
                    </div>
                  ))}
                </div>
              </div>

              <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save changes"}</Button>
            </form>
          </Card>
        </div>

        {/* Support & Legal Section */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Support & Legal</h2>
          <Card className="p-6">
            <p className="text-xs text-muted-foreground mb-6">Get help, share feedback, or review our policies.</p>
            <div className="space-y-2">
              <Link to="/help">
                <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-secondary/50 transition cursor-pointer">
                  <div className="flex items-center gap-3">
                    <HelpCircle className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm font-medium">Help & FAQ</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </Link>
              <Link to="/contact">
                <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-secondary/50 transition cursor-pointer">
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm font-medium">Contact us</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </Link>
              <Link to="/privacy">
                <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-secondary/50 transition cursor-pointer">
                  <div className="flex items-center gap-3">
                    <Shield className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm font-medium">Privacy Policy</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </Link>
              <Link to="/terms">
                <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-secondary/50 transition cursor-pointer">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm font-medium">Terms of Service</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </Link>
            </div>
          </Card>
        </div>

        {/* Billing Section */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Billing</h2>
          <div className="space-y-4">
            <Card className="p-6">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h2 className="font-semibold text-lg mb-1">Current plan</h2>
                  <span className={`inline-block text-xs uppercase tracking-wide font-semibold px-2 py-1 rounded ${planBadgeCls}`}>
                    {plan}
                  </span>
                </div>
                {plan !== "pro" && (
                  <Button onClick={() => { window.location.href = "/upgrade"; }}>
                    <Zap className="h-4 w-4 mr-1" /> Upgrade
                  </Button>
                )}
              </div>
              {plan === "free" ? (
                <p className="text-sm text-muted-foreground mt-2">Upgrade to unlock unlimited testimonials, AI rewrites, and more.</p>
              ) : (
                <div className="mt-3">
                  <p className="text-sm text-muted-foreground">Your plan is active. Thank you for being a KudoSpot customer.</p>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button className="mt-3 text-xs text-destructive hover:underline cursor-pointer bg-transparent border-none p-0">
                        Cancel subscription
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure you want to cancel?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Your plan will remain active until the end of the billing period.
                          <br /><br />
                          <strong>Note:</strong> Please also cancel your payment mandate in your bank or UPI app to stop future charges.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Keep my plan</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          onClick={async () => {
                            const { error } = await supabase.from("profiles").update({ plan: "free", plan_expires_at: null }).eq("id", user?.id);
                            if (error) { toast.error("Cancellation failed: " + error.message); return; }
                            toast.success("Subscription cancelled. You will retain access until your billing period ends.");
                            window.location.reload();
                          }}
                        >
                          Confirm cancellation
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
            </Card>

            <Card className="p-6">
              <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <KudoSpotIcon className="h-4 w-4 text-primary" /> Usage this period
              </h2>
              <div className="divide-y">
                {[
                  { label: "Testimonials", value: usage.testimonials, max: limits.testimonials },
                  { label: "AI rewrites", value: usage.ai_rewrites, max: limits.ai_rewrites },
                  { label: "Widgets", value: usage.widgets, max: limits.widgets },
                  { label: "Case studies", value: usage.case_studies, max: limits.case_studies },
                ].map((row) => (
                  <div key={row.label} className="py-3 flex items-center justify-between">
                    <span className="text-sm">{row.label}</span>
                    <span className="text-sm font-medium">{fmt(row.value, row.max)}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
};

export default Settings;
