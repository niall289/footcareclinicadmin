import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useTheme } from "./ThemeProvider";
import { MoonIcon, SunIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import fionaImage from "../assets/fiona.png";
import logoImage from "../assets/logo.png";

interface SidebarProps {
  className?: string;
  user?: any;
  onClose?: () => void;
}

export default function Sidebar({ className, user, onClose }: SidebarProps) {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  
  const handleLogout = async () => {
    try {
      const response = await fetch('/api/logout', {
        method: 'POST',
      });
      
      if (response.ok) {
        // Invalidate auth query
        await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
        toast({
          title: "Logged out",
          description: "You have been successfully logged out.",
        });
        setLocation('/');
      }
    } catch (error) {
      console.error('Logout error:', error);
      toast({
        title: "Logout failed",
        description: "An error occurred during logout. Please try again.",
        variant: "destructive",
      });
    }
  };

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

  const navigation = [
    { name: "Dashboard", href: "/", icon: "ri-dashboard-line" },
    { name: "Patients", href: "/patients", icon: "ri-user-3-line" },
    { name: "Chat Results", href: "/chat-results", icon: "ri-chat-3-line" },
    { name: "Analytics", href: "/analytics", icon: "ri-bar-chart-box-line" },
  ];

  return (
    <aside className={cn("w-64 bg-[hsl(186,30%,98%)] dark:bg-[hsl(186,30%,15%)] shadow-lg", className)}>
      <div className="flex flex-col h-full overflow-y-auto">
        <div className="flex items-center justify-center h-20 px-4 border-b border-[hsl(186,76%,90%)] dark:border-[hsl(186,30%,25%)]">
          <div className="flex items-center">
            <div className="relative mr-3">
              <div className="w-14 h-14 rounded-full bg-[hsl(186,76%,85%)] border-2 border-[hsl(186,100%,30%)] flex items-center justify-center shadow-sm overflow-hidden">
                <img 
                  src={fionaImage} 
                  alt="Fiona - FootCare Clinic Assistant" 
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-[hsl(186,100%,30%)] rounded-full flex items-center justify-center">
                <i className="ri-footprint-line text-white text-xs" />
              </div>
            </div>
            <div className="flex flex-col items-start">
              <img src={logoImage} alt="FootCare Clinic Logo" className="h-8 w-auto mb-1" />
              <p className="text-xs text-[hsl(186,76%,40%)] dark:text-[hsl(186,76%,75%)]">Powered by Fiona</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 py-4 px-2">
          <div className="space-y-1">
            {navigation.map((item) => {
              const isActive = location === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    "flex items-center px-3 py-2 text-sm font-medium rounded-md",
                    isActive 
                      ? "bg-[hsl(186,76%,93%)] text-[hsl(186,100%,30%)] dark:bg-[hsl(186,30%,20%)] dark:text-[hsl(186,76%,85%)]" 
                      : "text-[hsl(210,20%,25%)] dark:text-[hsl(210,20%,80%)] hover:bg-[hsl(186,76%,95%)] dark:hover:bg-[hsl(186,30%,22%)]"
                  )}
                >
                  <i className={cn(item.icon, "mr-3 text-lg", isActive ? "text-[hsl(186,100%,30%)]" : "")} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="border-t border-[hsl(186,76%,90%)] dark:border-[hsl(186,30%,25%)] p-4">
          <div className="flex flex-col space-y-4">
            <Button
              variant="outline"
              size="sm"
              className="justify-start text-[hsl(186,100%,30%)] border-[hsl(186,76%,90%)]"
              onClick={toggleTheme}
            >
              {theme === "light" ? (
                <>
                  <MoonIcon className="h-4 w-4 mr-2" />
                  <span>Dark Mode</span>
                </>
              ) : (
                <>
                  <SunIcon className="h-4 w-4 mr-2" />
                  <span>Light Mode</span>
                </>
              )}
            </Button>

            <div className="flex items-center">
              <div className="flex-shrink-0 h-9 w-9 rounded-full bg-neutral-200 dark:bg-neutral-700 overflow-hidden">
                {user?.profileImageUrl ? (
                  <img 
                    src={user.profileImageUrl} 
                    alt="User profile" 
                    className="h-full w-full object-cover" 
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-neutral-500 dark:text-neutral-300">
                    <i className="ri-user-3-line" />
                  </div>
                )}
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-neutral-800 dark:text-white">
                  {user?.firstName && user?.lastName 
                    ? `${user.firstName} ${user.lastName}`
                    : user?.email || "User"}
                </p>
                <button 
                  onClick={handleLogout}
                  className="text-xs text-neutral-500 dark:text-neutral-400 hover:text-primary-500 dark:hover:text-primary-400"
                >
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
