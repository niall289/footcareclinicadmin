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
  // Skip authentication entirely for now
  // This gives us immediate dashboard access
  
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/patients" component={Patients} />
        <Route path="/patients/:id">
          {params => <PatientDetails id={parseInt(params.id)} />}
        </Route>
        <Route path="/chat-results" component={ChatResults} />
        <Route path="/analytics" component={Analytics} />
        <Route path="/login" component={Landing} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
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
