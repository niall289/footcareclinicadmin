import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PatientTable from "@/components/PatientTable";
import PatientFilters from "@/components/PatientFilters";
import ResponseAnalysisCard from "@/components/ResponseAnalysisCard";
import { Skeleton } from "@/components/ui/skeleton";

export default function ChatResults() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("all");
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [filters, setFilters] = useState({
    search: "",
    condition: "",
    dateRange: "",
    startDate: undefined,
    endDate: undefined,
  });

  // Determine status filter based on active tab
  const statusFilter = activeTab === "all" 
    ? undefined 
    : activeTab === "flagged" 
      ? "flagged" 
      : activeTab === "completed" 
        ? "completed" 
        : activeTab === "in-progress" 
          ? "in_progress" 
          : undefined;

  // Fetch assessments with pagination and filters
  const { data, isLoading } = useQuery({
    queryKey: [
      "/api/assessments",
      {
        page,
        limit,
        search: filters.search,
        condition: filters.condition,
        startDate: filters.startDate?.toISOString?.(),
        endDate: filters.endDate?.toISOString?.(),
        status: statusFilter,
      },
    ],
  });

  // Fetch flagged responses summary
  const { data: flaggedData, isLoading: isLoadingFlagged } = useQuery({
    queryKey: ["/api/dashboard/stats"],
  });

  // Handle filter changes
  const handleFilterChange = (newFilters: any) => {
    setFilters(newFilters);
    setPage(1); // Reset to first page when filters change
    
    toast({
      title: "Filters Applied",
      description: "The chat results have been filtered according to your selection.",
    });
  };

  // Handle page change
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  // Handle export data
  const handleExportData = () => {
    const link = document.createElement("a");
    link.href = "/api/export/all";
    link.download = "foot-care-responses-export.json";
    link.click();
    
    toast({
      title: "Export Started",
      description: "Your chat results export has been initiated.",
    });
  };

  // Handle tab change
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setPage(1); // Reset to first page when tab changes
  };

  return (
    <>
      <Helmet>
        <title>Chat Results | Foot Care Clinic</title>
        <meta name="description" content="Review and analyze chatbot responses from Foot Care Clinic patients." />
      </Helmet>
      
      <div className="py-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {/* Page header */}
        <div className="md:flex md:items-center md:justify-between mb-6">
          <div className="min-w-0 flex-1">
            <h2 className="text-2xl font-bold leading-7 text-neutral-800 dark:text-white sm:truncate sm:text-3xl sm:tracking-tight">
              Chat Results
            </h2>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
              Review and analyze patient responses from the chatbot
            </p>
          </div>
        </div>

        {/* Response overview cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
          <ResponseAnalysisCard 
            title="Total Responses"
            icon="ri-chat-3-line"
            value={data?.pagination?.total || 0}
            description="All chatbot interactions"
            isLoading={isLoading}
          />
          
          <ResponseAnalysisCard 
            title="Completed Assessments"
            icon="ri-check-line"
            value={flaggedData?.completedAssessments || 0}
            description="Fully answered sessions"
            isLoading={isLoadingFlagged}
            color="green"
          />
          
          <ResponseAnalysisCard 
            title="In Progress"
            icon="ri-time-line"
            value={data?.assessments?.filter(a => a.status === 'in_progress')?.length || 0}
            description="Unfinished assessments"
            isLoading={isLoading}
            color="blue"
          />
          
          <ResponseAnalysisCard 
            title="Flagged Responses"
            icon="ri-flag-line"
            value={flaggedData?.flaggedResponses || 0}
            description="Responses needing attention"
            isLoading={isLoadingFlagged}
            color="red"
          />
        </div>

        {/* Tabs for filtering results */}
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle>Response Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all" value={activeTab} onValueChange={handleTabChange}>
              <TabsList className="grid grid-cols-4 mb-4">
                <TabsTrigger value="all">All Responses</TabsTrigger>
                <TabsTrigger value="completed">Completed</TabsTrigger>
                <TabsTrigger value="in-progress">In Progress</TabsTrigger>
                <TabsTrigger value="flagged">Flagged</TabsTrigger>
              </TabsList>
              
              <TabsContent value={activeTab}>
                {/* Filters */}
                <PatientFilters
                  onFilterChange={handleFilterChange}
                  onExportData={handleExportData}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Patient/Chat results table */}
        <PatientTable
          assessments={data?.assessments}
          isLoading={isLoading}
          pagination={data?.pagination}
          onPageChange={handlePageChange}
        />
      </div>
    </>
  );
}
