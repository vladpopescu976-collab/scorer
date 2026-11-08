import { Input } from "@/components/ui/input";

/** Câmp de text cu iconiță în stânga, ca în aplicație. */
export function CampIcon({
  pictograma: Pictograma,
  className,
  ...props
}: React.ComponentProps<"input"> & { pictograma: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="relative">

      <Input {...props} data-cu-icon className={`peer pr-4 pl-12 ${className ?? ""}`} />
      <Pictograma className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground transition-colors peer-focus:text-primary" />
    </div>
  );
}
