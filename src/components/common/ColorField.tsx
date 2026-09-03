import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const SWATCHES = ["#5865F2", "#7C5CFC", "#23A55A", "#ED4245", "#F0B232", "#00A8FC", "#EB459E", "#80848E"];

export function ColorField({
  label,
  value,
  onChange,
  id,
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  id: string;
  className?: string | undefined;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-2">
        <input
          id={id}
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label={`${label} color picker`}
          className="h-9 w-10 cursor-pointer rounded-md border border-border bg-elevated p-1"
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label={`${label} hex value`}
          className="font-mono text-xs uppercase"
        />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {SWATCHES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onChange(s)}
            aria-label={`Use ${s}`}
            aria-pressed={value.toLowerCase() === s.toLowerCase()}
            className={cn(
              "size-5 rounded-full border border-border transition hover:scale-110",
              value.toLowerCase() === s.toLowerCase() && "ring-2 ring-ring ring-offset-2 ring-offset-surface",
            )}
            style={{ background: s }}
          />
        ))}
      </div>
    </div>
  );
}
