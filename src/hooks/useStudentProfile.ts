import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface StudentProfile {
  id: string;
  user_id: string;
  display_name: string;
  age: number | null;
  math_level: number;
  reading_level: number;
  calligraphy_level: number;
  onboarding_completed: boolean;
}

export function useStudentProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setProfile(null); setLoading(false); return; }

    const fetch = async () => {
      const { data } = await supabase
        .from("student_profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      setProfile(data as StudentProfile | null);
      setLoading(false);
    };
    fetch();
  }, [user]);

  return { profile, loading, refetch: async () => {
    if (!user) return;
    const { data } = await supabase.from("student_profiles").select("*").eq("user_id", user.id).maybeSingle();
    setProfile(data as StudentProfile | null);
  }};
}
