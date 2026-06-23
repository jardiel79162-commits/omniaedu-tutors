import { evaluatePassword } from "@/lib/password-strength";

export function PasswordStrengthMeter({ password }: { password: string }) {
  if (!password) return null;
  const s = evaluatePassword(password);
  return (
    <div className="mt-2 space-y-1.5">
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full ${s.color} transition-all duration-300`}
          style={{ width: `${s.percent}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-[11px]">
        <span className="font-medium text-foreground/80">Força: {s.label}</span>
        {s.suggestions[0] && (
          <span className="text-muted-foreground truncate ml-2">{s.suggestions[0]}</span>
        )}
      </div>
    </div>
  );
}
