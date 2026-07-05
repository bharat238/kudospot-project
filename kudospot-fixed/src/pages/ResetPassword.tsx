import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

function isPasswordStrong(pw: string): boolean {
  return pw.length >= 8 && /[a-zA-Z]/.test(pw) && /[0-9]/.test(pw);
}

const ResetPassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [readyToReset, setReadyToReset] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        setReadyToReset(true);
      }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event) => {
        if (event === "PASSWORD_RECOVERY") {
          setReadyToReset(true);
        }
      }
    );

    const timeout = setTimeout(() => {
      if (!readyToReset) {
        setError(true);
      }
    }, 4000);

    return () => {
      subscription?.unsubscribe();
      clearTimeout(timeout);
    };
  }, [readyToReset]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isPasswordStrong(password)) {
      toast.error("Password must be at least 8 characters and include both a letter and a number.");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Password updated! Please log in.");
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-soft p-4">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center justify-center gap-2 font-bold text-xl mb-8">
          <img src="/kudospot-icon.svg" alt="KudoSpot" className="h-8 w-8" />
          KudoSpot
        </Link>
        <Card className="p-8 shadow-elevated">
          {!readyToReset && !error ? (
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Verifying your reset link…</p>
            </div>
          ) : error ? (
            <div className="text-center">
              <h1 className="text-2xl font-bold mb-2">Invalid or expired link</h1>
              <p className="text-sm text-muted-foreground mb-6">
                This reset link is no longer valid. Please request a new one.
              </p>
              <Link to="/forgot-password" className="text-sm text-primary font-medium hover:underline inline-flex items-center gap-1">
                <ArrowLeft className="h-3.5 w-3.5" /> Request a new reset link
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold mb-1">Create a new password</h1>
              <p className="text-sm text-muted-foreground mb-6">Enter your new password below.</p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">At least 8 characters, with a letter and a number.</p>
                </div>
                <div>
                  <Label htmlFor="confirmPassword">Confirm password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    minLength={8}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">At least 8 characters, with a letter and a number.</p>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Updating…" : "Update password"}
                </Button>
              </form>
            </>
          )}
        </Card>
      </div>
    </div>
  );
};

export default ResetPassword;
