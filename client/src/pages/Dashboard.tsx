import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import StatsCard from "@/components/StatsCard";
import PatientTable from "@/components/PatientTable";
import PatientFilters from "@/components/PatientFilters";
import { ResponseTrendsChart, CommonConditionsChart } from "@/components/SimpleCharts";
import { Download, Filter } from "lucide-react";
import WebSocketStatus from "@/components/WebSocketStatus";

export default function Dashboard() {
  const { toast } = useToast();
  const [timeRange, setTimeRange] = useState("7");
  const [conditionsLimit, setConditionsLimit] = useState("5");
  
  // Fetch dashboard stats
  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ["/api/dashboard/stats"],
  });
  
  // Fetch response trends
  const { data: trends, isLoading: isLoadingTrends } = useQuery({
    queryKey: ["/api/dashboard/trends", { days: timeRange }],
  });
  
  // Fetch top conditions
  const { data: conditions, isLoading: isLoadingConditions } = useQuery({
    queryKey: ["/api/dashboard/conditions", { limit: conditionsLimit }],
  });
  
  // Fetch recent assessments
  const { data: recentAssessments, isLoading: isLoadingAssessments } = useQuery({
    queryKey: ["/api/assessments/recent", { limit: 5 }],
  });
  
  // Handle filter changes
  const handleFilterChange = (filters: any) => {
    toast({
      title: "Filters Applied",
      description: "The data has been filtered according to your selection.",
    });
  };
  
  // Handle export data
  const handleExportData = () => {
    // Create a link to download the data
    const link = document.createElement("a");
    link.href = "/api/export/all";
    link.download = "foot-care-data-export.json";
    link.click();
    
    toast({
      title: "Export Started",
      description: "Your data export has been initiated.",
    });
  };

  return (
    <>
      <Helmet>
        <title>Dashboard | Foot Care Clinic</title>
        <meta name="description" content="View patient data and chatbot interactions for the Foot Care Clinic portal." />
      </Helmet>
      
      <div className="py-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {/* Dashboard header section */}
        <div className="md:flex md:items-center md:justify-between mb-6">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold leading-7 text-neutral-800 dark:text-white sm:truncate sm:text-3xl sm:tracking-tight">Dashboard</h2>
              <WebSocketStatus />
            </div>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">Review patient data and chatbot interactions</p>
          </div>
          <div className="mt-4 flex md:ml-4 md:mt-0 space-x-2">
            <Button variant="outline" onClick={handleExportData}>
              <Download className="mr-2 h-4 w-4" />
              Export Data
            </Button>
            <Button>
              <Filter className="mr-2 h-4 w-4" />
              Filter Results
            </Button>
          </div>
        </div>

        {/* Stats overview */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
          <StatsCard
            title="Total Patients"
            value={stats?.totalPatients}
            icon="ri-user-3-line"
            iconColor="text-primary-500"
            iconBgColor="bg-primary-50 dark:bg-primary-900/20"
            linkText="View all patients"
            linkHref="/patients"
            isLoading={isLoadingStats}
          />
          
          <StatsCard
            title="Completed Assessments"
            value={stats?.completedAssessments}
            icon="ri-chat-check-line"
            iconColor="text-green-500"
            iconBgColor="bg-green-50 dark:bg-green-900/20"
            linkText="View completed"
            linkHref="/chat-results"
            isLoading={isLoadingStats}
          />
          
          <StatsCard
            title="Assessments This Week"
            value={stats?.weeklyAssessments}
            icon="ri-calendar-check-line"
            iconColor="text-blue-500"
            iconBgColor="bg-blue-50 dark:bg-blue-900/20"
            linkText="View weekly data"
            linkHref="/analytics"
            isLoading={isLoadingStats}
          />
          
          <StatsCard
            title="Flagged Responses"
            value={stats?.flaggedResponses}
            icon="ri-flag-2-line"
            iconColor="text-red-500"
            iconBgColor="bg-red-50 dark:bg-red-900/20"
            linkText="Review flagged"
            linkHref="/chat-results?flagged=true"
            isLoading={isLoadingStats}
          />
        </div>

        {/* Charts and analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <ResponseTrendsChart
            data={trends}
            isLoading={isLoadingTrends}
            timeRange={timeRange}
            onTimeRangeChange={setTimeRange}
          />
          
          <CommonConditionsChart
            data={conditions}
            isLoading={isLoadingConditions}
            limit={conditionsLimit}
            onLimitChange={setConditionsLimit}
          />
        </div>

        {/* Patient search and filters */}
        <div className="mb-6">
          <PatientFilters 
            onFilterChange={handleFilterChange}
            onExportData={handleExportData}
          />
        </div>

        {/* Recent patients */}
        <PatientTable 
          assessments={recentAssessments}
          isLoading={isLoadingAssessments}
        />
      </div>
    </>
  );
}
