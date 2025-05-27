import type { Request, Response, NextFunction, Express } from 'express';
import session from 'express-session';

// Extend express-session with our token
declare module 'express-session' {
  interface SessionData {
    token?: string;
  }
}

// Password for authentication - simple approach
const ADMIN_PASSWORD = 'footcare2025';

// Token for simple authentication
let AUTH_TOKEN: string | null = null;

// Simple session setup
export function getSession() {
  return session({
    secret: 'footcare-session-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { 
      maxAge: 7 * 24 * 60 * 60 * 1000, // 1 week
      httpOnly: true,
      secure: false 
    }
  });
}

export function setupAuth(app: Express) {
  app.use(getSession());
  
  // Simple login route with token-based authentication
  app.post('/api/login', (req: Request, res: Response) => {
    const { password } = req.body;
    
    if (password === ADMIN_PASSWORD) {
      // Generate token on successful login
      AUTH_TOKEN = `auth_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      
      // Store token in session
      req.session.token = AUTH_TOKEN;
      
      return res.json({ 
        success: true, 
        message: 'Login successful',
        token: AUTH_TOKEN 
      });
    }
    
    return res.status(401).json({ 
      success: false, 
      message: 'Invalid password'
    });
  });
  
  // Logout route
  app.post('/api/logout', (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) {
        console.error('Logout error:', err);
        return res.status(500).json({ success: false });
      }
      res.clearCookie('connect.sid');
      return res.json({ success: true });
    });
  });
  
  // Check if user is authenticated
  app.get('/api/auth/user', (req: Request, res: Response) => {
    const token = req.session.token || req.headers.authorization?.replace('Bearer ', '');
    
    if (token && token === AUTH_TOKEN) {
      return res.json({
        id: 'admin',
        role: 'admin',
        authenticated: true
      });
    }
    
    return res.status(401).json({ message: 'Unauthorized' });
  });
}

// Authentication middleware
export function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  const sessionToken = req.session.token;
  const headerToken = req.headers.authorization?.replace('Bearer ', '');
  const token = sessionToken || headerToken;
  
  if (token && token === AUTH_TOKEN) {
    return next();
  }
  
  return res.status(401).json({ message: 'Unauthorized' });
}

// Skip auth for webhook and clinic data
export function skipAuthForWebhook(req: Request, res: Response, next: NextFunction) {
  if (req.path === '/api/webhook/chatbot' || 
      req.path === '/api/webhook/consultation' ||
      req.path === '/api/clinics' || 
      req.path === '/api/clinics/assessment-counts') {
    return next();
  }
  
  return isAuthenticated(req, res, next);
}