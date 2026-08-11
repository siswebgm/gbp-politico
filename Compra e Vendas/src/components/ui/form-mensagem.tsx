import { cn } from "@/lib/utils";

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-sm font-medium text-destructive">{message}</p>;
}

export function FormFieldError({
  message,
  className,
}: {
  message?: string;
  className?: string;
}) {
  if (!message) return null;
  return (
    <p className={cn("mt-1 text-xs font-medium text-destructive", className)}>
      {message}
    </p>
  );
}
