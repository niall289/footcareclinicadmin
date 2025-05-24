import { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import logoImage from "../assets/logo.png";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [location] = useLocation();

  // Close mobile menu when location changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  // For non-authenticated users or during loading, just render children without layout
  if (!isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar for larger screens */}
      <Sidebar 
        user={user}
        className="hidden md:flex md:flex-col md:fixed md:inset-y-0 z-10"
      />

      {/* Mobile menu (overlay) */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" aria-hidden="true" />
          <div 
            className="fixed inset-y-0 left-0 z-40 w-64 bg-white dark:bg-neutral-800 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <Sidebar 
              user={user}
              className="flex flex-col h-full"
              onClose={() => setIsMobileMenuOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Mobile header */}
      <div className="md:hidden fixed inset-x-0 top-0 z-10 flex h-16 items-center bg-white dark:bg-neutral-800 shadow-sm">
        <div className="flex items-center px-4 w-full justify-between">
          <div className="flex items-center">
            <button 
              type="button"
              className="text-neutral-500 hover:text-neutral-700 dark:text-neutral-300 dark:hover:text-white"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <i className="ri-menu-line text-xl mr-3" />
            </button>
            <div className="flex items-center">
              <img 
                src={logoImage} 
                alt="FootCare Clinic Logo" 
                className="h-8 w-auto"
              />
            </div>
          </div>
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
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1 md:pl-64 pt-16 md:pt-0 overflow-y-auto bg-neutral-50 dark:bg-neutral-900">
        {children}
      </main>
    </div>
  );
}
