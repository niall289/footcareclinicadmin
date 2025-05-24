import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface StatsCardProps {
  title: string;
  value?: number;
  icon: string;
  iconColor: string;
  iconBgColor: string;
  linkText?: string;
  linkHref?: string;
  isLoading?: boolean;
}

export default function StatsCard({
  title,
  value,
  icon,
  iconColor,
  iconBgColor,
  linkText,
  linkHref,
  isLoading = false,
}: StatsCardProps) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="p-5">
          <div className="flex items-center">
            <div className={cn("flex-shrink-0 rounded-md p-3", iconBgColor)}>
              <i className={cn(icon, "text-xl", iconColor)} />
            </div>
            <div className="ml-5 w-0 flex-1">
              <div className="text-sm font-medium text-neutral-500 dark:text-neutral-400 truncate">
                {title}
              </div>
              <div>
                {isLoading ? (
                  <Skeleton className="h-7 w-16 mt-1" />
                ) : (
                  <div className="text-lg font-medium text-neutral-900 dark:text-white">
                    {value?.toLocaleString() || 0}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        {linkText && linkHref && (
          <div className="bg-neutral-50 dark:bg-neutral-800/50 px-5 py-3">
            <div className="text-sm">
              <a
                href={linkHref}
                className="font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300"
              >
                {linkText}
              </a>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
