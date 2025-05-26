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
  XCircle,
  Heart,
  Star,
  FileText,
  Smartphone,
  Monitor
} from "lucide-react";
import { format } from "date-fns";
import type { Patient, CommunicationWithPatient, FollowUpWithPatient } from "@shared/schema";

// Form schemas
const messageSchema = z.object({
  patientId: z.number(),
  type: z.enum(["email", "sms", "portal"]),
  subject: z.string().min(1, "Subject is required"),
  message: z.string().min(1, "Message is required"),
  sentBy: z.string().min(1, "Sender name is required"),
});

const followUpSchema = z.object({
  patientId: z.number(),
  type: z.enum(["appointment", "call", "check_in"]),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  scheduledFor: z.date(),
  notes: z.string().optional(),
});

// Message templates
const messageTemplates = {
  thankYou: {
    subject: "Thank you for using FootCare Clinic's Health Assessment",
    message: `Dear [Patient Name],

Thank you for using Fiona, our AI health assistant, to complete your foot health assessment today. We appreciate you taking the time to provide detailed information about your concerns.

Your assessment has been reviewed by our clinical team, and we're here to support your foot health journey. Based on your responses, we may be in touch with personalized recommendations or to schedule a follow-up consultation.

If you have any immediate concerns or questions, please don't hesitate to contact us at:
📞 Phone: [Clinic Phone]
📧 Email: [Clinic Email]

Take care of your feet, and thank you for choosing FootCare Clinic!

Best regards,
The FootCare Clinic Team`
  },
  
  treatmentPlans: {
    "heel pain": {
      subject: "Your Personalized Heel Pain Treatment Plan",
      message: `Dear [Patient Name],

Based on your recent assessment regarding heel pain, here's your personalized treatment plan:

🦶 **Immediate Relief Tips:**
• Rest and avoid high-impact activities
• Apply ice for 15-20 minutes, 3-4 times daily
• Gentle calf and plantar fascia stretches
• Wear supportive footwear with good arch support

📋 **Recommended Actions:**
• Consider over-the-counter anti-inflammatory medication
• Use heel pads or orthotic inserts
• Avoid walking barefoot on hard surfaces
• Gradually return to activities as pain improves

⚠️ **When to Contact Us:**
• If pain persists beyond 2 weeks
• If you experience severe swelling
• If pain interferes with daily activities

Contact us at [Clinic Phone] to schedule a consultation.

Best regards,
FootCare Clinic Team`
    },
    "numbness": {
      subject: "Managing Foot Numbness - Your Care Plan",
      message: `Dear [Patient Name],

Thank you for reporting numbness in your feet. This symptom requires careful attention and monitoring.

🔍 **Understanding Numbness:**
• Can indicate circulation or nerve issues
• May be related to diabetes, peripheral neuropathy, or other conditions
• Early intervention is important for optimal outcomes

📋 **Immediate Steps:**
• Monitor symptoms daily and note any changes
• Ensure proper foot hygiene and daily inspection
• Wear well-fitting, protective footwear
• Avoid extreme temperatures

⚠️ **Important - Please Schedule an Appointment:**
Numbness can be serious and requires professional evaluation. Please contact us at [Clinic Phone] to schedule an assessment within the next few days.

We're here to help ensure your foot health and safety.

Best regards,
FootCare Clinic Team`
    },
    "ingrown toenail": {
      subject: "Ingrown Toenail Care Instructions",
      message: `Dear [Patient Name],

Here's your care plan for managing an ingrown toenail:

🦶 **Immediate Care:**
• Soak feet in warm, soapy water for 15-20 minutes daily
• Keep the area clean and dry
• Apply antibiotic ointment if recommended
• Wear loose-fitting shoes and avoid tight socks

❌ **Avoid:**
• Cutting the nail yourself
• Digging at the ingrown edge
• Wearing tight, pointed shoes
• Going barefoot in public areas

📞 **Schedule Treatment:**
Ingrown toenails often require professional treatment. Please call us at [Clinic Phone] to schedule an appointment for safe, effective treatment.

Our specialists can provide relief and prevent complications.

Best regards,
FootCare Clinic Team`
    },
    "general": {
      subject: "FootCare Clinic - Follow-up on Your Health Assessment",
      message: `Dear [Patient Name],

Thank you for completing your foot health assessment with Fiona, our AI assistant.

🏥 **Next Steps:**
Based on your responses, we recommend scheduling a consultation with one of our foot health specialists to discuss your concerns in detail and develop a personalized treatment plan.

📅 **Scheduling:**
Please contact us at [Clinic Phone] or email [Clinic Email] to book your appointment at your preferred location:
• Donnycarney Clinic
• Palmerstown Clinic  
• Baldoyle Clinic

💡 **In the Meantime:**
• Maintain good foot hygiene
• Wear comfortable, supportive footwear
• Monitor any changes in symptoms
• Contact us immediately if you experience severe pain or swelling

We look forward to helping you achieve optimal foot health.

Best regards,
FootCare Clinic Team`
    }
  },
  
  satisfaction: {
    subject: "How was your experience with Fiona?",
    message: `Dear [Patient Name],

We hope Fiona, our AI health assistant, was helpful in addressing your foot health concerns.

⭐ **Quick Feedback Request:**
Your experience matters to us! Please take a moment to share:

1. How easy was it to use Fiona?
2. Did you feel your concerns were understood?
3. Was the information provided helpful?
4. Would you recommend Fiona to others?

You can reply to this email with your feedback or call us at [Clinic Phone].

🎯 **Continuous Improvement:**
Your feedback helps us enhance Fiona and provide better care for all our patients.

Thank you for choosing FootCare Clinic!

Best regards,
The FootCare Clinic Team`
  }
};

function CommunicationsImproved() {
  const [isNewMessageOpen, setIsNewMessageOpen] = useState(false);
  const [isNewFollowUpOpen, setIsNewFollowUpOpen] = useState(false);
  const [patientSearchTerm, setPatientSearchTerm] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Data fetching
  const { data: patients, isLoading: isLoadingPatients } = useQuery({
    queryKey: ['/api/patients'],
  });

  const { data: communications, isLoading: isLoadingCommunications } = useQuery({
    queryKey: ['/api/communications'],
  });

  const { data: followUps, isLoading: isLoadingFollowUps } = useQuery({
    queryKey: ['/api/followups'],
  });

  // Filter patients based on search term
  const filteredPatients = patients?.filter((patient: Patient) =>
    patient.name.toLowerCase().includes(patientSearchTerm.toLowerCase()) ||
    (patient.email && patient.email.toLowerCase().includes(patientSearchTerm.toLowerCase())) ||
    (patient.phone && patient.phone.includes(patientSearchTerm))
  );

  // Forms
  const messageForm = useForm<z.infer<typeof messageSchema>>({
    resolver: zodResolver(messageSchema),
    defaultValues: {
      sentBy: "FootCare Clinic",
      type: "email",
    },
  });

  const followUpForm = useForm<z.infer<typeof followUpSchema>>({
    resolver: zodResolver(followUpSchema),
    defaultValues: {
      type: "appointment",
    },
  });

  // Mutations
  const sendMessageMutation = useMutation({
    mutationFn: async (data: z.infer<typeof messageSchema>) => {
      const response = await fetch('/api/communications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to send message');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Message Sent",
        description: "Your message has been sent successfully.",
      });
      messageForm.reset();
      setIsNewMessageOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/communications'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    },
  });

  const createFollowUpMutation = useMutation({
    mutationFn: async (data: z.infer<typeof followUpSchema>) => {
      const response = await fetch('/api/followups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create follow-up');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Follow-up Scheduled",
        description: "Follow-up has been scheduled successfully.",
      });
      followUpForm.reset();
      setIsNewFollowUpOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/followups'] });
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

  // Template selection handler with auto-population
  const handleTemplateSelect = (templateType: string, templateData: any) => {
    const selectedPatientId = messageForm.getValues('patientId');
    const selectedPatient = patients?.find((p: Patient) => p.id === selectedPatientId);
    
    // Set subject and message
    messageForm.setValue('subject', templateData.subject);
    
    let personalizedMessage = templateData.message;
    if (selectedPatient) {
      // Replace placeholders with actual patient data
      personalizedMessage = personalizedMessage.replace(/\[Patient Name\]/g, selectedPatient.name);
      personalizedMessage = personalizedMessage.replace(/\[Clinic Phone\]/g, '+353 1 234 5678');
      personalizedMessage = personalizedMessage.replace(/\[Clinic Email\]/g, 'info@footcareclinic.ie');
      
      // Auto-select communication type based on available contact info and template type
      if (templateType === 'satisfaction') {
        messageForm.setValue('type', 'email');
      } else if (selectedPatient.phone && templateType !== 'satisfaction') {
        messageForm.setValue('type', 'sms');
      } else if (selectedPatient.email) {
        messageForm.setValue('type', 'email');
      } else {
        messageForm.setValue('type', 'portal');
      }
    }
    
    messageForm.setValue('message', personalizedMessage);
    setSelectedTemplate(templateType);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "sent": return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "delivered": return <CheckCircle className="h-4 w-4 text-blue-500" />;
      case "failed": return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "email": return <Mail className="h-4 w-4" />;
      case "sms": return <Smartphone className="h-4 w-4" />;
      case "portal": return <Monitor className="h-4 w-4" />;
      default: return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "email": return "Email";
      case "sms": return "SMS";
      case "portal": return "Portal Message";
      default: return "Message";
    }
  };

  return (
    <>
      <Helmet>
        <title>Patient Communications - FootCare Clinic</title>
      </Helmet>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Patient Communications</h1>
          <div className="flex gap-2">
            <Dialog open={isNewMessageOpen} onOpenChange={setIsNewMessageOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Send Message
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Send Message to Patient</DialogTitle>
                </DialogHeader>
                <Form {...messageForm}>
                  <form onSubmit={messageForm.handleSubmit(handleSendMessage)} className="space-y-4">
                    {/* Patient Search and Selection */}
                    <FormField
                      control={messageForm.control}
                      name="patientId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Patient</FormLabel>
                          <div className="space-y-2">
                            <div className="relative">
                              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                              <Input
                                placeholder="Search patients by name, email, or phone..."
                                value={patientSearchTerm}
                                onChange={(e) => setPatientSearchTerm(e.target.value)}
                                className="pl-10"
                              />
                            </div>
                            <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a patient" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {filteredPatients?.map((patient: Patient) => (
                                  <SelectItem key={patient.id} value={patient.id.toString()}>
                                    <div className="flex items-center space-x-2">
                                      <span>{patient.name}</span>
                                      <span className="text-gray-500">-</span>
                                      <span className="text-sm text-gray-500">
                                        {patient.email || patient.phone || 'No contact info'}
                                      </span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Communication Type with better descriptions */}
                    <FormField
                      control={messageForm.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Communication Type</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select communication type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="email">
                                <div className="flex items-center space-x-2">
                                  <Mail className="h-4 w-4" />
                                  <span>Email - Send to patient's email address</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="sms">
                                <div className="flex items-center space-x-2">
                                  <Smartphone className="h-4 w-4" />
                                  <span>SMS - Send text message to phone</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="portal">
                                <div className="flex items-center space-x-2">
                                  <Monitor className="h-4 w-4" />
                                  <span>Portal Message - Internal notification</span>
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Template Selection */}
                    <div className="space-y-2">
                      <FormLabel>Quick Templates</FormLabel>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleTemplateSelect('thankYou', messageTemplates.thankYou)}
                        >
                          <Heart className="mr-1 h-3 w-3" />
                          Thank You
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleTemplateSelect('satisfaction', messageTemplates.satisfaction)}
                        >
                          <Star className="mr-1 h-3 w-3" />
                          Satisfaction Survey
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleTemplateSelect('heel-pain', messageTemplates.treatmentPlans["heel pain"])}
                        >
                          <FileText className="mr-1 h-3 w-3" />
                          Heel Pain Plan
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleTemplateSelect('numbness', messageTemplates.treatmentPlans.numbness)}
                        >
                          <FileText className="mr-1 h-3 w-3" />
                          Numbness Care
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleTemplateSelect('ingrown', messageTemplates.treatmentPlans["ingrown toenail"])}
                        >
                          <FileText className="mr-1 h-3 w-3" />
                          Ingrown Toenail
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleTemplateSelect('general', messageTemplates.treatmentPlans.general)}
                        >
                          <FileText className="mr-1 h-3 w-3" />
                          General Follow-up
                        </Button>
                      </div>
                    </div>

                    <FormField
                      control={messageForm.control}
                      name="subject"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Subject</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter subject" {...field} />
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
                              className="min-h-32" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={messageForm.control}
                      name="sentBy"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Sent By</FormLabel>
                          <FormControl>
                            <Input placeholder="Your name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-end space-x-2">
                      <Button type="button" variant="outline" onClick={() => setIsNewMessageOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={sendMessageMutation.isPending}>
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
                  <Calendar className="mr-2 h-4 w-4" />
                  Schedule Follow-up
                </Button>
              </DialogTrigger>
              <DialogContent>
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
                          <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
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
                          <FormLabel>Follow-up Type</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select follow-up type" />
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
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Follow-up description..." {...field} />
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
                          <FormLabel>Scheduled For</FormLabel>
                          <FormControl>
                            <Input 
                              type="datetime-local" 
                              {...field} 
                              value={field.value ? format(field.value, "yyyy-MM-dd'T'HH:mm") : ""}
                              onChange={(e) => field.onChange(new Date(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={followUpForm.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notes</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Additional notes..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-end space-x-2">
                      <Button type="button" variant="outline" onClick={() => setIsNewFollowUpOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={createFollowUpMutation.isPending}>
                        {createFollowUpMutation.isPending ? "Scheduling..." : "Schedule Follow-up"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Tabs defaultValue="messages" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="messages">Messages</TabsTrigger>
            <TabsTrigger value="followups">Follow-ups</TabsTrigger>
          </TabsList>

          <TabsContent value="messages" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MessageSquare className="mr-2 h-5 w-5" />
                  Recent Communications
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingCommunications ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : communications?.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <MessageSquare className="mx-auto h-12 w-12 mb-4 text-gray-300" />
                    <p>No communications sent yet</p>
                    <p className="text-sm">Start communicating with your patients using the button above</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {communications.map((comm: CommunicationWithPatient) => (
                      <div key={comm.id} className="flex items-start space-x-3 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                        <div className="flex-shrink-0 flex items-center space-x-2">
                          {getTypeIcon(comm.type)}
                          {getStatusIcon(comm.status)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {comm.patient?.name || 'Unknown Patient'}
                            </p>
                            <div className="flex items-center space-x-2">
                              <Badge variant="outline">{getTypeLabel(comm.type)}</Badge>
                              <span className="text-xs text-gray-500">
                                {comm.createdAt ? format(new Date(comm.createdAt), 'MMM d, yyyy HH:mm') : 'No date'}
                              </span>
                            </div>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">
                            {comm.subject}
                          </p>
                          <p className="text-sm text-gray-500 truncate">
                            {comm.message}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            Sent by: {comm.sentBy}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="followups" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calendar className="mr-2 h-5 w-5" />
                  Scheduled Follow-ups
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingFollowUps ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : followUps?.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Calendar className="mx-auto h-12 w-12 mb-4 text-gray-300" />
                    <p>No follow-ups scheduled</p>
                    <p className="text-sm">Schedule follow-ups to stay connected with your patients</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {followUps.map((followUp: FollowUpWithPatient) => (
                      <div key={followUp.id} className="flex items-start space-x-3 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                        <Calendar className="flex-shrink-0 h-5 w-5 text-blue-500 mt-1" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {followUp.patient?.name || 'Unknown Patient'}
                            </p>
                            <div className="flex items-center space-x-2">
                              <Badge variant={followUp.status === 'scheduled' ? 'default' : 'secondary'}>
                                {followUp.status || 'Unknown'}
                              </Badge>
                              <span className="text-xs text-gray-500">
                                {followUp.scheduledFor ? format(new Date(followUp.scheduledFor), 'MMM d, yyyy HH:mm') : 'No date'}
                              </span>
                            </div>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">
                            {followUp.title}
                          </p>
                          {followUp.description && (
                            <p className="text-sm text-gray-500">
                              {followUp.description}
                            </p>
                          )}
                          <div className="flex items-center space-x-4 mt-2">
                            <Badge variant="outline" className="text-xs">
                              {followUp.type}
                            </Badge>
                            {followUp.notes && (
                              <p className="text-xs text-gray-400">
                                Notes: {followUp.notes}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}

export default CommunicationsImproved;