import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import WebSocket, { WebSocketServer } from 'ws';
import { storage } from "./storage";
import { setupAuth, isAuthenticated, skipAuthForWebhook } from "./simpleAuth";
import { startOfWeek, addDays, format, parseISO, startOfDay, endOfDay } from "date-fns";
import bodyParser from "body-parser";

// Helper function to extract values from nested objects using dot notation or from arrays
function extractValue(obj: any, paths: string[]): any {
  // Try each possible path
  for (const path of paths) {
    // If path contains wildcard (for searching in arrays)
    if (path.includes('*')) {
      const [arrayPath, fieldPath] = path.split('.*.');
      
      // Get the array if it exists
      const array = getNestedValue(obj, arrayPath);
      if (Array.isArray(array)) {
        // Try to find a match in any array item
        for (const item of array) {
          // Special case for finding clinic location in responses
          if (arrayPath === 'responses' && fieldPath === 'answer') {
            // Look for clinic-related questions
            const question = getNestedValue(item, 'question') || '';
            const answer = getNestedValue(item, 'answer') || '';
            
            if (
              (question.toLowerCase().includes('clinic') || 
               question.toLowerCase().includes('location') ||
               question.toLowerCase().includes('visit')) &&
              (answer.toLowerCase().includes('donnycarney') || 
               answer.toLowerCase().includes('palmerstown') || 
               answer.toLowerCase().includes('baldoyle'))
            ) {
              // Found a clinic location answer
              return formatClinicName(answer);
            }
          }
          
          const value = getNestedValue(item, fieldPath);
          if (value !== undefined) return value;
        }
      }
      continue;
    }
    
    // Normal path without wildcards
    const value = getNestedValue(obj, path);
    if (value !== undefined) return value;
  }
  
  return undefined;
}

// Helper function to extract arrays from nested objects
function extractArray(obj: any, paths: string[]): any[] {
  for (const path of paths) {
    const value = getNestedValue(obj, path);
    if (Array.isArray(value) && value.length > 0) return value;
  }
  return [];
}

// Helper to get a nested value using dot notation
function getNestedValue(obj: any, path: string): any {
  if (!obj || typeof obj !== 'object') return undefined;
  
  // Handle dot notation
  const parts = path.split('.');
  let current = obj;
  
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    if (typeof current !== 'object') return undefined;
    
    current = current[part];
  }
  
  return current;
}

// Helper to format clinic names consistently
function formatClinicName(input: string): string {
  if (!input) return '';
  
  // Normalize the input
  const normalized = input.toLowerCase().trim();
  
  // Check for clinic locations
  if (normalized.includes('donnycarney')) {
    return 'FootCare Clinic - Donnycarney';
  } else if (normalized.includes('palmerstown')) {
    return 'FootCare Clinic - Palmerstown';
  } else if (normalized.includes('baldoyle')) {
    return 'FootCare Clinic - Baldoyle';
  }
  
  // Return original if no match
  return input;
}

// Helper to try building responses from unstructured data
function buildResponsesFromRawData(data: any): any[] {
  const responses = [];
  
  // Try to find questions and answers in the data
  if (typeof data === 'object') {
    // Look through all properties
    for (const key in data) {
      // Skip if not an object property
      if (!data.hasOwnProperty(key)) continue;
      
      const value = data[key];
      
      // If this looks like a question-answer pair
      if (isQuestionKey(key) && typeof value === 'string') {
        responses.push({
          question: formatQuestionText(key),
          answer: value,
          isFlagged: isFlaggedResponse(value)
        });
      }
      
      // Special case for clinic location
      if (
        (key.toLowerCase().includes('clinic') || 
         key.toLowerCase().includes('location')) && 
        typeof value === 'string'
      ) {
        responses.push({
          question: 'Which clinic would you like to visit?',
          answer: value,
          isFlagged: false
        });
      }
    }
  }
  
  return responses;
}

// Helper to check if a key name looks like a question
function isQuestionKey(key: string): boolean {
  const normalized = key.toLowerCase();
  return (
    normalized.includes('question') || 
    normalized.includes('ask') || 
    normalized.endsWith('q') ||
    normalized.includes('prompt')
  );
}

// Helper to format a property key into a readable question
function formatQuestionText(key: string): string {
  // Remove prefixes like q_, question_, etc.
  let formatted = key.replace(/^(q_|question_|ask_|prompt_)/i, '');
  
  // Replace underscores and camelCase with spaces
  formatted = formatted
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .trim();
  
  // Capitalize first letter
  formatted = formatted.charAt(0).toUpperCase() + formatted.slice(1);
  
  // Add question mark if not present
  if (!formatted.endsWith('?')) {
    formatted += '?';
  }
  
  return formatted;
}

// Helper to determine if a response might need flagging
function isFlaggedResponse(text: string): boolean {
  if (!text) return false;
  
  const normalized = text.toLowerCase();
  
  // List of keywords that might indicate a response should be flagged
  const flagKeywords = [
    'severe', 'extreme', 'unbearable', 'excruciating',
    'worse', 'worsening', 'deteriorating',
    'cannot walk', 'can\'t walk', 'unable to walk',
    'emergency', 'urgent', 'immediately',
    'bleeding', 'infection', 'injured',
    'months', 'weeks', 'long time'
  ];
  
  return flagKeywords.some(keyword => normalized.includes(keyword));
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Add body parser for JSON
  app.use(bodyParser.json());
  
  // Clinic routes (public for map display) - BEFORE authentication middleware
  app.get('/api/clinics', async (req, res) => {
    try {
      const clinics = await storage.getClinics();
      res.json(clinics);
    } catch (error) {
      console.error('Error fetching clinics:', error);
      res.status(500).json({ message: 'Failed to fetch clinics' });
    }
  });

  app.get('/api/clinics/assessment-counts', async (req, res) => {
    try {
      const clinicCounts = await storage.getClinicAssessmentCounts();
      res.json(clinicCounts);
    } catch (error) {
      console.error('Error fetching clinic assessment counts:', error);
      res.status(500).json({ message: 'Failed to fetch clinic assessment counts' });
    }
  });

  // Get consultations from chatbot
  app.get('/api/consultations', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const consultations = await storage.getConsultations();
      res.json(consultations);
    } catch (error) {
      console.error('Error fetching consultations:', error);
      res.status(500).json({ message: 'Failed to fetch consultations' });
    }
  });
  
  // Auth middleware
  setupAuth(app);
  
  // Create HTTP server for Express
  const httpServer = createServer(app);
  
  // Set up WebSocket server with /ws path to avoid conflict with Vite's HMR
  const wss = new WebSocketServer({ 
    server: httpServer, 
    path: '/ws' 
  });
  
  // Handle WebSocket connections
  wss.on('connection', (ws) => {
    console.log('Client connected to WebSocket');
    
    // Send initial connection message
    ws.send(JSON.stringify({
      type: 'connection',
      data: {
        status: 'connected',
        time: new Date().toISOString()
      }
    }));
    
    ws.on('close', () => {
      console.log('Client disconnected from WebSocket');
    });
  });
  
  // Set up global broadcast function to send messages to all connected clients
  (global as any).broadcastToClients = (message: any) => {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  };
  
  // Apply authentication only for API endpoints that need protection
  app.use('/api', (req, res, next) => {
    // Skip authentication for webhook endpoint and clinic data (needed for map display)
    if (req.path === '/webhook/chatbot' || 
        req.path === '/clinics' || 
        req.path === '/clinics/assessment-counts') {
      return next();
    }
    
    // Skip authentication for login and auth check endpoints
    if (req.path === '/login' || req.path === '/auth/user') {
      return next();
    }
    
    // All other API endpoints require authentication
    return isAuthenticated(req, res, next);
  });

  // Direct API endpoints - with authentication
  
  // API for getting dashboard stats
  app.get('/api/dashboard/stats', async (req, res) => {
    try {
      const totalPatients = await storage.getPatientsCount();
      const completedAssessments = await storage.getCompletedAssessmentsCount();
      const weeklyAssessments = await storage.getWeeklyAssessmentsCount();
      const flaggedResponses = await storage.getFlaggedResponsesCount();
      
      res.json({
        totalPatients,
        completedAssessments,
        weeklyAssessments,
        flaggedResponses
      });
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });
  
  // API for getting assessment trends
  app.get('/api/dashboard/trends', async (req, res) => {
    try {
      const days = req.query.days ? parseInt(req.query.days as string) : 7;
      const trends = await storage.getAssessmentsTrend(days);
      res.json(trends);
    } catch (error) {
      console.error("Error fetching assessment trends:", error);
      res.status(500).json({ message: "Failed to fetch assessment trends" });
    }
  });
  
  // API for getting top conditions
  app.get('/api/dashboard/conditions', async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 5;
      const conditions = await storage.getTopConditions(limit);
      res.json(conditions);
    } catch (error) {
      console.error("Error fetching top conditions:", error);
      res.status(500).json({ message: "Failed to fetch top conditions" });
    }
  });
  
  // API for getting recent assessments
  app.get('/api/assessments/recent', async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 5;
      const assessments = await storage.getRecentAssessments(limit);
      res.json(assessments);
    } catch (error) {
      console.error("Error fetching recent assessments:", error);
      res.status(500).json({ message: "Failed to fetch recent assessments" });
    }
  });
  
  // Auth user endpoint - always return admin user to bypass auth for now
  app.get('/api/auth/user', async (req, res) => {
    res.json({
      id: 'admin',
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@example.com',
      profileImageUrl: 'https://ui-avatars.com/api/?name=Admin+User&background=0D8ABC&color=fff',
      role: 'admin',
      authenticated: true
    });
  });

  // Get patients endpoint
  app.get('/api/patients', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const patients = await storage.getPatients();
      const assessments = await storage.getAssessments();
      
      res.json({
        assessments: assessments,
        pagination: {
          total: patients.length,
          page: 1,
          limit: patients.length,
          totalPages: 1
        }
      });
    } catch (error) {
      console.error('Error fetching patients:', error);
      res.status(500).json({ message: 'Failed to fetch patients' });
    }
  });

  // Sync patient with Cliniko
  app.post('/api/patients/:id/cliniko-sync', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const patientId = parseInt(req.params.id);
      if (isNaN(patientId)) {
        return res.status(400).json({ message: 'Invalid patient ID' });
      }

      const patient = await storage.getPatientById(patientId);
      if (!patient) {
        return res.status(404).json({ message: 'Patient not found' });
      }

      // Check if we have Cliniko API credentials
      if (!process.env.CLINIKO_API_KEY || !process.env.CLINIKO_SUBDOMAIN) {
        return res.status(400).json({ 
          message: 'Cliniko integration not configured. Please provide CLINIKO_API_KEY and CLINIKO_SUBDOMAIN environment variables.' 
        });
      }

      // Prepare patient data for Cliniko
      const clinikoPatientData = {
        first_name: patient.name?.split(' ')[0] || '',
        last_name: patient.name?.split(' ').slice(1).join(' ') || '',
        email: patient.email,
        phone_number: patient.phone,
        date_of_birth: patient.dateOfBirth,
        gender: patient.gender,
        address_1: patient.address,
        occupation: patient.occupation,
        medical_alerts: patient.medicalHistory,
        notes: `Imported from FootCare Clinic Chatbot. Assessment completed on ${patient.createdAt}`
      };

      // Cliniko API setup
      const clinikoBaseUrl = `https://${process.env.CLINIKO_SUBDOMAIN}.cliniko.com/v1`;
      const authHeader = Buffer.from(`${process.env.CLINIKO_API_KEY}:`).toString('base64');
      
      // First, try to find existing patient in Cliniko by email
      let existingPatient = null;
      if (patient.email) {
        try {
          const searchResponse = await fetch(`${clinikoBaseUrl}/patients?q=${encodeURIComponent(patient.email)}`, {
            headers: {
              'Authorization': `Basic ${authHeader}`,
              'Content-Type': 'application/json',
              'User-Agent': 'FootCare Clinic Admin Portal'
            }
          });
          
          if (searchResponse.ok) {
            const searchData = await searchResponse.json();
            existingPatient = searchData.patients?.find((p: any) => 
              p.email?.toLowerCase() === patient.email?.toLowerCase()
            );
          }
        } catch (searchError) {
          console.log('Patient search failed, will create new patient:', searchError);
        }
      }

      let result;
      if (existingPatient) {
        // Update existing patient
        const updateResponse = await fetch(`${clinikoBaseUrl}/patients/${existingPatient.id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Basic ${authHeader}`,
            'Content-Type': 'application/json',
            'User-Agent': 'FootCare Clinic Admin Portal'
          },
          body: JSON.stringify({ patient: clinikoPatientData })
        });

        if (!updateResponse.ok) {
          const errorText = await updateResponse.text();
          throw new Error(`Cliniko update failed: ${updateResponse.statusText} - ${errorText}`);
        }

        const updateData = await updateResponse.json();
        result = { action: 'updated', patient: updateData.patient };
      } else {
        // Create new patient
        const createResponse = await fetch(`${clinikoBaseUrl}/patients`, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${authHeader}`,
            'Content-Type': 'application/json',
            'User-Agent': 'FootCare Clinic Admin Portal'
          },
          body: JSON.stringify({ patient: clinikoPatientData })
        });

        if (!createResponse.ok) {
          const errorText = await createResponse.text();
          throw new Error(`Cliniko creation failed: ${createResponse.statusText} - ${errorText}`);
        }

        const createData = await createResponse.json();
        result = { action: 'created', patient: createData.patient };
      }

      // Update our local patient record with Cliniko ID if available
      if (result.patient?.id) {
        try {
          await storage.updatePatient(patientId, {
            clinikoId: result.patient.id.toString()
          });
        } catch (updateError) {
          console.log('Failed to update local patient with Cliniko ID:', updateError);
          // Don't fail the whole operation for this
        }
      }

      res.json(result);
    } catch (error) {
      console.error('Error syncing with Cliniko:', error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : 'Failed to sync with Cliniko' 
      });
    }
  });
  
  // Webhook endpoint for chatbot consultations - matches your exact data structure
  app.post('/api/webhook/consultation', async (req: Request, res: Response) => {
    try {
      console.log('✅ Received consultation from chatbot:', JSON.stringify(req.body, null, 2));
      
      // Store consultation data directly using your chatbot's exact structure
      const consultationData = req.body;

      // Store consultation data with proper field mapping
      const consultationRecord = await storage.createConsultation(consultationData);
      console.log('✅ Consultation stored with ID:', consultationRecord.id);

      console.log('🔄 Starting conversion to patient and assessment records...');
      
      // Convert consultation to patient record for the main portal
      const patientData = {
        name: req.body.name || 'Unknown Patient',
        email: req.body.email || null,
        phone: req.body.phone || null,
      };

      console.log('Patient data to create:', patientData);

      // Check if patient already exists
      let patientRecord = null;
      if (req.body.email) {
        try {
          patientRecord = await storage.getPatientByEmail(req.body.email);
          console.log('✅ Found existing patient:', patientRecord.id);
        } catch (error) {
          console.log('Patient lookup failed, will create new patient');
        }
      }
      
      if (!patientRecord) {
        console.log('Creating new patient from consultation...');
        patientRecord = await storage.createPatient(patientData);
        console.log('✅ Patient created successfully with ID:', patientRecord.id);
      }

      // Create assessment from consultation for analytics and dashboard  
      const assessmentData = {
        patientId: patientRecord.id,
        riskLevel: req.body.pain_severity && parseInt(req.body.pain_severity) >= 7 ? 'high' : 'medium',
        status: 'completed',
        clinicLocation: req.body.preferred_clinic || null,
      };

      console.log('Creating assessment from consultation:', assessmentData);
      const assessmentRecord = await storage.createAssessment(assessmentData);
      console.log('✅ Assessment created successfully with ID:', assessmentRecord.id);

      // Broadcast new consultation to all connected admin users via WebSocket
      if (typeof (global as any).broadcastToClients === 'function') {
        (global as any).broadcastToClients({
          type: 'new_consultation',
          data: {
            consultationId: consultationRecord.id,
            patientName: consultationRecord.name,
            issueCategory: consultationRecord.issueCategory,
            timestamp: new Date().toISOString()
          }
        });
      }

      res.status(200).json({ 
        success: true, 
        message: 'Consultation received and stored successfully',
        consultationId: consultationRecord.id,
        patientId: patientRecord?.id,
        assessmentId: assessmentRecord?.id
      });

    } catch (error) {
      console.error('❌ Critical error in consultation webhook:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to process consultation data',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Alternative webhook endpoint for testing
  app.post('/api/webhook/chatbot', async (req: Request, res: Response) => {
    try {
      console.log('Received webhook from chatbot:', JSON.stringify(req.body, null, 2));
      
      // Extract consultation data in your chatbot's exact format
      const consultationData = req.body;
      
      // Store consultation data directly using your chatbot's exact structure
      const consultationRecord = await storage.createConsultation({
        name: consultationData.name || 'Unknown',
        email: consultationData.email || '',
        phone: consultationData.phone || '',
        preferredClinic: consultationData.preferred_clinic || null,
        issueCategory: consultationData.issue_category || null,
        issueSpecifics: consultationData.issue_specifics || null,
        painDuration: consultationData.pain_duration || null,
        painSeverity: consultationData.pain_severity || null,
        additionalInfo: consultationData.additional_info || null,
        previousTreatment: consultationData.previous_treatment || null,
        hasImage: consultationData.has_image || null,
        imagePath: consultationData.image_path || null,
        imageAnalysis: consultationData.image_analysis || null,
        symptomDescription: consultationData.symptom_description || null,
        symptomAnalysis: consultationData.symptom_analysis || null,
        conversationLog: consultationData.conversation_log || null,
      });

      // Broadcast new consultation to all connected admin users via WebSocket
      if (typeof (global as any).broadcastToClients === 'function') {
        (global as any).broadcastToClients({
          type: 'new_consultation',
          data: {
            consultationId: consultationRecord.id,
            patientName: consultationRecord.name,
            issueCategory: consultationRecord.issueCategory,
            timestamp: new Date().toISOString()
          }
        });
      }

      res.status(200).json({ 
        success: true, 
        message: 'Consultation received and stored successfully',
        consultationId: consultationRecord.id
      });

    } catch (error) {
      console.error('Error processing chatbot consultation:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to process consultation data' 
      });
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
        'assessment.clinicLocation', 
        'assessment_clinic_location',
        'clinic', 
        'clinicLocation', 
        'clinic_location', 
        'selectedClinic',
        'clinic_choice',
        'responses.*.answer' // Look in all responses for clinic selection
      ]);
      
      // Try to extract assessment data
      const assessmentInfo = {
        status: extractValue(webhookData, ['assessment.status', 'status', 'assessmentStatus']) || 'completed',
        riskLevel: extractValue(webhookData, ['assessment.riskLevel', 'riskLevel', 'risk_level', 'severity']) || 'low',
        conditions: extractArray(webhookData, ['assessment.conditions', 'conditions', 'issues', 'diagnoses']),
        score: extractValue(webhookData, ['assessment.score', 'score', 'assessmentScore'])
      };
      
      // Try to extract responses (questions and answers)
      let responsesData = extractArray(webhookData, ['responses', 'answers', 'conversation', 'messages']);
      
      // Process answers array format where the question is in "text" and the answer in "response"
      if (Array.isArray(webhookData.answers)) {
        responsesData = webhookData.answers.map(item => ({
          question: item.text || item.question || "",
          answer: item.response || item.answer || "",
          isFlagged: item.important || item.flagged || item.isFlagged || false
        }));
      }
      
      // If we still couldn't extract structured responses, try to build them from the raw data
      if (!responsesData || responsesData.length === 0) {
        responsesData = buildResponsesFromRawData(webhookData);
      }
      
      // Validate minimum required data
      if (!patientInfo.name || !patientInfo.email) {
        return res.status(400).json({ 
          success: false, 
          message: 'Required patient data missing from webhook (name and email are required)' 
        });
      }
      
      if (!responsesData || responsesData.length === 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'No response data found in webhook payload' 
        });
      }
      
      // 1. Create or update patient
      let patientRecord = await storage.getPatientByEmail(patientInfo.email);
      
      if (!patientRecord) {
        patientRecord = await storage.createPatient({
          name: patientInfo.name,
          email: patientInfo.email,
          phone: patientInfo.phone || undefined,
          dateOfBirth: patientInfo.dateOfBirth ? new Date(patientInfo.dateOfBirth) : undefined
        });
      }
      
      // 2. Create assessment
      const assessmentRecord = await storage.createAssessment({
        patientId: patientRecord.id,
        status: assessmentInfo.status,
        riskLevel: assessmentInfo.riskLevel,
        primaryConcern: assessmentInfo.conditions?.[0] || '',
        score: assessmentInfo.score ? Number(assessmentInfo.score) : undefined,
        clinicLocation: clinicLocation || null,
        completedAt: new Date()
      });
      
      // 3. Store the responses
      const questions = await storage.getQuestions();
      const flaggedResponses = [];
      
      // Process each response
      for (const response of responsesData) {
        const questionText = response.question || response.text || response.prompt || '';
        const answerText = response.answer || response.response || response.content || '';
        const isFlagged = response.isFlagged || response.flagged || response.important || false;
        
        if (questionText && answerText) {
          // Find question or create if doesn't exist
          let question = questions.find(q => 
            q.text.toLowerCase() === questionText.toLowerCase()
          );
          
          if (!question) {
            question = await storage.createQuestion({
              text: questionText,
              category: 'general',
              order: response.questionId || response.order || 0
            });
          }
          
          // Save the response
          await storage.createResponse({
            assessmentId: assessmentRecord.id,
            questionId: question.id,
            answer: answerText,
            flagged: isFlagged
          });
          
          if (isFlagged) {
            flaggedResponses.push(response);
          }
        }
      }
      
      // Create conditions if they exist
      if (assessmentInfo.conditions && assessmentInfo.conditions.length > 0) {
        const conditions = await storage.getConditions();
        
        for (const conditionName of assessmentInfo.conditions) {
          let condition = conditions.find(c => 
            c.name.toLowerCase() === conditionName.toLowerCase()
          );
          
          if (!condition) {
            condition = await storage.createCondition({
              name: conditionName,
              description: ''
            });
          }
        }
      }
      
      // Prepare response data
      const responseData = { 
        success: true, 
        message: 'Webhook data processed successfully',
        patientId: patientRecord.id,
        assessmentId: assessmentRecord.id
      };
      
      // Broadcast to all connected WebSocket clients
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
        
        // If any responses were flagged, send a separate notification
        if (flaggedResponses.length > 0) {
          (global as any).broadcastToClients({
            type: 'flagged_response',
            data: {
              patientId: patientRecord.id,
              patientName: patientRecord.name,
              assessmentId: assessmentRecord.id,
              flaggedCount: flaggedResponses.length,
              timestamp: new Date().toISOString()
            }
          });
        }
      }
      
      res.json(responseData);
    } catch (error) {
      console.error('Error processing webhook:', error);
      res.status(500).json({ message: 'Failed to process webhook data' });
    }
  });

  // Communication routes
  app.get('/api/communications', isAuthenticated, async (req, res) => {
    try {
      const communications = await storage.getCommunications();
      res.json(communications);
    } catch (error) {
      console.error('Error fetching communications:', error);
      res.status(500).json({ message: 'Failed to fetch communications' });
    }
  });

  app.post('/api/communications', isAuthenticated, async (req, res) => {
    try {
      const communication = await storage.createCommunication(req.body);
      res.json(communication);
    } catch (error) {
      console.error('Error creating communication:', error);
      res.status(500).json({ message: 'Failed to create communication' });
    }
  });

  // Follow-up routes
  app.get('/api/followups', isAuthenticated, async (req, res) => {
    try {
      const followUps = await storage.getFollowUps();
      res.json(followUps);
    } catch (error) {
      console.error('Error fetching follow-ups:', error);
      res.status(500).json({ message: 'Failed to fetch follow-ups' });
    }
  });

  app.post('/api/followups', isAuthenticated, async (req, res) => {
    try {
      const followUp = await storage.createFollowUp(req.body);
      res.json(followUp);
    } catch (error) {
      console.error('Error creating follow-up:', error);
      res.status(500).json({ message: 'Failed to create follow-up' });
    }
  });

  return httpServer;
}