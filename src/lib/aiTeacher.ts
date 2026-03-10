import { supabase } from "@/integrations/supabase/client";

interface TeacherContext {
  userMessage?: string;
  studentLevel?: number;
  subject?: string;
  answer?: string;
  taskContent?: any;
  recentProgress?: string[];
  ageGroup?: string;
}

export async function generateTask(subject: string, context: TeacherContext) {
  const { data, error } = await supabase.functions.invoke("ai-teacher", {
    body: { action: "generate_task", subject, context },
  });

  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

export async function correctAnswer(subject: string, context: TeacherContext) {
  const { data, error } = await supabase.functions.invoke("ai-teacher", {
    body: { action: "correct_answer", subject, context },
  });

  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

export async function generateFeedback(subject: string, context: TeacherContext) {
  const { data, error } = await supabase.functions.invoke("ai-teacher", {
    body: { action: "generate_feedback", subject, context },
  });

  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}
