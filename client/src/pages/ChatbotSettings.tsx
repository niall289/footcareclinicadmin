import React, { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from '@/hooks/use-toast'; // Assuming a toast hook exists

// Zod schema for form validation, mirroring shared/schema.ts ChatbotSettings
const chatbotSettingsSchema = z.object({
  welcomeMessage: z.string().min(10, "Welcome message must be at least 10 characters."),
  botDisplayName: z.string().min(3, "Bot display name must be at least 3 characters."),
  ctaButtonLabel: z.string().min(3, "CTA button label must be at least 3 characters."),
  chatbotTone: z.enum(['Friendly', 'Professional', 'Clinical', 'Casual']),
});

type ChatbotSettingsFormValues = z.infer<typeof chatbotSettingsSchema>;

// Interface for the settings data from API
interface ChatbotSettingsData extends ChatbotSettingsFormValues {
  // Add any other fields that might come from the API but are not in the form
}

const ChatbotSettingsPage: React.FC = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<ChatbotSettingsFormValues>({
    resolver: zodResolver(chatbotSettingsSchema),
    defaultValues: {
      welcomeMessage: '',
      botDisplayName: '',
      ctaButtonLabel: '',
      chatbotTone: 'Friendly',
    },
  });

  useEffect(() => {
    const fetchSettings = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/chatbot-settings');
        if (!response.ok) {
          throw new Error('Failed to fetch settings');
        }
        const data: ChatbotSettingsData = await response.json();
        form.reset(data); // Populate form with fetched data
      } catch (error) {
        console.error("Error fetching chatbot settings:", error);
        toast({
          title: "Error",
          description: "Could not load chatbot settings. Please try again later.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, [form, toast]);

  const onSubmit = async (data: ChatbotSettingsFormValues) => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/chatbot-settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save settings');
      }

      const updatedSettings = await response.json();
      form.reset(updatedSettings); // Reset form with potentially updated values from server
      toast({
        title: "Success!",
        description: "Chatbot settings saved successfully.",
      });
    } catch (error) {
      console.error("Error saving chatbot settings:", error);
      toast({
        title: "Error",
        description: (error as Error).message || "Could not save settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <p>Loading chatbot settings...</p>
      </div>
    );
  }

  return (
    <Card className="m-4">
      <CardHeader>
        <CardTitle>Chatbot Settings</CardTitle>
        <CardDescription>Manage the appearance and behavior of your chatbot.</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="welcomeMessage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Welcome Message</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter the chatbot's welcome message" {...field} />
                  </FormControl>
                  <FormDescription>
                    This is the first message users see when they open the chatbot.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="botDisplayName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bot Display Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter the bot's display name" {...field} />
                  </FormControl>
                  <FormDescription>
                    The name shown for the chatbot in the chat interface.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="ctaButtonLabel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Call-to-Action Button Label</FormLabel>
                  <FormControl>
                    <Input placeholder="E.g., Ask Fiona, Start Chat" {...field} />
                  </FormControl>
                  <FormDescription>
                    The text on the button that opens the chatbot.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="chatbotTone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Chatbot Tone of Voice</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a tone" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Friendly">Friendly</SelectItem>
                      <SelectItem value="Professional">Professional</SelectItem>
                      <SelectItem value="Clinical">Clinical</SelectItem>
                      <SelectItem value="Casual">Casual</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Choose the overall tone for the chatbot's responses.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isSaving || isLoading}>
              {isSaving ? 'Saving...' : 'Save Settings'}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
};

export default ChatbotSettingsPage;