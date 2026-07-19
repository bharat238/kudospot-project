import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

const GoogleIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
  </svg>
);

function isPasswordStrong(pw: string): boolean {
  return pw.length >= 8 && /[a-zA-Z]/.test(pw) && /[0-9]/.test(pw);
}

const Signup = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [justSignedUp, setJustSignedUp] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPasswordStrong(password)) {
      toast.error("Password must be at least 8 characters and include both a letter and a number.");
      return;
    }
    setLoading(true);
    const { error, data } = await supabase.auth.signUp({
      email, password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: { full_name: fullName, business_name: businessName },
      },
    });
    setLoading(false);
    if (error) {
      const msg = error.message.toLowerCase();
      const isDuplicate = msg.includes("already registered") || msg.includes("already exists") || msg.includes("user already");
      toast.error(
        isDuplicate
          ? "Unable to create an account with these details. If you already have one, try logging in instead."
          : error.message
      );
      return;
    }
    // If email confirmation is enabled, data.session will be null
    if (!data.session) {
      setJustSignedUp(true);
      toast.success("Account created! Check your email for verification.");
    } else {
      toast.success("Welcome to KudoSpot!");
      navigate("/dashboard");
    }
  };

  const signInWithGoogle = async () => {
    setGoogleLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin + "/dashboard" },
    });
    if (error) { setGoogleLoading(false); toast.error(error.message || "Google sign-in failed"); return; }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-soft p-4">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center justify-center gap-2 font-bold text-xl mb-8">
          <img src="/kudospot-icon.svg" alt="KudoSpot" className="h-8 w-8" />
          KudoSpot
        </Link>
        <Card className="p-8 shadow-elevated">
          {justSignedUp ? (
            <div className="text-center space-y-4">
              <div className="text-4xl mb-2">📧</div>
              <h1 className="text-2xl font-bold">Verify your email</h1>
              <p className="text-muted-foreground">
                We sent a verification link to <span className="font-medium text-foreground">{email}</span>.
                Please click the link to verify your email before logging in.
              </p>
              <Link to="/login" className="inline-flex items-center justify-center w-full h-10 px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-md hover:bg-primary/90">
                Go to login
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold mb-1">Create your account</h1>
              <p className="text-sm text-muted-foreground mb-6">Free forever. No card needed.</p>

              <Button type="button" variant="outline" className="w-full bg-background flex items-center justify-center gap-2" onClick={signInWithGoogle} disabled={googleLoading}>
                <GoogleIcon /> {googleLoading ? "Connecting…" : "Continue with Google"}
              </Button>

              <div className="my-5 flex items-center gap-3">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground uppercase tracking-wide">or continue with email</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="fullName">Your name</Label>
                  <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
                </div>
                <div>
                  <Label htmlFor="businessName">Business name</Label>
                  <Input id="businessName" value={businessName} onChange={(e) => setBusinessName(e.target.value)} required />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required />
                  <p className="text-xs text-muted-foreground mt-1">At least 8 characters, with a letter and a number.</p>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Creating…" : "Create account"}
                </Button>
              </form>
              <p className="text-sm text-center text-muted-foreground mt-6">
                Already have an account? <Link to="/login" className="text-primary font-medium hover:underline">Log in</Link>
              </p>
            </>
          )}
        </Card>
      </div>
    </div>
  );
};

export default Signup;
