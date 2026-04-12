import { supabase } from "@/integrations/supabase/client";

export type Subject = "math" | "reading" | "calligraphy";
export type AiAction = "generate_task" | "correct_answer" | "generate_feedback";

interface AiTeacherRequest {
  action: AiAction;
  subject: Subject;
  level: number;
  context?: string;
  studentAnswer?: string;
  taskDescription?: string;
}

export async function callAiTeacher(req: AiTeacherRequest): Promise<string> {
  const { data, error } = await supabase.functions.invoke("ai-teacher", {
    body: req,
  });
  if (error) throw error;
  return data?.response ?? data?.text ?? JSON.stringify(data);
}
