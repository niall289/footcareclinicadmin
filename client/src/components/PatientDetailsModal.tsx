import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import type { AssessmentWithPatient, ResponseWithQuestion } from "@shared/schema";
import { cn } from "@/lib/utils";

interface PatientDetailsModalProps {
  assessment: AssessmentWithPatient;
  onClose: () => void;
}

export default function PatientDetailsModal({
  assessment,
  onClose,
}: PatientDetailsModalProps) {
  const [isOpen, setIsOpen] = useState(true);

  // Close the modal
  const handleClose = () => {
    setIsOpen(false);
    setTimeout(onClose, 300); // Wait for animation to complete
  };

  // Fetch assessment responses
  const { data, isLoading } = useQuery({
    queryKey: [`/api/assessments/${assessment.id}`],
    enabled: isOpen,
  });

  const formatDate = (dateString?: Date | string | null) => {
    if (!dateString) return "N/A";
    const date = typeof dateString === "string" ? new Date(dateString) : dateString;
    return date.toLocaleDateString() + " at " + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getRiskLevelClass = (riskLevel?: string | null) => {
    if (!riskLevel) return "";
    return `risk-${riskLevel.toLowerCase()}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Patient Assessment Details</DialogTitle>
        </DialogHeader>

        {/* Patient profile section */}
        <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-6 mb-6 pb-6 border-b border-neutral-200 dark:border-neutral-700">
          <div className="flex-shrink-0 h-20 w-20 rounded-full bg-neutral-200 dark:bg-neutral-700 mx-auto sm:mx-0 flex items-center justify-center">
            <i className="ri-user-3-line text-3xl text-neutral-500 dark:text-neutral-300" />
          </div>
          <div className="sm:flex-1 text-center sm:text-left">
            <h4 className="text-xl font-medium text-neutral-900 dark:text-white">
              {assessment.patient.name}
            </h4>
            <p className="text-neutral-500 dark:text-neutral-400">
              {assessment.patient.email} {assessment.patient.phone && `• ${assessment.patient.phone}`}
            </p>
            <p className="text-neutral-500 dark:text-neutral-400">
              Assessment {assessment.completedAt ? "completed" : "started"} on{" "}
              {formatDate(assessment.completedAt || assessment.createdAt)}
            </p>
          </div>
          <div>
            <span
              className={cn(
                "px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full",
                getRiskLevelClass(assessment.riskLevel)
              )}
            >
              {assessment.riskLevel
                ? `${assessment.riskLevel.charAt(0).toUpperCase() + assessment.riskLevel.slice(1)} Risk`
                : "Risk Not Assessed"}
            </span>
          </div>
        </div>

        {/* Assessment summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-lg">
            <h5 className="font-medium text-neutral-700 dark:text-neutral-300 mb-2">Primary Concern</h5>
            <p className="text-neutral-900 dark:text-white">
              {assessment.primaryConcern || "Not specified"}
            </p>
          </div>
          <div className="bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-lg">
            <h5 className="font-medium text-neutral-700 dark:text-neutral-300 mb-2">Status</h5>
            <p className="text-neutral-900 dark:text-white">
              {assessment.status === "in_progress"
                ? "In Progress"
                : assessment.status === "in_review"
                ? "In Review"
                : assessment.status?.charAt(0).toUpperCase() + assessment.status?.slice(1) || "Unknown"}
            </p>
          </div>
          <div className="bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-lg">
            <h5 className="font-medium text-neutral-700 dark:text-neutral-300 mb-2">Assessment ID</h5>
            <p className="text-neutral-900 dark:text-white">#{assessment.id}</p>
          </div>
        </div>

        {/* Detailed responses */}
        <h4 className="text-lg font-medium text-neutral-800 dark:text-white mb-4">Assessment Responses</h4>
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="border-b border-neutral-200 dark:border-neutral-700 pb-4">
                <Skeleton className="h-5 w-64 mb-1" />
                <Skeleton className="h-4 w-full" />
              </div>
            ))
          ) : data?.responses?.length > 0 ? (
            data.responses.map((response: ResponseWithQuestion) => (
              <div key={response.id} className="border-b border-neutral-200 dark:border-neutral-700 pb-4">
                <h5 className="font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  {response.question.text}
                </h5>
                <p className="text-neutral-900 dark:text-white">{response.answer || "No answer provided"}</p>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-neutral-500 dark:text-neutral-400">
              No responses have been recorded for this assessment.
            </div>
          )}
        </div>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={handleClose}>
            Close
          </Button>
          <Button>Schedule Appointment</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
