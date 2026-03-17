// src/app/api/portfolios/route.ts
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
})

const isDemoModeEnabled = process.env.NEXT_PUBLIC_BYPASS_AUTH === 'true';
const demoUserId = process.env.DEMO_USER_ID;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function createPrivilegedSupabaseClient() {
  if (!serviceRoleKey) {
    return null;
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
  );
}

export async function GET(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          Authorization: req.headers.get('Authorization')!,
        },
      },
    }
  );

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (isDemoModeEnabled && !user) {
    if (!demoUserId) {
      return NextResponse.json({ error: 'Missing DEMO_USER_ID for demo mode.' }, { status: 500 });
    }

    const privilegedSupabase = createPrivilegedSupabaseClient();

    if (!privilegedSupabase) {
      return NextResponse.json({ error: 'Missing SUPABASE_SERVICE_ROLE_KEY for demo mode.' }, { status: 500 });
    }

    const { data, error } = await privilegedSupabase
      .from('portfolios')
      .select('*')
      .eq('user_id', demoUserId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase demo fetch error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data ?? []);
  }

  if (!user || userError) {
    return NextResponse.json({ error: 'Unauthorized User' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('portfolios')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Supabase fetch error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          Authorization: req.headers.get('Authorization')!,
        },
      },
    }
  );

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if ((!user || userError) && !isDemoModeEnabled) {
    return NextResponse.json({ error: 'Unauthorized User' }, { status: 401 });
  }

  if (user) {
    console.log("User authenticated:", {
      user_id: user.id,
      user_id_type: typeof user.id,
      user_email: user.email
    });
  }

  // console.log("user.id:", user.id);
  // console.log("Authorization header:", req.headers.get('Authorization'));

  const body = await req.json();
  const { age, risk_tolerance, investment_goal, time_horizon} = body;

  const prompt = `You are an experienced investment advisor. Based on the following information, recommend a suitable asset allocation strategy and briefly explain your reasoning:  
- Age: ${age}  
- Risk tolerance: ${risk_tolerance}  
- Investment goal: ${investment_goal}  
- Time horizon: ${time_horizon} years`;

  let ai_recommendation = {};

  try {
    const aiRes = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt}],
    })

    // Convert the AI response to a JSON object
    const aiResponseText = aiRes.choices[0].message.content ?? '';
    ai_recommendation = {
      recommendation: aiResponseText,
      generated_at: new Date().toISOString()
    };
  }
  catch(e){
    console.error("AI generation error:", e);
    return NextResponse.json({error: "Sorry! AI generation failed"}, {status:500});
  }

  // Debug: Log what we're trying to insert
  console.log("Attempting to insert:", {
    user_id: user?.id ?? demoUserId ?? 'demo-user',
    age,
    risk_tolerance,
    investment_goal,
    time_horizon,
    ai_recommendation,
  });

  if (isDemoModeEnabled && !user) {
    if (!demoUserId) {
      return NextResponse.json({ error: 'Missing DEMO_USER_ID for demo mode.' }, { status: 500 });
    }

    const privilegedSupabase = createPrivilegedSupabaseClient();

    if (!privilegedSupabase) {
      return NextResponse.json({ error: 'Missing SUPABASE_SERVICE_ROLE_KEY for demo mode.' }, { status: 500 });
    }

    const { data, error } = await privilegedSupabase
      .from('portfolios')
      .insert([
        {
          user_id: demoUserId,
          age,
          risk_tolerance,
          investment_goal,
          time_horizon,
          ai_recommendation,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Supabase demo insert error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  }

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized User' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('portfolios')
    .insert([
      {
        user_id: user.id,
        age,
        risk_tolerance,
        investment_goal,
        time_horizon,
        ai_recommendation,
      },
    ])
    .select()
    .single();

  if (error) {
    console.error("Supabase insert error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
