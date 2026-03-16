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

    // Verify admin
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

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Verify admin role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || !["admin", "moderator"].includes(profile.role)) {
      return new Response(
        JSON.stringify({ error: "Forbidden: admin role required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { attempt_id } = await req.json();

    if (!attempt_id) {
      return new Response(
        JSON.stringify({ error: "attempt_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update evaluation to finalized
    const { data: evaluation, error: evalError } = await supabase
      .from("exam_evaluations")
      .update({
        evaluation_status: "finalized",
        finalized_at: new Date().toISOString(),
      })
      .eq("test_attempt_id", attempt_id)
      .select()
      .single();

    if (evalError) {
      return new Response(
        JSON.stringify({ error: evalError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update attempt submission_status
    const { data: attempt, error: attemptError } = await supabase
      .from("test_attempts")
      .update({ submission_status: "submitted" })
      .eq("id", attempt_id)
      .select("user_id, test_id")
      .single();

    if (attemptError) {
      return new Response(
        JSON.stringify({ error: attemptError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get test title for notification
    const { data: testData } = await supabase
      .from("mock_tests")
      .select("title")
      .eq("id", attempt.test_id)
      .single();

    const testTitle = testData?.title || "Mock Test";

    // Create notification for student
    await supabase.from("notifications").insert({
      user_id: attempt.user_id,
      title: "Your mock test has been evaluated",
      message: `Results for "${testTitle}" are now available. Click to view your performance.`,
      type: "evaluation_published",
      link: `/student/results/${attempt_id}`,
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Evaluation published successfully. Student notified.",
        evaluation_id: evaluation.id,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("publish-evaluation error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
