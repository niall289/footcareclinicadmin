import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Helmet } from "react-helmet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Send, 
  MessageSquare, 
  Calendar, 
  Phone, 
  Mail, 
  Clock, 
  User, 
  Search,
  Plus,
  CheckCircle,
  AlertCircle,
  XCircle
} from "lucide-react";
import { format } from "date-fns";
import type { Patient, CommunicationWithPatient, FollowUpWithPatient } from "@shared/schema";

// Form schemas
const messageSchema = z.object({
  patientId: z.number(),
  type: z.enum(["email", "sms", "message"]),
  subject: z.string().min(1, "Subject is required"),
  message: z.string().min(1, "Message is required"),
  sentBy: z.string().min(1, "Sender name is required"),
});

const followUpSchema = z.object({
  patientId: z.number(),
  type: z.enum(["appointment", "call", "check_in"]),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  scheduledFor: z.string().min(1, "Date/time is required"),
  assignedTo: z.string().optional(),
  createdBy: z.string().min(1, "Creator name is required"),
});

export default function Communications() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("messages");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [isNewMessageOpen, setIsNewMessageOpen] = useState(false);
  const [isNewFollowUpOpen, setIsNewFollowUpOpen] = useState(false);

  // Fetch patients for selection
  const { data: patients, isLoading: isLoadingPatients } = useQuery({
    queryKey: ["/api/patients"],
  });

  // Fetch communications
  const { data: communications, isLoading: isLoadingCommunications } = useQuery({
    queryKey: ["/api/communications"],
  });

  // Fetch follow-ups
  const { data: followUps, isLoading: isLoadingFollowUps } = useQuery({
    queryKey: ["/api/followups"],
  });

  // Message form
  const messageForm = useForm<z.infer<typeof messageSchema>>({
    resolver: zodResolver(messageSchema),
    defaultValues: {
      type: "email",
      sentBy: "Admin",
    },
  });

  // Follow-up form
  const followUpForm = useForm<z.infer<typeof followUpSchema>>({
    resolver: zodResolver(followUpSchema),
    defaultValues: {
      type: "appointment",
      createdBy: "Admin",
    },
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (data: z.infer<typeof messageSchema>) => {
      const response = await fetch("/api/communications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to send message");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/communications"] });
      toast({
        title: "Message Sent",
        description: "Your message has been sent to the patient successfully.",
      });
      setIsNewMessageOpen(false);
      messageForm.reset();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Create follow-up mutation
  const createFollowUpMutation = useMutation({
    mutationFn: async (data: z.infer<typeof followUpSchema>) => {
      const response = await fetch("/api/followups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          scheduledFor: new Date(data.scheduledFor).toISOString(),
        }),
      });
      if (!response.ok) throw new Error("Failed to create follow-up");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/followups"] });
      toast({
        title: "Follow-up Scheduled",
        description: "Follow-up has been scheduled successfully.",
      });
      setIsNewFollowUpOpen(false);
      followUpForm.reset();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to schedule follow-up. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSendMessage = (data: z.infer<typeof messageSchema>) => {
    sendMessageMutation.mutate(data);
  };

  const handleCreateFollowUp = (data: z.infer<typeof followUpSchema>) => {
    createFollowUpMutation.mutate(data);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "sent":
      case "delivered":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "read":
        return <CheckCircle className="h-4 w-4 text-blue-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "email":
        return <Mail className="h-4 w-4" />;
      case "sms":
        return <MessageSquare className="h-4 w-4" />;
      case "call":
        return <Phone className="h-4 w-4" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  const filteredPatients = patients?.filter((patient: Patient) =>
    patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <Helmet>
        <title>Communications | FootCare Clinic</title>
        <meta name="description" content="Patient communication tools and follow-up management for FootCare Clinic." />
      </Helmet>
      
      <div className="py-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {/* Page header */}
        <div className="md:flex md:items-center md:justify-between mb-6">
          <div className="min-w-0 flex-1">
            <h2 className="text-2xl font-bold leading-7 text-neutral-800 dark:text-white sm:truncate sm:text-3xl sm:tracking-tight">
              Patient Communications
            </h2>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
              Send messages, schedule follow-ups, and track patient interactions
            </p>
          </div>
          <div className="mt-4 flex md:ml-4 md:mt-0 space-x-2">
            <Dialog open={isNewMessageOpen} onOpenChange={setIsNewMessageOpen}>
              <DialogTrigger asChild>
                <Button className="bg-[hsl(186,100%,30%)] hover:bg-[hsl(186,100%,25%)]">
                  <Send className="h-4 w-4 mr-2" />
                  New Message
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Send Message to Patient</DialogTitle>
                </DialogHeader>
                <Form {...messageForm}>
                  <form onSubmit={messageForm.handleSubmit(handleSendMessage)} className="space-y-4">
                    <FormField
                      control={messageForm.control}
                      name="patientId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Patient</FormLabel>
                          <Select onValueChange={(value) => field.onChange(parseInt(value))}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a patient" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {patients?.map((patient: Patient) => (
                                <SelectItem key={patient.id} value={patient.id.toString()}>
                                  {patient.name} - {patient.email}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={messageForm.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="email">Email</SelectItem>
                              <SelectItem value="sms">SMS</SelectItem>
                              <SelectItem value="message">Message</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={messageForm.control}
                      name="subject"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Subject</FormLabel>
                          <FormControl>
                            <Input placeholder="Message subject" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={messageForm.control}
                      name="message"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Message</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Enter your message here..." 
                              rows={4}
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex justify-end space-x-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setIsNewMessageOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={sendMessageMutation.isPending}
                        className="bg-[hsl(186,100%,30%)] hover:bg-[hsl(186,100%,25%)]"
                      >
                        {sendMessageMutation.isPending ? "Sending..." : "Send Message"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>

            <Dialog open={isNewFollowUpOpen} onOpenChange={setIsNewFollowUpOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Calendar className="h-4 w-4 mr-2" />
                  Schedule Follow-up
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Schedule Follow-up</DialogTitle>
                </DialogHeader>
                <Form {...followUpForm}>
                  <form onSubmit={followUpForm.handleSubmit(handleCreateFollowUp)} className="space-y-4">
                    <FormField
                      control={followUpForm.control}
                      name="patientId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Patient</FormLabel>
                          <Select onValueChange={(value) => field.onChange(parseInt(value))}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a patient" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {patients?.map((patient: Patient) => (
                                <SelectItem key={patient.id} value={patient.id.toString()}>
                                  {patient.name} - {patient.email}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={followUpForm.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="appointment">Appointment</SelectItem>
                              <SelectItem value="call">Phone Call</SelectItem>
                              <SelectItem value="check_in">Check-in</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={followUpForm.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Title</FormLabel>
                          <FormControl>
                            <Input placeholder="Follow-up title" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={followUpForm.control}
                      name="scheduledFor"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Scheduled Date & Time</FormLabel>
                          <FormControl>
                            <Input 
                              type="datetime-local" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={followUpForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description (Optional)</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Additional details..." 
                              rows={3}
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex justify-end space-x-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setIsNewFollowUpOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={createFollowUpMutation.isPending}
                        className="bg-[hsl(186,100%,30%)] hover:bg-[hsl(186,100%,25%)]"
                      >
                        {createFollowUpMutation.isPending ? "Scheduling..." : "Schedule"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-400" />
            <Input
              placeholder="Search patients by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Main content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Patient List */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-lg">Patients</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-96 overflow-y-auto">
                {isLoadingPatients ? (
                  <div className="p-4 space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-1">
                    {filteredPatients?.map((patient: Patient) => (
                      <div
                        key={patient.id}
                        className={`p-3 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800 border-l-4 ${
                          selectedPatient?.id === patient.id
                            ? "border-[hsl(186,100%,30%)] bg-[hsl(186,76%,99%)] dark:bg-neutral-700"
                            : "border-transparent"
                        }`}
                        onClick={() => setSelectedPatient(patient)}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="flex-shrink-0">
                            <User className="h-8 w-8 text-neutral-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">
                              {patient.name}
                            </p>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                              {patient.email}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Communications Panel */}
          <div className="lg:col-span-3">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-2 mb-4">
                <TabsTrigger value="messages">📧 Messages</TabsTrigger>
                <TabsTrigger value="followups">📅 Follow-ups</TabsTrigger>
              </TabsList>

              <TabsContent value="messages">
                <Card>
                  <CardHeader>
                    <CardTitle>Communication History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isLoadingCommunications ? (
                      <div className="space-y-4">
                        {[...Array(3)].map((_, i) => (
                          <Skeleton key={i} className="h-20 w-full" />
                        ))}
                      </div>
                    ) : communications?.length > 0 ? (
                      <div className="space-y-4">
                        {communications.map((comm: CommunicationWithPatient) => (
                          <div key={comm.id} className="border rounded-lg p-4">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center space-x-2">
                                {getTypeIcon(comm.type)}
                                <span className="font-medium">{comm.subject}</span>
                                <Badge variant="outline" className="text-xs">
                                  {comm.type.toUpperCase()}
                                </Badge>
                              </div>
                              <div className="flex items-center space-x-2">
                                {getStatusIcon(comm.status)}
                                <span className="text-xs text-neutral-500">
                                  {format(new Date(comm.createdAt), "MMM d, HH:mm")}
                                </span>
                              </div>
                            </div>
                            <p className="text-sm text-neutral-600 dark:text-neutral-300 mb-2">
                              To: {comm.patient?.name} ({comm.patient?.email})
                            </p>
                            <p className="text-sm text-neutral-700 dark:text-neutral-300">
                              {comm.message}
                            </p>
                            <p className="text-xs text-neutral-500 mt-2">
                              Sent by: {comm.sentBy}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <MessageSquare className="h-12 w-12 text-neutral-400 mx-auto mb-4" />
                        <p className="text-neutral-500">No messages yet</p>
                        <p className="text-sm text-neutral-400">Start communicating with your patients</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="followups">
                <Card>
                  <CardHeader>
                    <CardTitle>Scheduled Follow-ups</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isLoadingFollowUps ? (
                      <div className="space-y-4">
                        {[...Array(3)].map((_, i) => (
                          <Skeleton key={i} className="h-20 w-full" />
                        ))}
                      </div>
                    ) : followUps?.length > 0 ? (
                      <div className="space-y-4">
                        {followUps.map((followUp: FollowUpWithPatient) => (
                          <div key={followUp.id} className="border rounded-lg p-4">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center space-x-2">
                                <Calendar className="h-4 w-4" />
                                <span className="font-medium">{followUp.title}</span>
                                <Badge 
                                  variant={followUp.status === "completed" ? "default" : "outline"}
                                  className="text-xs"
                                >
                                  {followUp.status.replace("_", " ").toUpperCase()}
                                </Badge>
                              </div>
                              <span className="text-xs text-neutral-500">
                                {format(new Date(followUp.scheduledFor), "MMM d, yyyy HH:mm")}
                              </span>
                            </div>
                            <p className="text-sm text-neutral-600 dark:text-neutral-300 mb-2">
                              Patient: {followUp.patient?.name} ({followUp.patient?.email})
                            </p>
                            {followUp.description && (
                              <p className="text-sm text-neutral-700 dark:text-neutral-300 mb-2">
                                {followUp.description}
                              </p>
                            )}
                            <div className="flex justify-between text-xs text-neutral-500">
                              <span>Type: {followUp.type.replace("_", " ")}</span>
                              <span>Created by: {followUp.createdBy}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Calendar className="h-12 w-12 text-neutral-400 mx-auto mb-4" />
                        <p className="text-neutral-500">No follow-ups scheduled</p>
                        <p className="text-sm text-neutral-400">Schedule appointments and check-ins</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </>
  );
}