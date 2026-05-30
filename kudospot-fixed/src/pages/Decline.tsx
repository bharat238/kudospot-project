import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const Decline = () => {
  const { token } = useParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    const doDecline = async () => {
      if (!token) return;
      try {
        const { error } = await supabase.functions.invoke("handle-approval", {
          body: { token, action: "decline" },
        });
        if (error) throw error;
        setStatus("success");
      } catch (err) {
        console.error(err);
        setStatus("error");
      }
    };
    doDecline();
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary/30 p-6 text-center">
      <div className="max-w-md w-full">
        {status === "loading" && <p className="text-muted-foreground animate-pulse">Processing your request...</p>}
        {status === "success" && (
          <div className="bg-white p-8 rounded-2xl shadow-sm border">
            <div className="text-4xl mb-4">✋</div>
            <h1 className="text-xl font-bold mb-2">Got it.</h1>
            <p className="text-muted-foreground text-sm">We won't use this testimonial. Thank you for letting us know.</p>
          </div>
        )}
        {status === "error" && (
          <div className="bg-white p-8 rounded-2xl shadow-sm border">
            <div className="text-4xl mb-4">❌</div>
            <h1 className="text-xl font-bold mb-2">Something went wrong.</h1>
            <p className="text-muted-foreground text-sm">We couldn't process your request. Please try again later or contact the business directly.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Decline;
