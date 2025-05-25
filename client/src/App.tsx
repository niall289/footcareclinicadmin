import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";

import NotFound from "@/pages/not-found";
import Landing from "@/pages/Landing";
import Dashboard from "@/pages/Dashboard";
import Patients from "@/pages/Patients";
import ChatResults from "@/pages/ChatResults";
import Analytics from "@/pages/Analytics";
import Layout from "@/components/Layout";
import PatientDetails from "@/pages/PatientDetails";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();
  
  // Show authenticated routes only if the user is logged in
  // Otherwise, show the login page
  return (
    <>
      {isLoading ? (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
        </div>
      ) : isAuthenticated ? (
        <Layout>
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/patients" component={Patients} />
            <Route path="/patients/:id">
              {params => <PatientDetails id={parseInt(params.id)} />}
            </Route>
            <Route path="/chat-results" component={ChatResults} />
            <Route path="/analytics" component={Analytics} />
            <Route component={NotFound} />
          </Switch>
        </Layout>
      ) : (
        <Switch>
          <Route path="/login" component={Landing} />
          <Route>
            {() => {
              window.location.href = "/login";
              return null;
            }}
          </Route>
        </Switch>
      )}
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
