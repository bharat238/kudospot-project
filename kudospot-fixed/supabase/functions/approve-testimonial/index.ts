const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed." }), { status: 405, headers: corsHeaders });
  }

  // This legacy endpoint used to approve a testimonial on GET/POST without
  // asking the customer to confirm the exact wording. Keep the route present
  // for old callers, but never change consent state through this endpoint.
  return new Response(JSON.stringify({
    error: "This legacy approval endpoint is retired. Open the approval link and confirm the wording on the KudoSpot approval page.",
    code: "APPROVAL_CONFIRMATION_REQUIRED",
  }), { status: 410, headers: corsHeaders });
});
