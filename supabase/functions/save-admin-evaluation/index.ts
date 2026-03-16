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

    // Verify admin role
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

    const {
      attempt_id,
      evaluation_mode,
      final_score,
      final_feedback,
      question_evaluations,
      items = [],
    } = await req.json();

    if (!attempt_id) {
      return new Response(
        JSON.stringify({ error: "attempt_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get or create evaluation record
    let { data: evaluation } = await supabase
      .from("exam_evaluations")
      .select("*")
      .eq("test_attempt_id", attempt_id)
      .maybeSingle();

    if (!evaluation) {
      // Get attempt details to create evaluation
      const { data: attempt } = await supabase
        .from("test_attempts")
        .select("test_id, user_id")
        .eq("id", attempt_id)
        .single();

      if (!attempt) {
        return new Response(
          JSON.stringify({ error: "Attempt not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: newEval, error: insertErr } = await supabase
        .from("exam_evaluations")
        .insert({
          test_attempt_id: attempt_id,
          test_id: attempt.test_id,
          student_id: attempt.user_id,
          evaluation_status: "pending_review",
          evaluation_mode: evaluation_mode || "manual",
        })
        .select()
        .single();

      if (insertErr) {
        return new Response(
          JSON.stringify({ error: insertErr.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      evaluation = newEval;
    }

    // Update evaluation record
    const { error: updateError } = await supabase
      .from("exam_evaluations")
      .update({
        evaluation_mode: evaluation_mode || "manual",
        evaluation_status: "pending_review",
        final_score: final_score ?? null,
        feedback: final_feedback ?? null,
        question_evaluations: question_evaluations ?? [],
        evaluated_by: user.id,
        evaluated_at: new Date().toISOString(),
      })
      .eq("id", evaluation.id);

    if (updateError) {
      return new Response(
        JSON.stringify({ error: updateError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Upsert evaluation_items for per-question data
    if (items.length > 0) {
      // Delete existing items for this evaluation
      await supabase
        .from("evaluation_items")
        .delete()
        .eq("evaluation_id", evaluation.id);

      // Insert new items
      const itemsToInsert = items.map((item: any) => ({
        evaluation_id: evaluation.id,
        attempt_id,
        question_id: item.question_id || null,
        sub_question_id: item.sub_question_id || null,
        marks_awarded: item.marks_awarded ?? 0,
        feedback: item.feedback || null,
        suggestions: item.suggestions || null,
        ai_suggestions: item.ai_suggestions || {},
        reviewed_by: user.id,
      }));

      const { error: itemsError } = await supabase
        .from("evaluation_items")
        .insert(itemsToInsert);

      if (itemsError) {
        console.error("Error inserting evaluation items:", itemsError);
      }
    }

    // Update attempt status
    await supabase
      .from("test_attempts")
      .update({ submission_status: "submitted" })
      .eq("id", attempt_id);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Evaluation saved successfully",
        evaluation_id: evaluation.id,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("save-admin-evaluation error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
