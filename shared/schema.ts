import {
  pgTable,
  text,
  serial,
  timestamp,
  varchar,
  jsonb,
  index,
  integer,
  boolean,
  primaryKey,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role").default("client").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Patient table
export const patients = pgTable("patients", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  email: varchar("email").unique(),
  phone: varchar("phone"),
  dateOfBirth: timestamp("date_of_birth"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Assessment table - records each chatbot interaction
export const assessments = pgTable("assessments", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull().references(() => patients.id),
  completedAt: timestamp("completed_at"),
  status: varchar("status").default("in_progress").notNull(), // in_progress, completed, flagged, in_review
  riskLevel: varchar("risk_level"), // low, medium, high
  primaryConcern: varchar("primary_concern"),
  score: integer("score"), // numeric score from the assessment
  clinicLocation: varchar("clinic_location"), // stores the selected clinic location from chatbot
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Questions table - represents questions asked by the chatbot
export const questions = pgTable("questions", {
  id: serial("id").primaryKey(),
  text: text("text").notNull(),
  category: varchar("category"),
  order: integer("order"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Responses table - patients' responses to questions
export const responses = pgTable("responses", {
  id: serial("id").primaryKey(),
  assessmentId: integer("assessment_id").notNull().references(() => assessments.id),
  questionId: integer("question_id").notNull().references(() => questions.id),
  answer: text("answer"),
  flagged: boolean("flagged").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Define common conditions/issues
export const conditions = pgTable("conditions", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Clinics table - stores FootCare Clinic locations
export const clinics = pgTable("clinics", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  address: varchar("address").notNull(),
  city: varchar("city").notNull(), 
  state: varchar("state"),
  zipCode: varchar("zip_code"),
  latitude: varchar("latitude").notNull(),
  longitude: varchar("longitude").notNull(),
  phone: varchar("phone"),
  email: varchar("email"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Map conditions to assessments (many-to-many)
export const assessmentConditions = pgTable("assessment_conditions", {
  assessmentId: integer("assessment_id").notNull().references(() => assessments.id),
  conditionId: integer("condition_id").notNull().references(() => conditions.id),
}, (t) => ({
  pk: primaryKey(t.assessmentId, t.conditionId),
}));

// Define relations
export const patientsRelations = relations(patients, ({ many }) => ({
  assessments: many(assessments),
}));

export const clinicsRelations = relations(clinics, ({ many }) => ({
  assessments: many(assessments),
}));

export const assessmentsRelations = relations(assessments, ({ one, many }) => ({
  patient: one(patients, {
    fields: [assessments.patientId],
    references: [patients.id],
  }),
  responses: many(responses),
  conditions: many(assessmentConditions, {
    fields: [assessments.id],
    references: [assessmentConditions.assessmentId],
  }),
  clinic: one(clinics, {
    fields: [assessments.clinicLocation],
    references: [clinics.id], 
  }),
}));

export const responsesRelations = relations(responses, ({ one }) => ({
  assessment: one(assessments, {
    fields: [responses.assessmentId],
    references: [assessments.id],
  }),
  question: one(questions, {
    fields: [responses.questionId],
    references: [questions.id],
  }),
}));

export const questionsRelations = relations(questions, ({ many }) => ({
  responses: many(responses),
}));

export const conditionsRelations = relations(conditions, ({ many }) => ({
  assessments: many(assessmentConditions, {
    fields: [conditions.id],
    references: [assessmentConditions.conditionId],
  }),
}));

export const assessmentConditionsRelations = relations(assessmentConditions, ({ one }) => ({
  assessment: one(assessments, {
    fields: [assessmentConditions.assessmentId],
    references: [assessments.id],
  }),
  condition: one(conditions, {
    fields: [assessmentConditions.conditionId],
    references: [conditions.id],
  }),
}));

// Insert Schemas
export const insertUserSchema = createInsertSchema(users);
export const insertPatientSchema = createInsertSchema(patients).pick({
  name: true,
  email: true,
  phone: true,
  dateOfBirth: true,
});
export const insertAssessmentSchema = createInsertSchema(assessments).pick({
  patientId: true,
  status: true,
  riskLevel: true,
  primaryConcern: true,
  completedAt: true,
  score: true,
  clinicLocation: true,
});
export const insertResponseSchema = createInsertSchema(responses).pick({
  assessmentId: true,
  questionId: true,
  answer: true,
  flagged: true,
});
export const insertQuestionSchema = createInsertSchema(questions).pick({
  text: true,
  category: true,
  order: true,
});
export const insertConditionSchema = createInsertSchema(conditions).pick({
  name: true,
  description: true,
});
export const insertClinicSchema = createInsertSchema(clinics).pick({
  name: true,
  address: true,
  city: true,
  state: true,
  zipCode: true,
  latitude: true,
  longitude: true,
  phone: true,
  email: true,
  isActive: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertPatient = z.infer<typeof insertPatientSchema>;
export type Patient = typeof patients.$inferSelect;
export type InsertAssessment = z.infer<typeof insertAssessmentSchema>;
export type Assessment = typeof assessments.$inferSelect;
export type AssessmentWithPatient = Assessment & { patient: Patient };
export type InsertResponse = z.infer<typeof insertResponseSchema>;
export type Response = typeof responses.$inferSelect;
export type ResponseWithQuestion = Response & { question: Question };
export type InsertQuestion = z.infer<typeof insertQuestionSchema>;
export type Question = typeof questions.$inferSelect;
export type InsertCondition = z.infer<typeof insertConditionSchema>;
export type Condition = typeof conditions.$inferSelect;
export type InsertClinic = z.infer<typeof insertClinicSchema>;
export type Clinic = typeof clinics.$inferSelect;
export type ClinicWithAssessmentCount = Clinic & { assessmentCount: number };
