import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { ArrowRight, Check } from "lucide-react";

interface Props {
  onDone: () => void;
}

export const OnboardingWizard = ({ onDone }: Props) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    business_name: "",
    brand_voice: "friendly",
    form_name: "Post-purchase ask",
    headline: "Share your experience with us",
    customer_email: "",
    customer_name: "",
  });

  const update = (k: string, v: string) => setForm({ ...form, [k]: v });

  const completeOnboarding = async () => {
    if (!user) return;
    await supabase.from("profiles").update({ onboarding_completed: true }).eq("id", user.id);
    toast.success("You're all set! Your first form is ready to share.");
    onDone();
    navigate("/dashboard");
  };

  const next1 = async () => {
    if (!user || !form.full_name || !form.business_name) return toast.error("Name and business required.");
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      full_name: form.full_name,
      business_name: form.business_name,
      brand_voice: form.brand_voice,
    }).eq("id", user.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    setStep(2);
  };

  const next2 = async () => {
    if (!user || !form.form_name || !form.headline) return toast.error("Form name and headline required.");
    setSaving(true);
    const { error } = await supabase.from("collection_forms").insert({
      user_id: user.id,
      form_name: form.form_name,
      headline: form.headline,
      brand_color: "#7C3AED",
      collect_rating: true,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    setStep(3);
  };

  const finish = async (sendEmail: boolean) => {
    if (!user) return;
    setSaving(true);
    if (sendEmail && form.customer_email) {
      await supabase.from("email_sends").insert({
        user_id: user.id,
        customer_email: form.customer_email,
        customer_name: form.customer_name || null,
        status: "pending",
      });
    }
    await completeOnboarding();
    setSaving(false);
  };

  const progress = (step / 3) * 100;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-soft p-4">
      <Card className="max-w-lg w-full p-8 shadow-elevated">
        <div className="flex items-center justify-center gap-2 font-bold text-xl mb-6">
          <img src="/kudospot-icon.svg" alt="KudoSpot" className="h-8 w-8" />
          KudoSpot
        </div>

        <div className="mb-6">
          <div className="flex justify-between text-xs text-muted-foreground mb-2">
            <span>Step {step} of 3</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} />
        </div>

        {step === 1 && (
          <>
            <h1 className="text-2xl font-bold mb-1">Welcome to KudoSpot</h1>
            <p className="text-sm text-muted-foreground mb-6">Let's set up your account in 3 quick steps.</p>
            <div className="space-y-4">
              <div><Label>Your full name *</Label><Input value={form.full_name} onChange={(e) => update("full_name", e.target.value)} /></div>
              <div><Label>Business name *</Label><Input value={form.business_name} onChange={(e) => update("business_name", e.target.value)} /></div>
              <div>
                <Label>Brand voice</Label>
                <Select value={form.brand_voice} onValueChange={(v) => update("brand_voice", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="friendly">Friendly</SelectItem>
                    <SelectItem value="bold">Bold</SelectItem>
                    <SelectItem value="casual">Casual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full" onClick={next1} disabled={saving}>
                Continue <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h1 className="text-2xl font-bold mb-1">Create your first collection form</h1>
            <p className="text-sm text-muted-foreground mb-6">This is the link you send to customers to collect testimonials.</p>
            <div className="space-y-4">
              <div><Label>Form name (internal) *</Label><Input value={form.form_name} onChange={(e) => update("form_name", e.target.value)} /></div>
              <div><Label>Headline shown to customers *</Label><Input value={form.headline} onChange={(e) => update("headline", e.target.value)} /></div>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
                <Button className="flex-1" onClick={next2} disabled={saving}>
                  Create form <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h1 className="text-2xl font-bold mb-1">Send your first request</h1>
            <p className="text-sm text-muted-foreground mb-6">Enter a customer's email to queue a request now (optional).</p>
            <div className="space-y-4">
              <div><Label>Customer email</Label><Input type="email" value={form.customer_email} onChange={(e) => update("customer_email", e.target.value)} placeholder="customer@example.com" /></div>
              <div><Label>Customer name</Label><Input value={form.customer_name} onChange={(e) => update("customer_name", e.target.value)} /></div>
              <div className="flex flex-col gap-2 pt-2">
                <Button onClick={() => finish(true)} disabled={saving || !form.customer_email}>
                  <Check className="h-4 w-4 mr-1" /> Send request & finish
                </Button>
                <Button variant="ghost" onClick={() => finish(false)} disabled={saving}>Skip for now</Button>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
};
