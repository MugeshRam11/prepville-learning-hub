import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Auth client to get user
    const authClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await authClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid user" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Service role client for DB operations
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { attempt_id, completed_time_seconds } = await req.json();

    if (!attempt_id) {
      return new Response(
        JSON.stringify({ error: "attempt_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify attempt belongs to user
    const { data: attempt, error: attemptError } = await supabase
      .from("test_attempts")
      .select("*, mock_tests:test_id(id, title, subject)")
      .eq("id", attempt_id)
      .eq("user_id", user.id)
      .single();

    if (attemptError || !attempt) {
      return new Response(
        JSON.stringify({ error: "Attempt not found or does not belong to user" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update attempt status to submitted
    const { error: updateError } = await supabase
      .from("test_attempts")
      .update({
        submission_status: "submitted",
        completed_at: new Date().toISOString(),
        time_taken_seconds: completed_time_seconds || null,
      })
      .eq("id", attempt_id);

    if (updateError) {
      return new Response(
        JSON.stringify({ error: updateError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create exam_evaluations row if it doesn't exist
    const { data: existingEval } = await supabase
      .from("exam_evaluations")
      .select("id")
      .eq("test_attempt_id", attempt_id)
      .maybeSingle();

    if (!existingEval) {
      await supabase.from("exam_evaluations").insert({
        test_attempt_id: attempt_id,
        test_id: attempt.test_id,
        student_id: user.id,
        evaluation_status: "pending_review",
        evaluation_mode: "pending",
      });
    }

    // Trigger AI evaluator (fire-and-forget, don't block submission)
    try {
      await fetch(`${supabaseUrl}/functions/v1/ai-exam-evaluator`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${serviceRoleKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ attempt_id }),
      });
    } catch (aiErr) {
      // AI evaluation failure should not block submission
      console.error("AI evaluator trigger failed:", aiErr);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Submission successful. Results will be available within 24 hours.",
        attempt_id,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("submit-mock-test error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
