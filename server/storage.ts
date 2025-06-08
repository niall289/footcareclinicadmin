import {
  users,
  patients,
  assessments,
  questions,
  responses,
  conditions,
  clinics,
  assessmentConditions,
  communications,
  followUps,
  consultations,
  type UpsertUser,
  type User,
  type InsertPatient,
  type Patient,
  type InsertAssessment,
  type Assessment,
  type AssessmentWithPatient,
  type InsertResponse,
  type Response,
  type ResponseWithQuestion,
  type InsertQuestion,
  type Question,
  type InsertCondition,
  type Condition,
  type InsertClinic,
  type Clinic,
  type ClinicWithAssessmentCount,
  type InsertCommunication,
  type Communication,
  type InsertConsultation,
  type Consultation,
  type CommunicationWithPatient,
  type InsertFollowUp,
  type FollowUp,
  type FollowUpWithPatient,
  // ChatbotSettingsSchemaType, InsertChatbotSettingsSchemaType are not used from schema directly for ChatbotSettingsData
} from "@shared/schema";
import { db } from "./db"; // db can be null if DATABASE_URL is not set
import { eq, and, desc, sql, count, like, or, between, asc } from "drizzle-orm";

// Define ChatbotSettings structure
export interface ChatbotSettingsData {
  id?: number;
  welcomeMessage?: string;
  botDisplayName?: string;
  ctaButtonLabel?: string;
  chatbotTone?: 'Friendly' | 'Professional' | 'Clinical' | 'Casual';
  createdAt?: Date;
  updatedAt?: Date;
}

// Interface for storage operations
export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  getPatients(options?: { limit?: number; offset?: number; search?: string }): Promise<Patient[]>;
  getPatientById(id: number): Promise<Patient | undefined>;
  getPatientByEmail(email: string): Promise<Patient | undefined>;
  createPatient(patient: InsertPatient): Promise<Patient>;
  updatePatient(id: number, patient: Partial<InsertPatient>): Promise<Patient | undefined>;
  getPatientsCount(search?: string): Promise<number>;
  getAssessments(options?: { limit?: number; offset?: number; patientId?: number; status?: string; riskLevel?: string; startDate?: Date; endDate?: Date; clinicLocation?: string; }): Promise<AssessmentWithPatient[]>;
  getAssessmentsCount(options?: { patientId?: number; status?: string; riskLevel?: string; startDate?: Date; endDate?: Date; clinicLocation?: string; }): Promise<number>;
  getAssessmentById(id: number): Promise<Assessment | undefined>;
  createAssessment(assessment: InsertAssessment): Promise<Assessment>;
  updateAssessment(id: number, assessment: Partial<InsertAssessment>): Promise<Assessment | undefined>;
  getAssessmentsByDateRange(startDate: Date, endDate: Date): Promise<Assessment[]>;
  getRecentAssessments(limit?: number): Promise<AssessmentWithPatient[]>;
  getResponsesByAssessmentId(assessmentId: number): Promise<ResponseWithQuestion[]>;
  createResponse(response: InsertResponse): Promise<Response>;
  updateResponse(id: number, response: Partial<InsertResponse>): Promise<Response | undefined>;
  getFlaggedResponses(): Promise<ResponseWithQuestion[]>;
  getFlaggedResponsesCount(): Promise<number>;
  getQuestions(): Promise<Question[]>;
  getQuestionById(id: number): Promise<Question | undefined>;
  createQuestion(question: InsertQuestion): Promise<Question>;
  getConditions(): Promise<Condition[]>;
  createCondition(condition: InsertCondition): Promise<Condition>;
  getConditionById(id: number): Promise<Condition | undefined>;
  getTopConditions(limit?: number): Promise<{ condition: string; count: number }[]>;
  getClinics(): Promise<Clinic[]>;
  getClinicById(id: number): Promise<Clinic | undefined>;
  createClinic(clinic: InsertClinic): Promise<Clinic>;
  updateClinic(id: number, clinic: Partial<InsertClinic>): Promise<Clinic | undefined>;
  getClinicAssessmentCounts(): Promise<ClinicWithAssessmentCount[]>;
  getCommunications(): Promise<CommunicationWithPatient[]>;
  createCommunication(communication: InsertCommunication): Promise<Communication>;
  getFollowUps(): Promise<FollowUpWithPatient[]>;
  createFollowUp(followUp: InsertFollowUp): Promise<FollowUp>;
  getCompletedAssessmentsCount(): Promise<number>;
  getWeeklyAssessmentsCount(): Promise<number>;
  getAssessmentsTrend(days?: number): Promise<{ date: string; count: number }[]>;
  getChatbotSettings(): Promise<ChatbotSettingsData | null>;
  updateChatbotSettings(settings: Partial<ChatbotSettingsData>): Promise<ChatbotSettingsData>;
  createConsultation(consultationData: InsertConsultation): Promise<Consultation>;
  getConsultations(): Promise<Consultation[]>;
}


// In-memory store for chatbot settings
let chatbotSettingsStore: ChatbotSettingsData = {
  id: 1,
  welcomeMessage: "Hello! How can I help you with your foot care needs today?",
  botDisplayName: "Fiona - FootCare Assistant",
  ctaButtonLabel: "Ask Fiona",
  chatbotTone: "Friendly",
  createdAt: new Date(),
  updatedAt: new Date(),
};

const DB_UNAVAILABLE_WARNING = "Database not available. Operating in mock/limited mode. Data will not be persisted.";

export class DatabaseStorage implements IStorage {
  private logMockWarning(methodName: string, data?: any) {
    console.warn(`[${methodName}] ${DB_UNAVAILABLE_WARNING}`);
    if (data) {
      console.log(`[${methodName}] Mock operation with data:`, JSON.stringify(data, null, 2));
    }
  }

  // Clinic operations (Original - will fail if db is null)
  async getClinics(): Promise<Clinic[]> {
    if (!db) throw new Error(DB_UNAVAILABLE_WARNING + " (getClinics)");
    return db.select().from(clinics).orderBy(asc(clinics.name));
  }

  async getClinicById(id: number): Promise<Clinic | undefined> {
    if (!db) throw new Error(DB_UNAVAILABLE_WARNING + " (getClinicById)");
    const [clinic] = await db.select().from(clinics).where(eq(clinics.id, id));
    return clinic;
  }

  async createClinic(clinicData: InsertClinic): Promise<Clinic> {
    if (!db) throw new Error(DB_UNAVAILABLE_WARNING + " (createClinic)");
    const [clinic] = await db.insert(clinics).values(clinicData).returning();
    return clinic;
  }

  async updateClinic(id: number, clinicData: Partial<InsertClinic>): Promise<Clinic | undefined> {
    if (!db) throw new Error(DB_UNAVAILABLE_WARNING + " (updateClinic)");
    const [updatedClinic] = await db
      .update(clinics)
      .set({ ...clinicData, updatedAt: new Date() })
      .where(eq(clinics.id, id))
      .returning();
    return updatedClinic;
  }

  async getClinicAssessmentCounts(): Promise<ClinicWithAssessmentCount[]> {
    if (!db) throw new Error(DB_UNAVAILABLE_WARNING + " (getClinicAssessmentCounts)");
    const result = await db
      .select({
        clinic: clinics,
        count: sql<number>`count(${assessments.id})::int`.as('assessmentCount'),
      })
      .from(clinics)
      .leftJoin(assessments, eq(sql`${clinics.id}::text`, assessments.clinicLocation))
      .groupBy(clinics.id)
      .orderBy(desc(sql`assessmentCount`));
      
    return result.map(row => ({
      ...row.clinic,
      assessmentCount: row.count ?? 0
    }));
  }
  
  // User operations (Original - will fail if db is null)
  async getUser(id: string): Promise<User | undefined> {
    if (!db) throw new Error(DB_UNAVAILABLE_WARNING + " (getUser)");
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    if (!db) throw new Error(DB_UNAVAILABLE_WARNING + " (upsertUser)");
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: { ...userData, updatedAt: new Date() },
      })
      .returning();
    return user;
  }

  // Patient operations
  async getPatients(options?: { limit?: number; offset?: number; search?: string }): Promise<Patient[]> {
    if (!db) { this.logMockWarning('getPatients', options); return []; }
    
    let queryBuilder = db.select().from(patients).$dynamic();

    if (options?.search) {
      const searchTerm = `%${options.search}%`;
      queryBuilder = queryBuilder.where(or(like(patients.name, searchTerm), like(patients.email, searchTerm), like(patients.phone, searchTerm)));
    }
    
    queryBuilder = queryBuilder.orderBy(desc(patients.createdAt));
    
    if (options?.limit !== undefined) { // Check for undefined to allow 0
      queryBuilder = queryBuilder.limit(options.limit);
    }
    if (options?.offset !== undefined) { // Check for undefined to allow 0
      queryBuilder = queryBuilder.offset(options.offset);
    }
    return queryBuilder;
  }

  async getPatientsCount(search?: string): Promise<number> {
    if (!db) { this.logMockWarning('getPatientsCount', { search }); return 0; }
    
    let queryBuilder = db.select({ count: count() }).from(patients).$dynamic();

     if (search) {
      const searchTerm = `%${search}%`;
      queryBuilder = queryBuilder.where(or(like(patients.name, searchTerm), like(patients.email, searchTerm), like(patients.phone, searchTerm)));
    }
    const [result] = await queryBuilder;
    return result?.count || 0;
  }

  async getPatientById(id: number): Promise<Patient | undefined> {
    if (!db) { this.logMockWarning('getPatientById', { id }); return undefined; } // Mock for safety
    const [patient] = await db.select().from(patients).where(eq(patients.id, id));
    return patient;
  }

  async getPatientByEmail(email: string): Promise<Patient | undefined> {
     if (!db) { this.logMockWarning('getPatientByEmail', { email }); return undefined; } // Mock for safety
    const [patient] = await db.select().from(patients).where(eq(patients.email, email));
    return patient;
  }

  async createPatient(patientData: InsertPatient): Promise<Patient> {
    if (!db) { 
      this.logMockWarning('createPatient', patientData);
      const now = new Date();
      return { 
        id: Date.now(), 
        name: patientData.name, 
        email: patientData.email || null, 
        phone: patientData.phone || null, 
        age: null, 
        gender: null, 
        insuranceType: null, 
        dateOfBirth: patientData.dateOfBirth || null, 
        createdAt: now, 
        updatedAt: now 
      };
    }
    const [patient] = await db.insert(patients).values(patientData).returning();
    return patient;
  }

  async updatePatient(id: number, patientData: Partial<InsertPatient>): Promise<Patient | undefined> {
    if (!db) throw new Error(DB_UNAVAILABLE_WARNING + " (updatePatient)");
    const [patient] = await db
      .update(patients)
      .set({ ...patientData, updatedAt: new Date() })
      .where(eq(patients.id, id))
      .returning();
    return patient;
  }

  // Assessment operations
  async getAssessments(options?: { limit?: number; offset?: number; patientId?: number; status?: string; riskLevel?: string; startDate?: Date; endDate?: Date; clinicLocation?: string; }): Promise<AssessmentWithPatient[]> {
    if (!db) { this.logMockWarning('getAssessments', options); return []; } // Mock for safety
    let queryBuilder = db.select({
      assessment: assessments,
      patient: patients,
    })
    .from(assessments)
    .innerJoin(patients, eq(assessments.patientId, patients.id))
    .$dynamic();
        
    const queryConditions: any[] = [];
    if (options?.patientId) { queryConditions.push(eq(assessments.patientId, options.patientId));}
    if (options?.status) { queryConditions.push(eq(assessments.status, options.status));}
    if (options?.riskLevel) { queryConditions.push(eq(assessments.riskLevel, options.riskLevel));}
    if (options?.clinicLocation) { queryConditions.push(eq(assessments.clinicLocation, options.clinicLocation));}
    if (options?.startDate && options?.endDate) { queryConditions.push(between(assessments.completedAt, options.startDate, options.endDate));}
    
    if (queryConditions.length > 0) {
      queryBuilder = queryBuilder.where(and(...queryConditions));
    }
    
    queryBuilder = queryBuilder.orderBy(desc(assessments.completedAt));
    
    if (options?.limit !== undefined) {
      queryBuilder = queryBuilder.limit(options.limit);
    }
    if (options?.offset !== undefined) {
      queryBuilder = queryBuilder.offset(options.offset);
    }
    const results = await queryBuilder;
    return results.map(({ assessment, patient }) => ({ ...assessment, patient, }));
  }

  async getAssessmentsCount(options?: { patientId?: number; status?: string; riskLevel?: string; startDate?: Date; endDate?: Date; clinicLocation?: string; }): Promise<number> {
    if (!db) { this.logMockWarning('getAssessmentsCount', options); return 0; }
    
    let queryBuilder = db.select({ count: count() }).from(assessments).$dynamic();
    
    const queryConditions: any[] = [];
    if (options?.patientId) { queryConditions.push(eq(assessments.patientId, options.patientId));}
    if (options?.status) { queryConditions.push(eq(assessments.status, options.status));}
    if (options?.riskLevel) { queryConditions.push(eq(assessments.riskLevel, options.riskLevel));}
    if (options?.clinicLocation) { queryConditions.push(eq(assessments.clinicLocation, options.clinicLocation));}
    if (options?.startDate && options?.endDate) { queryConditions.push(between(assessments.completedAt, options.startDate, options.endDate));}
    
    if (queryConditions.length > 0) {
      queryBuilder = queryBuilder.where(and(...queryConditions));
    }
    const [result] = await queryBuilder;
    return result?.count || 0;
  }

  async getAssessmentById(id: number): Promise<Assessment | undefined> {
    if (!db) { this.logMockWarning('getAssessmentById', { id }); return undefined; } // Mock for safety
    const [assessment] = await db.select().from(assessments).where(eq(assessments.id, id));
    return assessment;
  }

  async createAssessment(assessmentData: InsertAssessment): Promise<Assessment> {
    if (!db) { 
      this.logMockWarning('createAssessment', assessmentData);
      const now = new Date();
      return { 
        id: Date.now(), 
        patientId: assessmentData.patientId, 
        status: assessmentData.status || 'mock_status',
        completedAt: assessmentData.completedAt || now,
        riskLevel: assessmentData.riskLevel || null,
        primaryConcern: assessmentData.primaryConcern || null,
        score: assessmentData.score || null,
        clinicLocation: assessmentData.clinicLocation || null,
        createdAt: now, 
        updatedAt: now
      };
    }
    const [assessment] = await db.insert(assessments).values(assessmentData).returning();
    return assessment;
  }

  async updateAssessment(id: number, assessmentData: Partial<InsertAssessment>): Promise<Assessment | undefined> {
    if (!db) throw new Error(DB_UNAVAILABLE_WARNING + " (updateAssessment)");
    const [assessment] = await db
      .update(assessments)
      .set({ ...assessmentData, updatedAt: new Date() })
      .where(eq(assessments.id, id))
      .returning();
    return assessment;
  }

  async getAssessmentsByDateRange(startDate: Date, endDate: Date): Promise<Assessment[]> {
    if (!db) throw new Error(DB_UNAVAILABLE_WARNING + " (getAssessmentsByDateRange)");
    return db
      .select()
      .from(assessments)
      .where(
        and(
          sql`${assessments.completedAt} >= ${startDate}`,
          sql`${assessments.completedAt} <= ${endDate}`
        )
      );
  }

  async getRecentAssessments(limit = 5): Promise<AssessmentWithPatient[]> {
    if (!db) { this.logMockWarning('getRecentAssessments', { limit }); return []; } // Mock for safety
    try {
      const results = await db
        .select({
          assessment: {
            id: assessments.id,
            patientId: assessments.patientId,
            completedAt: assessments.completedAt,
            status: assessments.status,
            riskLevel: assessments.riskLevel,
            primaryConcern: assessments.primaryConcern,
            createdAt: assessments.createdAt,
            updatedAt: assessments.updatedAt,
            score: assessments.score, 
            clinicLocation: assessments.clinicLocation 
          },
          patient: patients
        })
        .from(assessments)
        .innerJoin(patients, eq(assessments.patientId, patients.id))
        .orderBy(desc(assessments.completedAt))
        .limit(limit);
      
      return results.map(({ assessment, patient }) => ({
        ...assessment,
        patient,
      }));
    } catch (error) {
      console.error("Error in getRecentAssessments:", error);
      return [];
    }
  }

  // Response operations (Original - will fail if db is null)
  async getResponsesByAssessmentId(assessmentId: number): Promise<ResponseWithQuestion[]> {
    if (!db) throw new Error(DB_UNAVAILABLE_WARNING + " (getResponsesByAssessmentId)");
    const results = await db
      .select({
        response: responses,
        question: questions,
      })
      .from(responses)
      .innerJoin(questions, eq(responses.questionId, questions.id))
      .where(eq(responses.assessmentId, assessmentId))
      .orderBy(asc(questions.order));
    
    return results.map(({ response, question }) => ({
      ...response,
      question,
    }));
  }

  async createResponse(responseData: InsertResponse): Promise<Response> {
    if (!db) throw new Error(DB_UNAVAILABLE_WARNING + " (createResponse)");
    const [response] = await db.insert(responses).values(responseData).returning();
    return response;
  }

  async updateResponse(id: number, responseData: Partial<InsertResponse>): Promise<Response | undefined> {
    if (!db) throw new Error(DB_UNAVAILABLE_WARNING + " (updateResponse)");
    const [response] = await db
      .update(responses)
      .set(responseData)
      .where(eq(responses.id, id))
      .returning();
    return response;
  }

  async getFlaggedResponses(): Promise<ResponseWithQuestion[]> {
    if (!db) throw new Error(DB_UNAVAILABLE_WARNING + " (getFlaggedResponses)");
    const results = await db
      .select({
        response: responses,
        question: questions,
      })
      .from(responses)
      .innerJoin(questions, eq(responses.questionId, questions.id))
      .where(eq(responses.flagged, true))
      .orderBy(desc(responses.createdAt));
    
    return results.map(({ response, question }) => ({
      ...response,
      question,
    }));
  }

  async getFlaggedResponsesCount(): Promise<number> {
    if (!db) throw new Error(DB_UNAVAILABLE_WARNING + " (getFlaggedResponsesCount)");
    const [result] = await db
      .select({ count: count() })
      .from(responses)
      .where(eq(responses.flagged, true));
    return result?.count || 0;
  }

  // Question operations (Original - will fail if db is null)
  async getQuestions(): Promise<Question[]> {
    if (!db) throw new Error(DB_UNAVAILABLE_WARNING + " (getQuestions)");
    return db.select().from(questions).orderBy(asc(questions.order));
  }

  async getQuestionById(id: number): Promise<Question | undefined> {
    if (!db) throw new Error(DB_UNAVAILABLE_WARNING + " (getQuestionById)");
    const [question] = await db.select().from(questions).where(eq(questions.id, id));
    return question;
  }

  async createQuestion(questionData: InsertQuestion): Promise<Question> {
    if (!db) throw new Error(DB_UNAVAILABLE_WARNING + " (createQuestion)");
    const [question] = await db.insert(questions).values(questionData).returning();
    return question;
  }

  // Condition operations (Original - will fail if db is null)
  async getConditions(): Promise<Condition[]> {
    if (!db) throw new Error(DB_UNAVAILABLE_WARNING + " (getConditions)");
    return db.select().from(conditions).orderBy(asc(conditions.name));
  }

  async createCondition(conditionData: InsertCondition): Promise<Condition> {
    if (!db) throw new Error(DB_UNAVAILABLE_WARNING + " (createCondition)");
    const [condition] = await db.insert(conditions).values(conditionData).returning();
    return condition;
  }

  async getConditionById(id: number): Promise<Condition | undefined> {
    if (!db) throw new Error(DB_UNAVAILABLE_WARNING + " (getConditionById)");
    const [condition] = await db.select().from(conditions).where(eq(conditions.id, id));
    return condition;
  }

  async getTopConditions(limit = 5): Promise<{ condition: string; count: number }[]> {
    if (!db) throw new Error(DB_UNAVAILABLE_WARNING + " (getTopConditions)");
    const results = await db
      .select({
        condition: conditions.name,
        count: count(assessmentConditions.assessmentId),
      })
      .from(assessmentConditions)
      .innerJoin(conditions, eq(assessmentConditions.conditionId, conditions.id))
      .groupBy(conditions.name)
      .orderBy(desc(count(assessmentConditions.assessmentId)))
      .limit(limit);
    
    return results;
  }

  // Dashboard data (Original - will fail if db is null)
  async getCompletedAssessmentsCount(): Promise<number> {
    if (!db) throw new Error(DB_UNAVAILABLE_WARNING + " (getCompletedAssessmentsCount)");
    const [result] = await db
      .select({ count: count() })
      .from(assessments)
      .where(eq(assessments.status, 'completed'));
    return result?.count || 0;
  }

  async getWeeklyAssessmentsCount(): Promise<number> {
    if (!db) throw new Error(DB_UNAVAILABLE_WARNING + " (getWeeklyAssessmentsCount)");
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const [result] = await db
      .select({ count: count() })
      .from(assessments)
      .where(
        and(
          sql`${assessments.completedAt} >= ${oneWeekAgo}`,
          sql`${assessments.completedAt} <= ${new Date()}`
        )
      );
    return result?.count || 0;
  }

  async getAssessmentsTrend(days = 7): Promise<{ date: string; count: number }[]> {
    if (!db) throw new Error(DB_UNAVAILABLE_WARNING + " (getAssessmentsTrend)");
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);
    
    const results = await db
      .select({
        date: sql<string>`DATE(${assessments.completedAt})`,
        count: count(),
      })
      .from(assessments)
      .where(sql`${assessments.completedAt} >= ${startDate}`)
      .groupBy(sql`DATE(${assessments.completedAt})`)
      .orderBy(asc(sql`DATE(${assessments.completedAt})`));
    
    return results.map(({ date, count }) => ({
      date: new Date(date as string).toISOString().split('T')[0],
      count,
    }));
  }

  // Communication operations (Original - will fail if db is null)
  async getCommunications(): Promise<CommunicationWithPatient[]> {
    if (!db) throw new Error(DB_UNAVAILABLE_WARNING + " (getCommunications)");
    const result = await db
      .select()
      .from(communications)
      .leftJoin(patients, eq(communications.patientId, patients.id))
      .orderBy(desc(communications.createdAt));
    
    return result.map(row => ({
      ...row.communications,
      patient: row.patients! 
    }));
  }

  async createCommunication(communicationData: InsertCommunication): Promise<Communication> {
    if (!db) throw new Error(DB_UNAVAILABLE_WARNING + " (createCommunication)");
    const [communication] = await db
      .insert(communications)
      .values({
        ...communicationData,
        status: 'sent',
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    return communication;
  }

  // Follow-up operations (Original - will fail if db is null)
  async getFollowUps(): Promise<FollowUpWithPatient[]> {
    if (!db) throw new Error(DB_UNAVAILABLE_WARNING + " (getFollowUps)");
    const result = await db
      .select()
      .from(followUps)
      .leftJoin(patients, eq(followUps.patientId, patients.id))
      .orderBy(desc(followUps.scheduledFor));
    
    return result.map(row => ({
      ...(row.follow_ups!), 
      patient: row.patients!
    }));
  }

  async createFollowUp(followUpData: InsertFollowUp): Promise<FollowUp> {
    if (!db) throw new Error(DB_UNAVAILABLE_WARNING + " (createFollowUp)");
    const [followUp] = await db
      .insert(followUps)
      .values({
        ...followUpData,
        status: 'scheduled',
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    return followUp;
  }

  // Consultation operations
  async createConsultation(consultationData: InsertConsultation): Promise<Consultation> {
    if (!db) {
      this.logMockWarning('createConsultation', consultationData);
      const now = new Date();
      const mockConsultation: Consultation = {
        id: Date.now(),
        name: consultationData.name || 'Mock User',
        email: consultationData.email, 
        phone: consultationData.phone, 
        preferred_clinic: consultationData.preferred_clinic || null,
        issue_category: consultationData.issue_category || null,
        issue_specifics: consultationData.issue_specifics || null,
        pain_duration: consultationData.pain_duration || null,
        pain_severity: consultationData.pain_severity || null,
        additional_info: consultationData.additional_info || null,
        previous_treatment: consultationData.previous_treatment || null,
        has_image: consultationData.has_image || null,
        image_path: consultationData.image_path || null,
        image_analysis: consultationData.image_analysis || null,
        symptom_description: consultationData.symptom_description || null,
        symptom_analysis: consultationData.symptom_analysis || null,
        conversation_log: consultationData.conversation_log || [],
        createdAt: consultationData.createdAt || now,
      };
      return Promise.resolve(mockConsultation);
    }
    const [consultation] = await db
      .insert(consultations)
      .values(consultationData)
      .returning();
    return consultation;
  }

  async getConsultations(): Promise<Consultation[]> {
    if (!db) { this.logMockWarning('getConsultations'); return []; } // Mock for safety
    return db.select().from(consultations).orderBy(desc(consultations.createdAt));
  }

  // Chatbot Settings operations (in-memory)
  async getChatbotSettings(): Promise<ChatbotSettingsData | null> {
    console.log("Fetching chatbot settings (in-memory):", chatbotSettingsStore);
    return Promise.resolve(chatbotSettingsStore ? { ...chatbotSettingsStore } : null);
  }

  async updateChatbotSettings(settingsToUpdate: Partial<ChatbotSettingsData>): Promise<ChatbotSettingsData> {
    if (!chatbotSettingsStore) { // Should ideally not happen if initialized
        chatbotSettingsStore = {
            id: 1,
            welcomeMessage: "Default Welcome",
            botDisplayName: "Bot",
            ctaButtonLabel: "Chat",
            chatbotTone: "Friendly",
            createdAt: new Date(),
            updatedAt: new Date(),
            ...settingsToUpdate, // Apply updates over a full default structure
        };
    } else {
        chatbotSettingsStore = {
            ...chatbotSettingsStore,
            ...settingsToUpdate,
            updatedAt: new Date(),
        };
    }
    console.log("Updating chatbot settings (in-memory):", settingsToUpdate);
    console.log("New chatbot settings state (in-memory):", chatbotSettingsStore);
    // Ensure all fields of ChatbotSettingsData are present
    const currentSettings = chatbotSettingsStore;
    return Promise.resolve({
        id: currentSettings.id,
        welcomeMessage: currentSettings.welcomeMessage,
        botDisplayName: currentSettings.botDisplayName,
        ctaButtonLabel: currentSettings.ctaButtonLabel,
        chatbotTone: currentSettings.chatbotTone,
        createdAt: currentSettings.createdAt,
        updatedAt: currentSettings.updatedAt,
    });
  }
}

export const storage = new DatabaseStorage();
