import { cn } from "@/lib/utils";

export type KpiCardProps = {
  label: string;
  value: string;
  sub?: string | null;
  alert?: boolean;
  valueClass?: string;
  subClass?: string;
};

export function KpiCard({ label, value, sub, alert, valueClass, subClass }: KpiCardProps) {
  return (
    <div
      className={cn(
        "border rounded-lg p-4",
        alert ? "border-red-300 bg-red-50" : "border-border bg-card"
      )}
    >
      <div className="text-xs uppercase text-muted-foreground">{label}</div>
      <div
        className={cn(
          "text-2xl font-display mt-1",
          alert ? "text-red-700" : "text-ink",
          valueClass
        )}
      >
        {value}
      </div>
      {sub && (
        <div
          className={cn(
            "text-xs mt-1",
            alert ? "text-red-700" : "text-muted-foreground",
            subClass
          )}
        >
          {sub}
        </div>
      )}
    </div>
  );
}
