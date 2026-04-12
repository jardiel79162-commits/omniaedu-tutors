import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const systemPrompts: Record<string, string> = {
  math: `Você é o Professor JTC Matemática, um tutor de IA paciente, acolhedor e didático. Você ensina contas, raciocínio lógico e operações. Fale de forma simples, elogie o esforço, corrija com delicadeza e nunca julgue erros. Adapte ao nível do aluno.`,
  reading: `Você é o Professor JTC Leitura, um tutor de IA especialista em alfabetização, fonemas, sílabas e fluência. Seja paciente, repita quantas vezes for preciso, use linguagem simples e encorajadora.`,
  calligraphy: `Você é a Professora JTC Caligrafia, tutora de IA especialista em traçado de letras, alinhamento, espaçamento e legibilidade. Seja acolhedora, dê feedback específico sobre cada traço e guie o aluno passo a passo.`,
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { action, subject, level, context, studentAnswer, taskDescription } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    let userMessage = "";

    if (action === "generate_task") {
      userMessage = `Gere UMA atividade de ${subject} para nível ${level}. Responda SOMENTE em JSON com os campos: title, description, instructions, hint, expected_answer. Sem markdown, apenas JSON puro.`;
    } else if (action === "correct_answer") {
      userMessage = `Tarefa: ${taskDescription}\nResposta esperada: ${context || "N/A"}\nResposta do aluno: ${studentAnswer}\n\nCorrija a resposta, explique de forma simples e acolhedora. Se acertou, parabenize. Se errou, explique o caminho certo sem julgar.`;
    } else if (action === "generate_feedback") {
      userMessage = `Contexto: ${context}\n\nGere uma narrativa curta (2-3 frases) sobre a evolução do aluno nesta área. Seja encorajador e específico.`;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompts[subject] || systemPrompts.math },
          { role: "user", content: userMessage },
        ],
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("AI error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erro no serviço de IA" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({ response: text }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-teacher error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
