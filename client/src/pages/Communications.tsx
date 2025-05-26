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
  FileText
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
• Wear supportive shoes with good arch support
• Avoid walking barefoot on hard surfaces

🏃‍♀️ **Exercises to Try:**
• Calf stretches (hold for 30 seconds, repeat 3 times)
• Plantar fascia stretches using a towel
• Toe curls and picks
• Rolling a tennis ball under your foot

⚠️ **When to Seek Further Care:**
• Pain persists beyond 2 weeks
• Severe morning pain that doesn't improve
• Swelling or visible deformity
• Difficulty walking or bearing weight

We recommend booking a consultation if symptoms don't improve within 1-2 weeks.

Stay healthy!
FootCare Clinic Team`
    },
    
    "numbness": {
      subject: "Managing Foot Numbness - Your Treatment Guide",
      message: `Dear [Patient Name],

Thank you for reporting numbness in your feet. Here's your personalized care plan:

🔍 **Understanding Numbness:**
Foot numbness can result from various causes including circulation issues, nerve compression, or diabetes-related changes.

💡 **Immediate Care Steps:**
• Check your feet daily for cuts, sores, or changes
• Wear properly fitted, comfortable shoes
• Avoid tight socks or stockings
• Keep feet clean and dry

🏃‍♀️ **Recommended Activities:**
• Gentle foot exercises and wiggling toes
• Short walks to improve circulation
• Elevate feet when sitting
• Avoid crossing legs for long periods

⚠️ **Important Warning Signs:**
• Worsening numbness or tingling
• Development of sores or wounds
• Changes in skin color
• Loss of balance or coordination

Please schedule an appointment soon for proper evaluation and treatment.

Best regards,
FootCare Clinic Team`
    },
    
    "ingrown toenail": {
      subject: "Ingrown Toenail Care Instructions",
      message: `Dear [Patient Name],

Here's your treatment plan for managing your ingrown toenail:

🛁 **Home Care Instructions:**
• Soak feet in warm, soapy water 3-4 times daily (15-20 minutes)
• Keep the area clean and dry
• Wear open-toed shoes or loose-fitting footwear
• Apply antibiotic ointment if recommended

✂️ **Nail Care Tips:**
• Cut toenails straight across, not curved
• Don't cut nails too short
• File sharp corners gently
• Avoid digging into corners

⚠️ **Seek Immediate Care If:**
• Increased redness, swelling, or warmth
• Pus or discharge from the area
• Red streaking from the toe
• Fever or feeling unwell
• Severe, worsening pain

Professional treatment may be needed for persistent or infected ingrown toenails.

Take care,
FootCare Clinic Team`
    },
    
    "general": {
      subject: "Your Foot Health Care Plan",
      message: `Dear [Patient Name],

Thank you for completing your foot health assessment. Here are some general foot care tips:

👟 **Daily Foot Care:**
• Wash and dry feet thoroughly daily
• Inspect feet for cuts, sores, or changes
• Moisturize feet (avoid between toes)
• Wear clean, dry socks daily

👞 **Proper Footwear:**
• Choose shoes with good support and cushioning
• Ensure proper fit - shop for shoes in the afternoon
• Replace worn-out shoes regularly
• Avoid high heels for extended periods

🏃‍♀️ **Stay Active:**
• Regular low-impact exercise promotes circulation
• Stretch your feet and calves daily
• Maintain a healthy weight

📞 **When to Contact Us:**
• Any new or worsening foot problems
• Persistent pain or discomfort
• Signs of infection (redness, swelling, warmth)
• Diabetic foot concerns

We're here to support your foot health journey!

FootCare Clinic Team`
    }
  },

  satisfaction: {
    subject: "How was your experience with FootCare Clinic?",
    message: `Dear [Patient Name],

We hope you found your recent interaction with Fiona, our AI health assistant, helpful and informative.

Your feedback is incredibly valuable to us as we work to improve our services. Would you mind taking 2 minutes to share your experience?

⭐ **Quick Satisfaction Survey:**

1. How would you rate your overall experience with our chatbot? (1-5 stars)
2. Did Fiona understand your foot health concerns clearly?
3. Were the questions relevant and easy to answer?
4. How likely are you to recommend our service to friends/family?
5. Any suggestions for improvement?

Simply reply to this message with your feedback, or click here to complete our online survey: [Survey Link]

Thank you for choosing FootCare Clinic. Your trust in our care means everything to us!

Warm regards,
The FootCare Clinic Team

P.S. If you have any ongoing concerns about your foot health, please don't hesitate to contact us or book an appointment.`
  }
};

export default function Communications() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("templates");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [isNewMessageOpen, setIsNewMessageOpen] = useState(false);
  const [isNewFollowUpOpen, setIsNewFollowUpOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

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
              <TabsList className="grid grid-cols-3 mb-4">
                <TabsTrigger value="templates">📋 Templates</TabsTrigger>
                <TabsTrigger value="messages">📧 Messages</TabsTrigger>
                <TabsTrigger value="followups">📅 Follow-ups</TabsTrigger>
              </TabsList>

              <TabsContent value="templates">
                <div className="space-y-6">
                  {/* Thank You Template */}
                  <Card>
                    <CardHeader className="pb-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Heart className="h-5 w-5 text-[hsl(186,100%,30%)]" />
                          <CardTitle className="text-lg">Thank You Message</CardTitle>
                        </div>
                        <Button 
                          size="sm" 
                          onClick={() => {
                            messageForm.setValue('subject', messageTemplates.thankYou.subject);
                            messageForm.setValue('message', messageTemplates.thankYou.message);
                            setIsNewMessageOpen(true);
                          }}
                          className="bg-[hsl(186,100%,30%)] hover:bg-[hsl(186,100%,25%)]"
                        >
                          Use Template
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-neutral-600 dark:text-neutral-300 mb-3">
                        Automated thank you message for patients who completed the chatbot assessment
                      </p>
                      <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-4 border">
                        <p className="font-medium text-sm mb-2">Subject: {messageTemplates.thankYou.subject}</p>
                        <div className="text-xs text-neutral-600 dark:text-neutral-400 whitespace-pre-line">
                          {messageTemplates.thankYou.message.substring(0, 200)}...
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Treatment Plans */}
                  <Card>
                    <CardHeader className="pb-4">
                      <div className="flex items-center space-x-3">
                        <FileText className="h-5 w-5 text-[hsl(186,100%,30%)]" />
                        <CardTitle className="text-lg">Treatment Plans</CardTitle>
                      </div>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">
                        Personalized treatment plans based on foot health conditions
                      </p>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {Object.entries(messageTemplates.treatmentPlans).map(([condition, template]) => (
                          <div key={condition} className="border rounded-lg p-4 bg-neutral-50 dark:bg-neutral-800">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="font-medium capitalize text-sm">{condition}</h4>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => {
                                  messageForm.setValue('subject', template.subject);
                                  messageForm.setValue('message', template.message);
                                  setIsNewMessageOpen(true);
                                }}
                              >
                                Use
                              </Button>
                            </div>
                            <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-2">
                              Subject: {template.subject}
                            </p>
                            <div className="text-xs text-neutral-500 dark:text-neutral-400">
                              {template.message.substring(0, 120)}...
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Patient Satisfaction Survey */}
                  <Card>
                    <CardHeader className="pb-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Star className="h-5 w-5 text-[hsl(186,100%,30%)]" />
                          <CardTitle className="text-lg">Patient Satisfaction Survey</CardTitle>
                        </div>
                        <Button 
                          size="sm" 
                          onClick={() => {
                            messageForm.setValue('subject', messageTemplates.satisfaction.subject);
                            messageForm.setValue('message', messageTemplates.satisfaction.message);
                            setIsNewMessageOpen(true);
                          }}
                          className="bg-[hsl(186,100%,30%)] hover:bg-[hsl(186,100%,25%)]"
                        >
                          Use Template
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-neutral-600 dark:text-neutral-300 mb-3">
                        Quick survey to gather feedback on the chatbot experience with Fiona
                      </p>
                      <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-4 border">
                        <p className="font-medium text-sm mb-2">Subject: {messageTemplates.satisfaction.subject}</p>
                        <div className="text-xs text-neutral-600 dark:text-neutral-400 whitespace-pre-line">
                          {messageTemplates.satisfaction.message.substring(0, 300)}...
                        </div>
                      </div>
                      <div className="mt-4 p-3 bg-[hsl(186,76%,99%)] dark:bg-neutral-700 rounded-lg border-l-4 border-[hsl(186,100%,30%)]">
                        <p className="text-xs text-neutral-600 dark:text-neutral-300">
                          💡 <strong>Survey Questions Include:</strong> Overall experience rating, understanding of concerns, question relevance, recommendation likelihood, and improvement suggestions.
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Usage Instructions */}
                  <Card className="border-[hsl(186,100%,30%)] bg-[hsl(186,76%,99%)] dark:bg-neutral-800">
                    <CardContent className="pt-6">
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 w-8 h-8 bg-[hsl(186,100%,30%)] rounded-full flex items-center justify-center">
                          <span className="text-white text-sm font-semibold">💡</span>
                        </div>
                        <div>
                          <h4 className="font-medium text-neutral-800 dark:text-white mb-2">How to Use Templates</h4>
                          <div className="text-sm text-neutral-600 dark:text-neutral-300 space-y-1">
                            <p>• Click "Use Template" to pre-fill the message form</p>
                            <p>• Select a patient from the list before sending</p>
                            <p>• Customize the message with patient-specific details</p>
                            <p>• Replace placeholders like [Patient Name] with actual information</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

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