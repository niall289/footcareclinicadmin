import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import WebSocket, { WebSocketServer } from 'ws';
import { storage } from "./storage";
import { setupAuth, isAuthenticated, skipAuthForWebhook } from "./simpleAuth";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', (req: Request, res: Response) => {
    const session = req.session as any;
    if (session?.token) {
      res.json({ authenticated: true });
    } else {
      res.status(401).json({ message: 'Not authenticated' });
    }
  });

  // Chatbot Settings - Controlled by Engageio
  // Placeholder for server-side config from Engageio
  const ENABLE_CHATBOT_SETTINGS = process.env.VITE_ENABLE_CHATBOT_SETTINGS === 'true' || true; // Default to true for development

  if (ENABLE_CHATBOT_SETTINGS) {
    app.get('/api/chatbot-settings', isAuthenticated, async (req: Request, res: Response) => {
      try {
        // @ts-ignore - Assume storage.getChatbotSettings will be added
        const settings = await storage.getChatbotSettings();
        res.json(settings || {}); // Return empty object if no settings found
      } catch (error) {
        console.error('Error fetching chatbot settings:', error);
        res.status(500).json({ message: 'Failed to fetch chatbot settings' });
      }
    });

    app.patch('/api/chatbot-settings', isAuthenticated, async (req: Request, res: Response) => {
      try {
        const updates = req.body;

        // Basic validation for chatbotTone
        if (updates.chatbotTone && !['Friendly', 'Professional', 'Clinical', 'Casual'].includes(updates.chatbotTone)) {
          return res.status(400).json({ message: 'Invalid chatbot tone value.' });
        }

        // @ts-ignore - Assume storage.updateChatbotSettings will be added
        const updatedSettings = await storage.updateChatbotSettings(updates);
        res.json(updatedSettings);
      } catch (error) {
        console.error('Error updating chatbot settings:', error);
        res.status(500).json({ message: 'Failed to update chatbot settings' });
      }
    });
  }

  // Dashboard stats
  app.get('/api/dashboard/stats', async (req: Request, res: Response) => {
    try {
      const completedAssessments = await storage.getCompletedAssessmentsCount();
      const weeklyAssessments = await storage.getWeeklyAssessmentsCount();
      const flaggedResponses = await storage.getFlaggedResponsesCount();
      const totalPatients = await storage.getPatientsCount();
      
      res.json({
        completedAssessments,
        weeklyAssessments,
        flaggedResponses,
        totalPatients
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      res.status(500).json({ message: 'Failed to fetch stats' });
    }
  });

  // Consultations endpoint - matches your chatbot's URL (no auth required for webhooks)
  app.post('/api/webhook/consultation', skipAuthForWebhook, async (req: Request, res: Response) => {
    try {
      const consultationPayload = req.body; // Directly use the payload from the chatbot
console.log('Received consultation payload:', JSON.stringify(req.body, null, 2));
      console.log('✅ Received consultation from chatbot:', JSON.stringify(consultationPayload, null, 2));

      // The chatbot now sends a more detailed and structured payload.
      // We will use fields from this new structure directly.

      // Create consultation record using the new payload structure
      // Ensure your storage.createConsultation can handle this structure
      // or adapt the fields passed to it.
      const consultationDataForDb = {
        name: consultationPayload.name || 'Unknown Patient',
        email: consultationPayload.email || null,
        phone: consultationPayload.phone || null,
        preferred_clinic: consultationPayload.preferredClinic || null,
        issue_category: consultationPayload.issueCategory || 'General consultation',
        // Map other relevant fields from consultationPayload to your DB schema for consultations
        // For example:
        issue_specifics: consultationPayload.nailSpecifics || consultationPayload.painSpecifics || consultationPayload.skinSpecifics || consultationPayload.structuralSpecifics || null,
        symptom_description: consultationPayload.symptomDescription || null,
        previous_treatment: consultationPayload.previousTreatment || null,
        has_image: consultationPayload.hasImage || 'No', // 'yes' or 'no'
        image_path: consultationPayload.imagePath || null, // This will be base64 data
        image_analysis: consultationPayload.imageAnalysis || null,
        calendar_booking: consultationPayload.calendarBooking || null,
        booking_confirmation: consultationPayload.bookingConfirmation || null,
        final_question: consultationPayload.finalQuestion || null,
        additional_help: consultationPayload.additionalHelp || null,
        emoji_survey: consultationPayload.emojiSurvey || null,
        survey_response: consultationPayload.surveyResponse || null,
        created_at: consultationPayload.createdAt ? new Date(consultationPayload.createdAt) : new Date(),
        conversation_log: consultationPayload.conversationLog || [],
        completed_steps: consultationPayload.completedSteps || []
      };
      
      console.log('Data for DB (consultation):', consultationDataForDb);
      const consultationRecord = await storage.createConsultation(consultationDataForDb);

      console.log('Converting consultation to patient and assessment records...');
      
      // Convert consultation to patient record for the main portal
      const patientData = {
        name: consultationPayload.name || 'Unknown Patient',
        email: consultationPayload.email || null,
        phone: consultationPayload.phone || null,
      };
      
      console.log('DEBUG - patientData being created:', patientData);

      // Check if patient already exists
      let patientRecord = null;
      if (consultationPayload.email) {
        try {
          patientRecord = await storage.getPatientByEmail(consultationPayload.email);
        } catch (error) {
          console.log('Patient lookup failed, will create new patient');
        }
      }
      
      if (!patientRecord) {
        console.log('Creating new patient from consultation:', patientData);
        try {
          patientRecord = await storage.createPatient(patientData);
          console.log('✅ Patient created successfully:', patientRecord.id);
          console.log('✅ Patient record details:', patientRecord);
        } catch (error) {
          console.error('❌ Failed to create patient:', error);
          throw error;
        }
      }

      // Create assessment from consultation for analytics and dashboard
      // Determine risk level based on available data; this might need adjustment
      // For example, if 'pain_severity' is not directly in the new payload,
      // you might infer risk from 'symptomDescription' or 'issueCategory'.
      // For now, let's assume a default or derive it if possible.
      let riskLevel = 'medium'; // Default risk level
      // Example: if (consultationPayload.symptomDescription && consultationPayload.symptomDescription.toLowerCase().includes('severe')) {
      //   riskLevel = 'high';
      // }

      const assessmentData = {
        patientId: patientRecord.id,
        primaryConcern: consultationPayload.issueCategory || 'General consultation',
        riskLevel: riskLevel, // Adjust as needed based on new payload
        status: 'completed',
        completedAt: new Date(),
        clinicLocation: consultationPayload.preferredClinic || null,
      };

      console.log('Creating assessment from consultation:', assessmentData);
      let assessmentRecord;
      try {
        assessmentRecord = await storage.createAssessment(assessmentData);
        console.log('✅ Assessment created successfully:', assessmentRecord.id);
      } catch (error) {
        console.error('❌ Failed to create assessment:', error);
        throw error;
      }

      // Create condition record if issue category exists
      if (consultationPayload.issueCategory) {
        try {
          const existingConditions = await storage.getConditions();
          let condition = existingConditions.find(c =>
            c.name.toLowerCase() === consultationPayload.issueCategory.toLowerCase()
          );
          
          if (!condition) {
            condition = await storage.createCondition({
              name: consultationPayload.issueCategory,
              description: consultationPayload.nailSpecifics || consultationPayload.painSpecifics || consultationPayload.skinSpecifics || consultationPayload.structuralSpecifics || ''
            });
          }
        } catch (error) {
          console.log('Note: Could not create condition record:', error);
        }
      }

      // Broadcast updates to all connected admin users
      if (typeof (globalThis as any).broadcastToClients === 'function') {
        (globalThis as any).broadcastToClients({
          type: 'new_assessment',
          data: {
            patientId: patientRecord.id,
            patientName: patientRecord.name,
            assessmentId: assessmentRecord.id,
            riskLevel: assessmentRecord.riskLevel,
            timestamp: new Date().toISOString()
          }
        });
      }

      res.status(200).json({
        success: true,
        message: 'Consultation received and processed successfully',
        consultationId: consultationRecord.id,
        patientId: patientRecord.id,
        assessmentId: assessmentRecord.id
      });

    } catch (error) {
      console.error('❌ Error processing chatbot consultation:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to process consultation data'
      });
    }
  });

  // Get consultations
  app.get('/api/consultations', async (req: Request, res: Response) => {
    try {
      const consultations = await storage.getConsultations();
      res.json(consultations);
    } catch (error) {
      console.error('Error fetching consultations:', error);
      res.status(500).json({ message: 'Failed to fetch consultations' });
    }
  });

  // Get patients - return assessments with patient data for the frontend
  app.get('/api/patients', skipAuthForWebhook, async (req: Request, res: Response) => {
    try {
      const assessments = await storage.getAssessments({});
      
      res.json({
        assessments: assessments,
        pagination: {
          total: assessments.length,
          page: 1,
          limit: 50,
          totalPages: Math.ceil(assessments.length / 50)
        }
      });
    } catch (error) {
      console.error('Error fetching patients:', error);
      res.status(500).json({ message: 'Failed to fetch patients' });
    }
  });

  // Get assessments
  app.get('/api/assessments', async (req: Request, res: Response) => {
    try {
      const assessments = await storage.getAssessments();
      res.json(assessments);
    } catch (error) {
      console.error('Error fetching assessments:', error);
      res.status(500).json({ message: 'Failed to fetch assessments' });
    }
  });

  // Debug endpoint - no auth required
  app.get('/api/debug/structure', skipAuthForWebhook, async (req: Request, res: Response) => {
    try {
      const assessments = await storage.getAssessments({});
      const firstAssessment = assessments[0];
      
      res.json({
        total_assessments: assessments.length,
        first_assessment_structure: firstAssessment ? {
          id: firstAssessment.id,
          patientId: firstAssessment.patientId,
          primaryConcern: firstAssessment.primaryConcern,
          status: firstAssessment.status,
          riskLevel: firstAssessment.riskLevel,
          completedAt: firstAssessment.completedAt,
          patient: firstAssessment.patient ? {
            id: firstAssessment.patient.id,
            name: firstAssessment.patient.name,
            email: firstAssessment.patient.email
          } : null
        } : null
      });
    } catch (error) {
      console.error('Error in debug endpoint:', error);
      res.status(500).json({ message: 'Debug failed' });
    }
  });

  const httpServer = createServer(app);
  
  // WebSocket server for real-time updates
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // Store connected clients
  const clients = new Set<WebSocket>();
  
  wss.on('connection', (ws: WebSocket) => {
    console.log('Admin client connected to WebSocket');
    clients.add(ws);
    
    ws.on('close', () => {
      console.log('Admin client disconnected from WebSocket');
      clients.delete(ws);
    });
    
    ws.on('error', (error: Error) => {
      console.error('WebSocket error:', error);
      clients.delete(ws);
    });
  });
  
  // Global function to broadcast messages to all connected clients
  (globalThis as any).broadcastToClients = (message: any) => {
    const messageStr = JSON.stringify(message);
    clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(messageStr);
      }
    });
  };

  return httpServer;
}