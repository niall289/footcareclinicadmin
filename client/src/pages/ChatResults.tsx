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
        <Card className="mb-6 border-l-4 border-l-[hsl(186,100%,30%)]">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center">
                <span className="mr-2">📊</span>
                Response Categories
              </CardTitle>
              <div className="flex items-center text-xs text-neutral-500 dark:text-neutral-400 bg-[hsl(186,76%,97%)] dark:bg-neutral-700 px-3 py-1 rounded-full">
                <span className="mr-1">💡</span>
                Filter by assessment status
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Category explanations */}
            <div className="mb-4 p-4 bg-gradient-to-r from-[hsl(186,76%,97%)] to-white dark:from-neutral-800 dark:to-neutral-700 rounded-lg border border-[hsl(186,76%,90%)] dark:border-neutral-600">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-neutral-400 rounded-full mt-1.5 flex-shrink-0"></div>
                  <div>
                    <span className="font-medium text-neutral-700 dark:text-neutral-300">All Responses:</span>
                    <p className="text-neutral-600 dark:text-neutral-400 mt-0.5">Complete overview of all patient assessments</p>
                  </div>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full mt-1.5 flex-shrink-0"></div>
                  <div>
                    <span className="font-medium text-neutral-700 dark:text-neutral-300">Completed:</span>
                    <p className="text-neutral-600 dark:text-neutral-400 mt-0.5">Finished assessments ready for analysis</p>
                  </div>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-blue-400 rounded-full mt-1.5 flex-shrink-0"></div>
                  <div>
                    <span className="font-medium text-neutral-700 dark:text-neutral-300">In Progress:</span>
                    <p className="text-neutral-600 dark:text-neutral-400 mt-0.5">Patients who need follow-up to complete</p>
                  </div>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-red-400 rounded-full mt-1.5 flex-shrink-0"></div>
                  <div>
                    <span className="font-medium text-neutral-700 dark:text-neutral-300">Flagged:</span>
                    <p className="text-neutral-600 dark:text-neutral-400 mt-0.5">Cases requiring immediate attention</p>
                  </div>
                </div>
              </div>
            </div>

            <Tabs defaultValue="all" value={activeTab} onValueChange={handleTabChange}>
              <TabsList className="grid grid-cols-4 mb-4 bg-white dark:bg-neutral-800 border border-[hsl(186,76%,90%)] dark:border-neutral-600">
                <TabsTrigger value="all" className="data-[state=active]:bg-[hsl(186,100%,30%)] data-[state=active]:text-white">
                  <span className="mr-1">📋</span>
                  All Responses
                </TabsTrigger>
                <TabsTrigger value="completed" className="data-[state=active]:bg-green-500 data-[state=active]:text-white">
                  <span className="mr-1">✅</span>
                  Completed
                </TabsTrigger>
                <TabsTrigger value="in-progress" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">
                  <span className="mr-1">⏳</span>
                  In Progress
                </TabsTrigger>
                <TabsTrigger value="flagged" className="data-[state=active]:bg-red-500 data-[state=active]:text-white">
                  <span className="mr-1">🚩</span>
                  Flagged
                </TabsTrigger>
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
