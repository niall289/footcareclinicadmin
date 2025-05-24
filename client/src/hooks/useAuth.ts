import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";

export function useAuth() {
  // For development: bypass auth check and return mock user
  // This ensures the portal is accessible during development
  const mockUser = {
    id: 'admin',
    role: 'admin',
    authenticated: true
  };
  
  return {
    user: mockUser,
    isLoading: false,
    isAuthenticated: true,
  };
}
