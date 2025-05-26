import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, MapPin, Phone, Mail, Calendar, Clock, AlertCircle } from "lucide-react";

interface Consultation {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  preferredClinic: string | null;
  issueCategory: string | null;
  issueSpecifics: string | null;
  painDuration: string | null;
  painSeverity: string | null;
  additionalInfo: string | null;
  previousTreatment: string | null;
  hasImage: boolean | null;
  imagePath: string | null;
  imageAnalysis: string | null;
  symptomDescription: string | null;
  symptomAnalysis: string | null;
  conversationLog: string | null;
  createdAt: Date;
}

export default function Consultations() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClinic, setSelectedClinic] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");

  // Fetch consultations from your chatbot
  const { data: consultations = [], isLoading } = useQuery<Consultation[]>({
    queryKey: ["/api/consultations"],
  });

  // Filter consultations based on search and filters
  const filteredConsultations = consultations.filter((consultation) => {
    const matchesSearch = searchTerm === "" || 
      consultation.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      consultation.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      consultation.issueCategory?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesClinic = selectedClinic === "all" || 
      consultation.preferredClinic === selectedClinic;
    
    const matchesCategory = selectedCategory === "all" || 
      consultation.issueCategory === selectedCategory;

    return matchesSearch && matchesClinic && matchesCategory;
  });

  // Get unique values for filters
  const uniqueClinics = [...new Set(consultations.map(c => c.preferredClinic).filter(Boolean))];
  const uniqueCategories = [...new Set(consultations.map(c => c.issueCategory).filter(Boolean))];

  const getPriorityLevel = (painSeverity: string | null) => {
    if (!painSeverity) return "low";
    const severity = parseInt(painSeverity.split('/')[0] || "0");
    if (severity >= 8) return "high";
    if (severity >= 5) return "medium";
    return "low";
  };

  const getPriorityColor = (level: string) => {
    switch (level) {
      case "high": return "bg-red-100 text-red-800 border-red-200";
      case "medium": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      default: return "bg-green-100 text-green-800 border-green-200";
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Helmet>
          <title>Consultations - FootCare Clinic Admin</title>
        </Helmet>
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Patient Consultations</h1>
        </div>
        <div className="grid gap-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-4 w-1/4 mb-2" />
                <Skeleton className="h-4 w-1/2 mb-4" />
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Helmet>
        <title>Consultations - FootCare Clinic Admin</title>
      </Helmet>

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Patient Consultations</h1>
          <p className="text-muted-foreground">
            {filteredConsultations.length} consultations from your chatbot
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search consultations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={selectedClinic} onValueChange={setSelectedClinic}>
              <SelectTrigger>
                <SelectValue placeholder="All Clinics" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Clinics</SelectItem>
                {uniqueClinics.map(clinic => (
                  <SelectItem key={clinic} value={clinic!}>{clinic}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {uniqueCategories.map(category => (
                  <SelectItem key={category} value={category!}>{category}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button 
              variant="outline" 
              onClick={() => {
                setSearchTerm("");
                setSelectedClinic("all");
                setSelectedCategory("all");
              }}
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Consultations List */}
      <div className="grid gap-4">
        {filteredConsultations.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No consultations found</h3>
              <p className="text-muted-foreground">
                {searchTerm || selectedClinic !== "all" || selectedCategory !== "all" 
                  ? "Try adjusting your filters to see more results."
                  : "No consultations have been received from your chatbot yet."}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredConsultations.map((consultation) => {
            const priority = getPriorityLevel(consultation.painSeverity);
            return (
              <Card key={consultation.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{consultation.name}</CardTitle>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {format(new Date(consultation.createdAt), "MMM dd, yyyy")}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {format(new Date(consultation.createdAt), "HH:mm")}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {consultation.painSeverity && (
                        <Badge className={getPriorityColor(priority)}>
                          Pain: {consultation.painSeverity}
                        </Badge>
                      )}
                      {consultation.issueCategory && (
                        <Badge variant="secondary">
                          {consultation.issueCategory}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Contact Information */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    {consultation.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span>{consultation.email}</span>
                      </div>
                    )}
                    {consultation.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{consultation.phone}</span>
                      </div>
                    )}
                    {consultation.preferredClinic && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>{consultation.preferredClinic}</span>
                      </div>
                    )}
                  </div>

                  {/* Issue Details */}
                  {consultation.issueSpecifics && (
                    <div>
                      <h4 className="font-medium text-sm mb-1">Issue Description:</h4>
                      <p className="text-sm text-muted-foreground">{consultation.issueSpecifics}</p>
                    </div>
                  )}

                  {/* Additional Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    {consultation.painDuration && (
                      <div>
                        <span className="font-medium">Duration: </span>
                        <span className="text-muted-foreground">{consultation.painDuration}</span>
                      </div>
                    )}
                    {consultation.previousTreatment && (
                      <div>
                        <span className="font-medium">Previous Treatment: </span>
                        <span className="text-muted-foreground">{consultation.previousTreatment}</span>
                      </div>
                    )}
                  </div>

                  {/* Additional Info */}
                  {consultation.additionalInfo && (
                    <div>
                      <h4 className="font-medium text-sm mb-1">Additional Information:</h4>
                      <p className="text-sm text-muted-foreground">{consultation.additionalInfo}</p>
                    </div>
                  )}

                  {/* AI Analysis */}
                  {consultation.symptomAnalysis && (
                    <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg">
                      <h4 className="font-medium text-sm mb-1 text-blue-900 dark:text-blue-100">
                        AI Analysis:
                      </h4>
                      <p className="text-sm text-blue-800 dark:text-blue-200">
                        {consultation.symptomAnalysis}
                      </p>
                    </div>
                  )}

                  {/* Image Information */}
                  {consultation.hasImage && (
                    <div className="bg-green-50 dark:bg-green-950/20 p-3 rounded-lg">
                      <h4 className="font-medium text-sm mb-1 text-green-900 dark:text-green-100">
                        Image Submitted:
                      </h4>
                      {consultation.imageAnalysis && (
                        <p className="text-sm text-green-800 dark:text-green-200">
                          Analysis: {consultation.imageAnalysis}
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}