import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!LOVABLE_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing required environment variables');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { userId } = await req.json();

    if (!userId) {
      throw new Error('User ID is required');
    }

    console.log('Analyzing progress for user:', userId);

    // Fetch user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('first_name, email')
      .eq('id', userId)
      .single();

    // Fetch user XP and level
    const { data: xpData } = await supabase
      .from('user_xp')
      .select('*')
      .eq('user_id', userId)
      .single();

    // Fetch struggle topics (weaknesses)
    const { data: struggleTopics } = await supabase
      .from('student_struggle_topics')
      .select('*')
      .eq('user_id', userId)
      .order('struggle_count', { ascending: false })
      .limit(10);

    // Fetch test attempts for performance analysis
    const { data: testAttempts } = await supabase
      .from('test_attempts')
      .select('*, tests(test_type, title)')
      .eq('user_id', userId)
      .order('completed_at', { ascending: false })
      .limit(20);

    // Calculate stats
    const totalTests = testAttempts?.length || 0;
    const avgScore = totalTests > 0 
      ? testAttempts.reduce((sum, attempt) => {
          return sum + (attempt.score / attempt.total_questions) * 100;
        }, 0) / totalTests 
      : 0;

    // Fetch user progress criteria
    const { data: progressData } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', userId)
      .single();

    // Prepare analysis data for AI
    const analysisPrompt = `
Analyze this student's learning data and provide personalized topic suggestions:

**Student Profile:**
- Name: ${profile?.first_name || 'Student'}
- Level: ${xpData?.current_level || 1}
- Total XP: ${xpData?.total_xp || 0}

**Performance Summary:**
- Tests Taken: ${totalTests}
- Average Score: ${avgScore.toFixed(1)}%
- Knowledge Understanding: ${progressData?.knowledge_understanding || 0}%
- Pattern Recognition: ${progressData?.pattern_recognition || 0}%
- Communication: ${progressData?.communication || 0}%
- Real-Life Applications: ${progressData?.real_life_applications || 0}%

**Struggle Topics (Weaknesses):**
${struggleTopics?.map(t => `- ${t.subject} > ${t.topic} (Difficulty: ${t.difficulty_level}, Struggled ${t.struggle_count} times)`).join('\n') || 'None recorded yet'}

**Recent Test Performance:**
${testAttempts?.slice(0, 5).map(t => `- ${t.tests?.title || 'Test'}: ${t.score}/${t.total_questions} (${((t.score/t.total_questions)*100).toFixed(0)}%)`).join('\n') || 'No tests taken yet'}

Based on this data, provide:
1. **Priority Topics** (3-5 topics the student should focus on, based on weaknesses)
2. **Learning Path** (recommended order to tackle topics)
3. **Motivational Message** (personalized encouragement based on their level and performance)
4. **Specific Resources** (what types of practice they need - e.g., "more practice with algebra word problems")

Format as JSON with this structure:
{
  "priorityTopics": [
    {
      "subject": "mathematics",
      "topic": "topic name",
      "reason": "why they should focus on this",
      "difficulty": "medium",
      "estimatedTime": "2-3 hours"
    }
  ],
  "learningPath": "Step-by-step recommendation",
  "motivationalMessage": "Personalized message",
  "strengthsIdentified": ["strength 1", "strength 2"],
  "nextMilestone": "What to aim for next"
}
`;

    // Call AI for analysis
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'You are an expert educational AI that analyzes student performance data and provides personalized learning recommendations. Always respond with valid JSON.'
          },
          {
            role: 'user',
            content: analysisPrompt
          }
        ],
      }),
    });

    if (!aiResponse.ok) {
      throw new Error(`AI analysis failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const analysisText = aiData.choices[0].message.content;
    
    // Parse JSON from AI response
    let analysis;
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = analysisText.match(/```json\n([\s\S]*?)\n```/) || analysisText.match(/```\n([\s\S]*?)\n```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : analysisText;
      analysis = JSON.parse(jsonStr);
    } catch (e) {
      console.error('Failed to parse AI response:', e);
      // Provide fallback analysis
      analysis = {
        priorityTopics: struggleTopics?.slice(0, 3).map(t => ({
          subject: t.subject,
          topic: t.topic,
          reason: `You've struggled with this ${t.struggle_count} times. Practice will help!`,
          difficulty: t.difficulty_level,
          estimatedTime: '1-2 hours'
        })) || [],
        learningPath: 'Focus on your weaker topics first, then gradually increase difficulty.',
        motivationalMessage: `Great job reaching Level ${xpData?.current_level || 1}! Keep practicing to improve.`,
        strengthsIdentified: [],
        nextMilestone: `Reach Level ${(xpData?.current_level || 1) + 1}`
      };
    }

    // Add user context to response
    const response = {
      ...analysis,
      userLevel: xpData?.current_level || 1,
      totalXP: xpData?.total_xp || 0,
      avgScore: avgScore.toFixed(1),
      totalTests: totalTests,
      strugglingTopicsCount: struggleTopics?.length || 0
    };

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-user-progress:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
