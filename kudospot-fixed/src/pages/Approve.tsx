import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const Approve = () => {
  const { token } = useParams();
  const [state, setState] = useState<"loading"|"success"|"already"|"error">("loading");
  const [name, setName] = useState("");

  useEffect(() => {
    const approve = async () => {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/approve-testimonial`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            },
            body: JSON.stringify({ token }),
          }
        );
        const data = await response.json();
        const error = !response.ok ? data : null;
        if (error || !data?.success) {
          setState("error");
        } else if (data.already_approved) {
          setName(data.customer_name);
          setState("already");
        } else {
          setName(data.customer_name);
          setState("success");
        }
      } catch {
        setState("error");
      }
    };
    if (token) approve();
  }, [token]);

  return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center", 
    justifyContent:"center",background:"#faf5ff"}}>
      <div style={{textAlign:"center",padding:"48px 32px",background:"white", 
      borderRadius:"16px",boxShadow:"0 4px 24px rgba(124,58,237,0.08)", 
      maxWidth:"480px",width:"100%"}}>
        {state === "loading" && (
          <>
            <div style={{fontSize:"48px",marginBottom:"16px"}}>⏳</div>
            <h2 style={{color:"#7C3AED"}}>Processing your approval...</h2>
          </>
        )}
        {state === "success" && (
          <>
            <div style={{fontSize:"64px",marginBottom:"16px"}}>✅</div>
            <h2 style={{color:"#7C3AED",marginBottom:"12px"}}>
            Thank you, {name}!</h2>
            <p style={{color:"#666",lineHeight:"1.6"}}>
            Your testimonial has been approved and will be published soon. 
            We really appreciate your kind words!</p>
          </>
        )}
        {state === "already" && (
          <>
            <div style={{fontSize:"64px",marginBottom:"16px"}}>👍</div>
            <h2 style={{color:"#7C3AED",marginBottom:"12px"}}>
            Already approved!</h2>
            <p style={{color:"#666"}}>
            You already approved this testimonial. Thank you, {name}!</p>
          </>
        )}
        {state === "error" && (
          <>
            <div style={{fontSize:"64px",marginBottom:"16px"}}>❌</div>
            <h2 style={{color:"#E24B4A",marginBottom:"12px"}}>
            Invalid link</h2>
            <p style={{color:"#666"}}>
            This approval link is invalid or has expired. 
            Please contact the business directly.</p>
          </>
        )}
        <div style={{marginTop:"32px"}}>
          <img src="/favicon.ico" style={{height:"24px",opacity:0.4}} 
          alt="KudoSpot" />
          <p style={{color:"#bbb",fontSize:"12px",marginTop:"8px"}}>
          Powered by KudoSpot</p>
        </div>
      </div>
    </div>
  );
};

export default Approve;
