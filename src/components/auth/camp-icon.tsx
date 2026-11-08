import { Input } from "@/components/ui/input";

/** Câmp de text cu iconiță în stânga, ca în aplicație. */
export function CampIcon({
  pictograma: Pictograma,
  className,
  ...props
}: React.ComponentProps<"input"> & { pictograma: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="relative">
      <Pictograma className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input {...props} className={`pl-10 ${className ?? ""}`} />
    </div>
  );
}
