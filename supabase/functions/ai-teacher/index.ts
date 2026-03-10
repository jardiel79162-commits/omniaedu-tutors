import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, subject, context } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const teacherPersonalities: Record<string, string> = {
      math: `Você é o Professor JTC Matemática. Especialista em contas, raciocínio lógico e operações. 
Você é paciente, acolhedor e nunca julga erros. Explica passo a passo com linguagem simples.
Adapta a dificuldade ao nível do aluno. Elogia o esforço. Corrige com delicadeza.
Fala em português brasileiro.`,
      calligraphy: `Você é a Professora JTC Caligrafia. Especialista em traçado de letras, coordenação motora fina.
Você é paciente, gentil e encoraja cada progresso no traçado. 
Orienta sobre forma, alinhamento, espaçamento e legibilidade.
Fala em português brasileiro.`,
      reading: `Você é o Professor JTC Leitura. Especialista em alfabetização, consciência fonológica e fluência.
Você é paciente e acolhedor. Ensina sons, sílabas e fonemas com calma.
Corrige pronúncia com delicadeza e repete quantas vezes for preciso.
Fala em português brasileiro.`,
      mentor: `Você é o Mentor OmniaEdu. Coordena os três professores (Matemática, Caligrafia, Leitura).
Organiza a rotina do aluno, resume progresso, define prioridades.
Você é motivador, sereno e focado no bem-estar do aluno.
Fala em português brasileiro.`,
    };

    let systemPrompt = teacherPersonalities[subject] || teacherPersonalities.mentor;

    if (action === "generate_task") {
      systemPrompt += `\n\nGere UMA tarefa educacional para o aluno. Retorne usando a tool disponível.
Contexto do aluno: ${JSON.stringify(context)}`;
    } else if (action === "correct_answer") {
      systemPrompt += `\n\nO aluno enviou uma resposta. Corrija com delicadeza, explique o erro se houver, e encoraje.
Contexto: ${JSON.stringify(context)}`;
    } else if (action === "generate_feedback") {
      systemPrompt += `\n\nGere um feedback narrativo sobre o progresso do aluno. Use a tool disponível.
Contexto: ${JSON.stringify(context)}`;
    }

    const body: Record<string, unknown> = {
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: context.userMessage || "Por favor, execute a ação solicitada." },
      ],
    };

    if (action === "generate_task") {
      body.tools = [
        {
          type: "function",
          function: {
            name: "create_task",
            description: "Cria uma tarefa educacional para o aluno.",
            parameters: {
              type: "object",
              properties: {
                title: { type: "string", description: "Título curto da tarefa" },
                instruction: { type: "string", description: "Instrução detalhada e acolhedora para o aluno" },
                difficulty: { type: "number", description: "Nível de dificuldade de 1 a 5" },
                content: {
                  type: "object",
                  properties: {
                    type: { type: "string", enum: ["calculation", "writing", "reading"] },
                    problem: { type: "string", description: "O problema ou exercício" },
                    expected_answer: { type: "string", description: "A resposta esperada" },
                    hints: {
                      type: "array",
                      items: { type: "string" },
                      description: "Dicas para ajudar o aluno",
                    },
                  },
                  required: ["type", "problem"],
                  additionalProperties: false,
                },
              },
              required: ["title", "instruction", "difficulty", "content"],
              additionalProperties: false,
            },
          },
        },
      ];
      body.tool_choice = { type: "function", function: { name: "create_task" } };
    } else if (action === "generate_feedback") {
      body.tools = [
        {
          type: "function",
          function: {
            name: "create_progress_note",
            description: "Cria uma nota narrativa de progresso do aluno.",
            parameters: {
              type: "object",
              properties: {
                narrative: { type: "string", description: "Texto narrativo em primeira pessoa do professor, descrevendo o progresso" },
                teacher_name: { type: "string", description: "Nome do professor (ex: Prof. JTC Matemática)" },
              },
              required: ["narrative", "teacher_name"],
              additionalProperties: false,
            },
          },
        },
      ];
      body.tool_choice = { type: "function", function: { name: "create_progress_note" } };
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Muitas requisições. Tente novamente em alguns segundos." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erro no serviço de IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await response.json();

    // Parse tool calls or text response
    const choice = result.choices?.[0];
    let parsed: Record<string, unknown> = {};

    if (choice?.message?.tool_calls?.[0]) {
      const toolCall = choice.message.tool_calls[0];
      parsed = {
        tool: toolCall.function.name,
        data: JSON.parse(toolCall.function.arguments),
      };
    } else if (choice?.message?.content) {
      parsed = { text: choice.message.content };
    }

    return new Response(JSON.stringify(parsed), {
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
