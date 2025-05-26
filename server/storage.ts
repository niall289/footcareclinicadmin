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
  type CommunicationWithPatient,
  type InsertFollowUp,
  type FollowUp,
  type FollowUpWithPatient,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql, count, like, or, between, asc } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Patient operations
  getPatients(options?: { limit?: number; offset?: number; search?: string }): Promise<Patient[]>;
  getPatientById(id: number): Promise<Patient | undefined>;
  getPatientByEmail(email: string): Promise<Patient | undefined>;
  createPatient(patient: InsertPatient): Promise<Patient>;
  updatePatient(id: number, patient: Partial<InsertPatient>): Promise<Patient | undefined>;
  getPatientsCount(search?: string): Promise<number>;
  
  // Assessment operations
  getAssessments(options?: { 
    limit?: number; 
    offset?: number; 
    patientId?: number;
    status?: string;
    riskLevel?: string;
    startDate?: Date;
    endDate?: Date;
    clinicLocation?: string;
  }): Promise<AssessmentWithPatient[]>;
  getAssessmentsCount(options?: { 
    patientId?: number;
    status?: string;
    riskLevel?: string;
    startDate?: Date;
    endDate?: Date;
    clinicLocation?: string;
  }): Promise<number>;
  getAssessmentById(id: number): Promise<Assessment | undefined>;
  createAssessment(assessment: InsertAssessment): Promise<Assessment>;
  updateAssessment(id: number, assessment: Partial<InsertAssessment>): Promise<Assessment | undefined>;
  getAssessmentsByDateRange(startDate: Date, endDate: Date): Promise<Assessment[]>;
  getRecentAssessments(limit?: number): Promise<AssessmentWithPatient[]>;
  
  // Response operations
  getResponsesByAssessmentId(assessmentId: number): Promise<ResponseWithQuestion[]>;
  createResponse(response: InsertResponse): Promise<Response>;
  updateResponse(id: number, response: Partial<InsertResponse>): Promise<Response | undefined>;
  getFlaggedResponses(): Promise<ResponseWithQuestion[]>;
  getFlaggedResponsesCount(): Promise<number>;
  
  // Question operations
  getQuestions(): Promise<Question[]>;
  getQuestionById(id: number): Promise<Question | undefined>;
  createQuestion(question: InsertQuestion): Promise<Question>;
  
  // Condition operations
  getConditions(): Promise<Condition[]>;
  createCondition(condition: InsertCondition): Promise<Condition>;
  getConditionById(id: number): Promise<Condition | undefined>;
  getTopConditions(limit?: number): Promise<{ condition: string; count: number }[]>;
  
  // Clinic operations
  getClinics(): Promise<Clinic[]>;
  getClinicById(id: number): Promise<Clinic | undefined>;
  createClinic(clinic: InsertClinic): Promise<Clinic>;
  updateClinic(id: number, clinic: Partial<InsertClinic>): Promise<Clinic | undefined>;
  getClinicAssessmentCounts(): Promise<ClinicWithAssessmentCount[]>;
  
  // Communication operations
  getCommunications(): Promise<CommunicationWithPatient[]>;
  createCommunication(communication: InsertCommunication): Promise<Communication>;
  
  // Follow-up operations
  getFollowUps(): Promise<FollowUpWithPatient[]>;
  createFollowUp(followUp: InsertFollowUp): Promise<FollowUp>;

  // Dashboard data
  getCompletedAssessmentsCount(): Promise<number>;
  getWeeklyAssessmentsCount(): Promise<number>;
  getAssessmentsTrend(days?: number): Promise<{ date: string; count: number }[]>;
}

export class DatabaseStorage implements IStorage {
  // Clinic operations
  async getClinics(): Promise<Clinic[]> {
    const clinicsList = await db.select().from(clinics).orderBy(asc(clinics.name));
    return clinicsList;
  }

  async getClinicById(id: number): Promise<Clinic | undefined> {
    const [clinic] = await db.select().from(clinics).where(eq(clinics.id, id));
    return clinic;
  }

  async createClinic(clinicData: InsertClinic): Promise<Clinic> {
    const [clinic] = await db.insert(clinics).values(clinicData).returning();
    return clinic;
  }

  async updateClinic(id: number, clinicData: Partial<InsertClinic>): Promise<Clinic | undefined> {
    const [updatedClinic] = await db
      .update(clinics)
      .set({
        ...clinicData,
        updatedAt: new Date(),
      })
      .where(eq(clinics.id, id))
      .returning();
    return updatedClinic;
  }

  async getClinicAssessmentCounts(): Promise<ClinicWithAssessmentCount[]> {
    const result = await db
      .select({
        clinic: clinics,
        count: sql<number>`count(${assessments.id})::int`.as('assessmentCount'),
      })
      .from(clinics)
      .leftJoin(assessments, eq(clinics.id.toString(), assessments.clinicLocation))
      .groupBy(clinics.id)
      .orderBy(desc(sql`assessmentCount`));
      
    return result.map(row => ({
      ...row.clinic,
      assessmentCount: row.count
    }));
  }
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Patient operations
  async getPatients(options?: { limit?: number; offset?: number; search?: string }): Promise<Patient[]> {
    let query = db.select().from(patients);
    
    if (options?.search) {
      query = query.where(
        or(
          like(patients.name, `%${options.search}%`),
          like(patients.email, `%${options.search}%`),
          like(patients.phone, `%${options.search}%`)
        )
      );
    }
    
    query = query.orderBy(desc(patients.createdAt));
    
    if (options?.limit) {
      query = query.limit(options.limit);
    }
    
    if (options?.offset) {
      query = query.offset(options.offset);
    }
    
    return await query;
  }

  async getPatientsCount(search?: string): Promise<number> {
    let query = db.select({ count: count() }).from(patients);
    
    if (search) {
      query = query.where(
        or(
          like(patients.name, `%${search}%`),
          like(patients.email, `%${search}%`),
          like(patients.phone, `%${search}%`)
        )
      );
    }
    
    const [result] = await query;
    return result?.count || 0;
  }

  async getPatientById(id: number): Promise<Patient | undefined> {
    const [patient] = await db.select().from(patients).where(eq(patients.id, id));
    return patient;
  }

  async getPatientByEmail(email: string): Promise<Patient | undefined> {
    const [patient] = await db.select().from(patients).where(eq(patients.email, email));
    return patient;
  }

  async createPatient(patientData: InsertPatient): Promise<Patient> {
    const [patient] = await db.insert(patients).values(patientData).returning();
    return patient;
  }

  async updatePatient(id: number, patientData: Partial<InsertPatient>): Promise<Patient | undefined> {
    const [patient] = await db
      .update(patients)
      .set({ ...patientData, updatedAt: new Date() })
      .where(eq(patients.id, id))
      .returning();
    return patient;
  }

  // Assessment operations
  async getAssessments(options?: { 
    limit?: number; 
    offset?: number; 
    patientId?: number;
    status?: string;
    riskLevel?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<AssessmentWithPatient[]> {
    let query = db.select({
      assessment: assessments,
      patient: patients,
    })
    .from(assessments)
    .innerJoin(patients, eq(assessments.patientId, patients.id));
    
    const conditions = [];
    
    if (options?.patientId) {
      conditions.push(eq(assessments.patientId, options.patientId));
    }
    
    if (options?.status) {
      conditions.push(eq(assessments.status, options.status));
    }
    
    if (options?.riskLevel) {
      conditions.push(eq(assessments.riskLevel, options.riskLevel));
    }
    
    if (options?.startDate && options?.endDate) {
      conditions.push(between(assessments.completedAt, options.startDate, options.endDate));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    query = query.orderBy(desc(assessments.completedAt));
    
    if (options?.limit) {
      query = query.limit(options.limit);
    }
    
    if (options?.offset) {
      query = query.offset(options.offset);
    }
    
    const results = await query;
    
    return results.map(({ assessment, patient }) => ({
      ...assessment,
      patient,
    }));
  }

  async getAssessmentsCount(options?: { 
    patientId?: number;
    status?: string;
    riskLevel?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<number> {
    let query = db.select({ count: count() }).from(assessments);
    
    const conditions = [];
    
    if (options?.patientId) {
      conditions.push(eq(assessments.patientId, options.patientId));
    }
    
    if (options?.status) {
      conditions.push(eq(assessments.status, options.status));
    }
    
    if (options?.riskLevel) {
      conditions.push(eq(assessments.riskLevel, options.riskLevel));
    }
    
    if (options?.startDate && options?.endDate) {
      conditions.push(between(assessments.completedAt, options.startDate, options.endDate));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    const [result] = await query;
    return result?.count || 0;
  }

  async getAssessmentById(id: number): Promise<Assessment | undefined> {
    const [assessment] = await db.select().from(assessments).where(eq(assessments.id, id));
    return assessment;
  }

  async createAssessment(assessmentData: InsertAssessment): Promise<Assessment> {
    const [assessment] = await db.insert(assessments).values(assessmentData).returning();
    return assessment;
  }

  async updateAssessment(id: number, assessmentData: Partial<InsertAssessment>): Promise<Assessment | undefined> {
    const [assessment] = await db
      .update(assessments)
      .set({ ...assessmentData, updatedAt: new Date() })
      .where(eq(assessments.id, id))
      .returning();
    return assessment;
  }

  async getAssessmentsByDateRange(startDate: Date, endDate: Date): Promise<Assessment[]> {
    return await db
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
    try {
      // Explicitly select only the fields we need to avoid schema mismatch errors
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
            updatedAt: assessments.updatedAt
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
      // Return empty array if there's an error with the query
      return [];
    }
  }

  // Response operations
  async getResponsesByAssessmentId(assessmentId: number): Promise<ResponseWithQuestion[]> {
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
    const [response] = await db.insert(responses).values(responseData).returning();
    return response;
  }

  async updateResponse(id: number, responseData: Partial<InsertResponse>): Promise<Response | undefined> {
    const [response] = await db
      .update(responses)
      .set(responseData)
      .where(eq(responses.id, id))
      .returning();
    return response;
  }

  async getFlaggedResponses(): Promise<ResponseWithQuestion[]> {
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
    const [result] = await db
      .select({ count: count() })
      .from(responses)
      .where(eq(responses.flagged, true));
    return result?.count || 0;
  }

  // Question operations
  async getQuestions(): Promise<Question[]> {
    return await db.select().from(questions).orderBy(asc(questions.order));
  }

  async getQuestionById(id: number): Promise<Question | undefined> {
    const [question] = await db.select().from(questions).where(eq(questions.id, id));
    return question;
  }

  async createQuestion(questionData: InsertQuestion): Promise<Question> {
    const [question] = await db.insert(questions).values(questionData).returning();
    return question;
  }

  // Condition operations
  async getConditions(): Promise<Condition[]> {
    return await db.select().from(conditions).orderBy(asc(conditions.name));
  }

  async createCondition(conditionData: InsertCondition): Promise<Condition> {
    const [condition] = await db.insert(conditions).values(conditionData).returning();
    return condition;
  }

  async getConditionById(id: number): Promise<Condition | undefined> {
    const [condition] = await db.select().from(conditions).where(eq(conditions.id, id));
    return condition;
  }

  async getTopConditions(limit = 5): Promise<{ condition: string; count: number }[]> {
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

  // Dashboard data
  async getCompletedAssessmentsCount(): Promise<number> {
    const [result] = await db
      .select({ count: count() })
      .from(assessments)
      .where(eq(assessments.status, 'completed'));
    return result?.count || 0;
  }

  async getWeeklyAssessmentsCount(): Promise<number> {
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
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);
    
    const results = await db
      .select({
        date: sql`DATE(${assessments.completedAt})`,
        count: count(),
      })
      .from(assessments)
      .where(sql`${assessments.completedAt} >= ${startDate}`)
      .groupBy(sql`DATE(${assessments.completedAt})`)
      .orderBy(asc(sql`DATE(${assessments.completedAt})`));
    
    // Format dates as YYYY-MM-DD for consistency
    return results.map(({ date, count }) => ({
      date: new Date(date).toISOString().split('T')[0],
      count,
    }));
  }

  // Communication operations
  async getCommunications(): Promise<CommunicationWithPatient[]> {
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

  // Follow-up operations
  async getFollowUps(): Promise<FollowUpWithPatient[]> {
    const result = await db
      .select()
      .from(followUps)
      .leftJoin(patients, eq(followUps.patientId, patients.id))
      .orderBy(desc(followUps.scheduledFor));
    
    return result.map(row => ({
      ...row.followUps,
      patient: row.patients!
    }));
  }

  async createFollowUp(followUpData: InsertFollowUp): Promise<FollowUp> {
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
}

export const storage = new DatabaseStorage();
