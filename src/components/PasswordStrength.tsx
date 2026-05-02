interface PasswordStrengthProps {
  password: string;
}

export const getPasswordStrength = (pwd: string) => {
  let score = 0;
  if (pwd.length >= 8) score++;
  if (pwd.length >= 12) score++;
  if (/[a-z]/.test(pwd)) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[!@#$%^&*()\-=_+[\]{};:'",.<>/?\\|`~]/.test(pwd)) score++;
  return score; // 0-6
};

export const PasswordStrength = ({ password }: PasswordStrengthProps) => {
  const score = getPasswordStrength(password);
  const pct = Math.min(100, (score / 6) * 100);

  let label = "อ่อนมาก";
  let colorClass = "bg-destructive";
  let textClass = "text-destructive";

  if (password.length === 0) {
    label = "—";
    colorClass = "bg-muted";
    textClass = "text-muted-foreground";
  } else if (score <= 2) {
    label = "อ่อน";
    colorClass = "bg-destructive";
    textClass = "text-destructive";
  } else if (score <= 4) {
    label = "ปานกลาง";
    colorClass = "bg-yellow-500";
    textClass = "text-yellow-500";
  } else if (score === 5) {
    label = "แข็งแรง";
    colorClass = "bg-green-500";
    textClass = "text-green-500";
  } else {
    label = "แข็งแรงมาก";
    colorClass = "bg-emerald-400";
    textClass = "text-emerald-400";
  }

  return (
    <div className="mt-2 space-y-1">
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted/40">
        <div
          className={`h-full ${colorClass} transition-all duration-300 ease-out`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">ความแข็งแรงรหัสผ่าน</span>
        <span className={`font-medium ${textClass}`}>{label}</span>
      </div>
    </div>
  );
};
