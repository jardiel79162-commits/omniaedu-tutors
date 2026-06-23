export type StrengthLevel = "muito_fraca" | "fraca" | "aceitavel" | "forte" | "muito_forte";

export interface PasswordStrength {
  score: number; // 0-4
  level: StrengthLevel;
  label: string;
  color: string; // tailwind bg class
  percent: number; // 0-100
  suggestions: string[];
}

export function evaluatePassword(pwd: string): PasswordStrength {
  const suggestions: string[] = [];
  let score = 0;

  if (!pwd) {
    return {
      score: 0,
      level: "muito_fraca",
      label: "Muito fraca",
      color: "bg-destructive",
      percent: 0,
      suggestions: ["Digite uma senha"],
    };
  }

  const len = pwd.length;
  const hasLower = /[a-z]/.test(pwd);
  const hasUpper = /[A-Z]/.test(pwd);
  const hasDigit = /\d/.test(pwd);
  const hasSymbol = /[^A-Za-z0-9]/.test(pwd);
  const variety = [hasLower, hasUpper, hasDigit, hasSymbol].filter(Boolean).length;

  if (len >= 8) score++; else suggestions.push("Use pelo menos 8 caracteres");
  if (len >= 12) score++; else if (len >= 8) suggestions.push("12+ caracteres deixam mais segura");
  if (variety >= 2) score++; else suggestions.push("Misture letras e números");
  if (variety >= 3) score++;
  if (variety === 4 && len >= 12) score++;

  // padrões fracos comuns
  const common = /^(123|abc|qwerty|senha|password|admin|111|000)/i;
  if (common.test(pwd)) score = Math.max(0, score - 2);
  if (/^(.)\1+$/.test(pwd)) score = 0;

  score = Math.min(4, Math.max(0, score));

  const map: Record<number, Omit<PasswordStrength, "score" | "suggestions" | "percent">> = {
    0: { level: "muito_fraca", label: "Muito fraca", color: "bg-destructive" },
    1: { level: "fraca", label: "Fraca", color: "bg-destructive/80" },
    2: { level: "aceitavel", label: "Aceitável", color: "bg-yellow-500" },
    3: { level: "forte", label: "Forte", color: "bg-emerald-500" },
    4: { level: "muito_forte", label: "Muito forte", color: "bg-emerald-600" },
  };

  return {
    score,
    ...map[score],
    percent: ((score + (pwd ? 1 : 0)) / 5) * 100,
    suggestions: suggestions.slice(0, 2),
  };
}
