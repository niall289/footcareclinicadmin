import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import WebSocket, { WebSocketServer } from 'ws';
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./simpleAuth";

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
  app.get('/api/dashboard/stats', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const completedAssessments = await storage.getCompletedAssessmentsCount();
      const weeklyAssessments = await storage.getWeeklyAssessmentsCount();
      const flaggedResponses = await storage.getFlaggedResponsesCount();
      
      res.json({
        completedAssessments,
        weeklyAssessments,
        flaggedResponses
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      res.status(500).json({ message: 'Failed to fetch stats' });
    }
  });

  // Consultations endpoint - matches your chatbot's URL
  app.post('/api/webhook/consultation', async (req: Request, res: Response) => {
    try {
      console.log('✅ Received consultation from chatbot:', JSON.stringify(req.body, null, 2));
      
      // Store consultation data directly using your chatbot's exact structure
      const consultationRecord = await storage.createConsultation(req.body);

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
      console.error('❌ Error processing chatbot consultation:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to process consultation data' 
      });
    }
  });

  // Get consultations
  app.get('/api/consultations', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const consultations = await storage.getConsultations();
      res.json(consultations);
    } catch (error) {
      console.error('Error fetching consultations:', error);
      res.status(500).json({ message: 'Failed to fetch consultations' });
    }
  });

  // Get patients
  app.get('/api/patients', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const patients = await storage.getPatients();
      res.json(patients);
    } catch (error) {
      console.error('Error fetching patients:', error);
      res.status(500).json({ message: 'Failed to fetch patients' });
    }
  });

  // Get assessments
  app.get('/api/assessments', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const assessments = await storage.getAssessments();
      res.json(assessments);
    } catch (error) {
      console.error('Error fetching assessments:', error);
      res.status(500).json({ message: 'Failed to fetch assessments' });
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