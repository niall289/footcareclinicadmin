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
  
  // Apply authentication for all API endpoints except webhook
  app.use((req, res, next) => {
    // The webhook endpoint doesn't require authentication
    if (req.path === '/api/webhook/chatbot') {
      return next();
    }
    
    // Skip authentication for login endpoint
    if (req.path === '/api/login' || req.path === '/api/auth/user') {
      return next();
    }
    
    // All other endpoints require authentication
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
  
  // Webhook endpoint for chatbot integration
  app.post('/api/webhook/chatbot', async (req: Request, res: Response) => {
    try {
      console.log('Received webhook from chatbot:', JSON.stringify(req.body, null, 2));
      
      // Flexible data extraction to handle different formats
      const webhookData = req.body;
      
      // Try to extract patient data from various possible locations in the payload
      const patientInfo = {
        name: extractValue(webhookData, ['patient.name', 'patient_name', 'user.name', 'name', 'fullName', 'user.fullName']),
        email: extractValue(webhookData, ['patient.email', 'patient_email', 'user.email', 'email', 'emailAddress', 'user.emailAddress']),
        phone: extractValue(webhookData, ['patient.phone', 'patient_phone', 'user.phone', 'phone', 'phoneNumber', 'user.phoneNumber']),
        dateOfBirth: extractValue(webhookData, ['patient.dateOfBirth', 'patient_dob', 'user.dob', 'dateOfBirth', 'dob', 'user.dob'])
      };
      
      // Try to extract clinic location
      const clinicLocation = extractValue(webhookData, [
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
      res.status(500).json({ 
        success: false, 
        message: 'Error processing webhook data' 
      });
    }
  });

  // Get clinic assessment counts
  app.get("/api/clinics/stats", async (req, res) => {
    try {
      const clinicStats = await storage.getClinicAssessmentCounts();
      res.json(clinicStats);
    } catch (error) {
      console.error("Error fetching clinic assessment counts:", error);
      res.status(500).json({ message: "Failed to fetch clinic statistics" });
    }
  });

  // Return the HTTP server so it can be used by the main server
  return httpServer;
}