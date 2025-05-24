import { Helmet } from "react-helmet";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";

export default function Landing() {
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [, navigate] = useLocation();
  
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password) {
      toast({
        title: "Password required",
        description: "Please enter the password to access the dashboard.",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Use our custom apiRequest function
      const data = await apiRequest("/api/login", {
        method: "POST",
        body: JSON.stringify({ password }),
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      if (data.success) {
        // Invalidate the auth query to fetch the new user data
        await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
        toast({
          title: "Login successful",
          description: "Welcome to the Foot Care Clinic dashboard.",
        });
        navigate("/");
      } else {
        toast({
          title: "Login failed",
          description: "The password you entered is incorrect.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Login error:", error);
      toast({
        title: "Login failed",
        description: "An error occurred during login. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <>
      <Helmet>
        <title>Welcome | Foot Care Clinic</title>
        <meta name="description" content="Welcome to the Foot Care Clinic patient portal. Log in to view your patient data and chatbot interactions." />
      </Helmet>
      
      <div className="min-h-screen w-full flex flex-col items-center bg-neutral-50 dark:bg-neutral-900">
        {/* Navbar */}
        <header className="w-full bg-white dark:bg-neutral-800 shadow-sm py-4">
          <div className="container mx-auto px-4 flex items-center justify-between">
            <div className="flex items-center">
              <i className="ri-footprint-line text-primary-500 text-3xl mr-2" />
              <h1 className="text-xl font-semibold text-neutral-800 dark:text-white">Foot Care Clinic</h1>
            </div>
          </div>
        </header>
        
        {/* Hero section */}
        <section className="flex-1 flex flex-col items-center justify-center w-full px-4 py-12">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 dark:text-white mb-4">
              Client Portal for Foot Care Professionals
            </h2>
            <p className="text-xl text-neutral-600 dark:text-neutral-300 mb-8">
              Access patient chatbot results, analyze data, and improve patient care with our dedicated dashboard.
            </p>
            
            <Card className="max-w-md mx-auto">
              <CardContent className="pt-6">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Input
                      type="password"
                      placeholder="Enter password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="text-center"
                    />
                  </div>
                  <Button 
                    type="submit" 
                    size="lg" 
                    className="w-full" 
                    disabled={isLoading}
                  >
                    {isLoading ? "Logging in..." : "Log In to Access Dashboard"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </section>
        
        {/* Features section */}
        <section className="w-full py-16 bg-white dark:bg-neutral-800">
          <div className="container mx-auto px-4">
            <h3 className="text-2xl font-bold text-center text-neutral-900 dark:text-white mb-12">
              Powerful Tools for Healthcare Professionals
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center mb-4">
                    <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-primary-50 dark:bg-primary-900/20 text-primary-500">
                      <i className="ri-dashboard-line text-2xl" />
                    </div>
                  </div>
                  <h4 className="text-xl font-semibold text-center mb-2">Intuitive Dashboard</h4>
                  <p className="text-neutral-600 dark:text-neutral-300 text-center">
                    Get a complete overview of patient interactions and chatbot results in a clean, easy-to-use interface.
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center mb-4">
                    <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-primary-50 dark:bg-primary-900/20 text-primary-500">
                      <i className="ri-bar-chart-box-line text-2xl" />
                    </div>
                  </div>
                  <h4 className="text-xl font-semibold text-center mb-2">Data Visualization</h4>
                  <p className="text-neutral-600 dark:text-neutral-300 text-center">
                    Analyze trends and patterns with powerful charts and visual analytics tools.
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center mb-4">
                    <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-primary-50 dark:bg-primary-900/20 text-primary-500">
                      <i className="ri-user-3-line text-2xl" />
                    </div>
                  </div>
                  <h4 className="text-xl font-semibold text-center mb-2">Patient Management</h4>
                  <p className="text-neutral-600 dark:text-neutral-300 text-center">
                    Easily access and review individual patient responses and assessment history.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
        
        {/* Footer */}
        <footer className="w-full bg-neutral-100 dark:bg-neutral-800/50 py-6">
          <div className="container mx-auto px-4 text-center">
            <p className="text-neutral-600 dark:text-neutral-400">
              © {new Date().getFullYear()} Foot Care Clinic. All rights reserved.
            </p>
          </div>
        </footer>
      </div>
    </>
  );
}
