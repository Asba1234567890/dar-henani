import { cn } from "@/lib/utils";

export function PageContainer({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8", className)} {...props} />;
}
