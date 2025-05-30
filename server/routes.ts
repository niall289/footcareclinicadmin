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
      console.log('✅ Received consultation from chatbot:', JSON.stringify(req.body, null, 2));
      console.log('DEBUG - patient_name field:', req.body.patient_name);
      console.log('DEBUG - name field:', req.body.name);
      console.log('DEBUG - all keys:', Object.keys(req.body));
      
      // Direct field mapping for your chatbot's exact data structure
      const mappedData = {
        name: req.body.patient_name || 'Test Patient',
        email: req.body.email || 'test@footcare.com', 
        phone: req.body.phone || '000-000-0000',
        preferred_clinic: req.body.clinic_location,
        issue_category: req.body.issue_type,
        issue_specifics: req.body.pain_presence || req.body.nail_issue_details || req.body.skin_issue_general,
        pain_duration: req.body.pain_duration,
        pain_severity: req.body.pain_severity,
        additional_info: req.body.symptom_description,
        previous_treatment: req.body.treatment_history,
        has_image: req.body.image_file_url ? 'Yes' : 'No',
        image_path: req.body.image_file_url,
        image_analysis: req.body.image_analysis_text,
        symptom_description: req.body.symptom_description,
        symptom_analysis: req.body.image_analysis_text,
        conversation_log: req.body
      };
      
      console.log('Mapped consultation data:', mappedData);
      const consultationRecord = await storage.createConsultation(mappedData);

      console.log('Converting consultation to patient and assessment records...');
      
      // Convert consultation to patient record for the main portal
      const patientData = {
        name: req.body.patient_name || 'Unknown Patient',
        email: req.body.email || null,
        phone: req.body.phone || null,
      };
      
      console.log('DEBUG - patientData being created:', patientData);

      // Check if patient already exists
      let patientRecord = null;
      if (req.body.email) {
        try {
          patientRecord = await storage.getPatientByEmail(req.body.email);
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
      const assessmentData = {
        patientId: patientRecord.id,
        primaryConcern: req.body.issue_category || req.body.issue_type || 'General consultation',
        riskLevel: req.body.pain_severity && parseInt(req.body.pain_severity) >= 7 ? 'high' : 'medium',
        status: 'completed',
        completedAt: new Date(),
        clinicLocation: req.body.preferred_clinic || null,
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
      if (req.body.issue_category) {
        try {
          const existingConditions = await storage.getConditions();
          let condition = existingConditions.find(c => 
            c.name.toLowerCase() === req.body.issue_category.toLowerCase()
          );
          
          if (!condition) {
            condition = await storage.createCondition({
              name: req.body.issue_category,
              description: req.body.issue_specifics || ''
            });
          }
        } catch (error) {
          console.log('Note: Could not create condition record:', error);
        }
      }

      // Broadcast updates to all connected admin users
      if (typeof (global as any).broadcastToClients === 'function') {
        (global as any).broadcastToClients({
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
  app.get('/api/debug/data', async (req: Request, res: Response) => {
    try {
      const assessments = await storage.getAssessments({});
      const consultations = await storage.getConsultations();
      const patients = await storage.getPatients({});
      
      res.json({
        assessments_count: assessments.length,
        consultations_count: consultations.length,
        patients_count: patients.length,
        sample_assessments: assessments.slice(0, 3),
        sample_consultations: consultations.slice(0, 3),
        sample_patients: patients.slice(0, 3)
      });
    } catch (error) {
      console.error('Error in debug endpoint:', error);
      res.status(500).json({ message: 'Debug failed', error: error.message });
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
    
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      clients.delete(ws);
    });
  });
  
  // Global function to broadcast messages to all connected clients
  (global as any).broadcastToClients = (message: any) => {
    const messageStr = JSON.stringify(message);
    clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(messageStr);
      }
    });
  };

  return httpServer;
}