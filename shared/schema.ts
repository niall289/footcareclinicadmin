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
  pgEnum
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";
// Basic validation schemas
export const nameSchema = z.string().min(2, { message: "Name must be at least 2 characters long." });
export const phoneSchema = z.string().min(10, { message: "Phone number must be at least 10 digits." }).max(15, { message: "Phone number cannot exceed 15 digits." });
export const emailSchema = z.string().email({ message: "Invalid email address." });

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
  age: integer("age"),
  gender: varchar("gender"), // Male, Female, Other
  insuranceType: varchar("insurance_type"), // HSE Public, Private Insurance, Self-Pay, DPS Medical Card
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

// Patient communication tables
export const communications = pgTable("communications", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull().references(() => patients.id),
  type: varchar("type", { length: 50 }).notNull(), // 'email', 'sms', 'message', 'call'
  subject: varchar("subject", { length: 255 }),
  message: text("message").notNull(),
  sentBy: varchar("sent_by", { length: 100 }).notNull(), // staff member name
  status: varchar("status", { length: 50 }).default("sent"), // 'sent', 'delivered', 'read', 'failed'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const followUps = pgTable("follow_ups", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull().references(() => patients.id),
  assessmentId: integer("assessment_id").references(() => assessments.id),
  type: varchar("type", { length: 50 }).notNull(), // 'appointment', 'call', 'check_in'
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  scheduledFor: timestamp("scheduled_for").notNull(),
  status: varchar("status", { length: 50 }).default("pending"), // 'pending', 'completed', 'cancelled'
  assignedTo: varchar("assigned_to", { length: 100 }),
  createdBy: varchar("created_by", { length: 100 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Consultations table - matches your chatbot's exact data structure
export const consultations = pgTable("consultations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  preferred_clinic: text("preferred_clinic"),
  issue_category: text("issue_category"),
  issue_specifics: text("issue_specifics"),
  symptom_description: text("symptom_description"),
  previous_treatment: text("previous_treatment"),
  has_image: text("has_image"),
  image_path: text("image_path"),
  image_analysis: text("image_analysis"),
  calendar_booking: text("calendar_booking"),
  booking_confirmation: text("booking_confirmation"),
  final_question: text("final_question"),
  additional_help: text("additional_help"),
  emoji_survey: text("emoji_survey"),
  survey_response: text("survey_response"),
  conversation_log: jsonb("conversation_log"),
  completed_steps: jsonb("completed_steps"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Enum for Chatbot Tone
export const chatbotToneEnum = pgEnum('chatbot_tone', ['Friendly', 'Professional', 'Clinical', 'Casual']);

// Chatbot Settings table
export const chatbotSettings = pgTable("chatbot_settings", {
  id: serial("id").primaryKey(), // Assuming a single row for settings
  welcomeMessage: text("welcome_message").default("Hello! How can I help you with your foot care needs today?"),
  botDisplayName: varchar("bot_display_name").default("Fiona - FootCare Assistant"),
  ctaButtonLabel: varchar("cta_button_label").default("Ask Fiona"),
  chatbotTone: chatbotToneEnum("chatbot_tone").default("Friendly"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Define relations
export const patientsRelations = relations(patients, ({ many }) => ({
  assessments: many(assessments),
  communications: many(communications),
  followUps: many(followUps),
}));

export const communicationsRelations = relations(communications, ({ one }) => ({
  patient: one(patients, {
    fields: [communications.patientId],
    references: [patients.id],
  }),
}));

export const followUpsRelations = relations(followUps, ({ one }) => ({
  patient: one(patients, {
    fields: [followUps.patientId],
    references: [patients.id],
  }),
  assessment: one(assessments, {
    fields: [followUps.assessmentId],
    references: [assessments.id],
  }),
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
  conditions: many(assessmentConditions), // Corrected: Join table handles the linking
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
  assessments: many(assessmentConditions), // Corrected: Join table handles the linking
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
export const insertChatbotSettingsSchema = createInsertSchema(chatbotSettings, {
  // Override specific fields if needed, e.g., for custom validation with Zod
  welcomeMessage: z.string().min(10, { message: "Welcome message must be at least 10 characters long." }).optional(),
  botDisplayName: z.string().min(3, { message: "Bot display name must be at least 3 characters long." }).optional(),
  ctaButtonLabel: z.string().min(3, { message: "CTA button label must be at least 3 characters long." }).optional(),
  // chatbotTone will be validated by the enum
}).pick({
  welcomeMessage: true,
  botDisplayName: true,
  ctaButtonLabel: true,
  chatbotTone: true,
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
export const insertCommunicationSchema = createInsertSchema(communications).pick({
  patientId: true,
  type: true,
  subject: true,
  message: true,
  sentBy: true,
  status: true,
});
export const insertFollowUpSchema = createInsertSchema(followUps).pick({
  patientId: true,
  assessmentId: true,
  type: true,
  title: true,
  description: true,
  scheduledFor: true,
  status: true,
  assignedTo: true,
  createdBy: true,
});

export type InsertClinic = z.infer<typeof insertClinicSchema>;
export type Clinic = typeof clinics.$inferSelect;
export type ClinicWithAssessmentCount = Clinic & { assessmentCount: number };
export type InsertCommunication = z.infer<typeof insertCommunicationSchema>;
export type Communication = typeof communications.$inferSelect;
export type CommunicationWithPatient = Communication & { patient: Patient };
export type InsertFollowUp = z.infer<typeof insertFollowUpSchema>;
export type FollowUp = typeof followUps.$inferSelect;
export type FollowUpWithPatient = FollowUp & { patient: Patient };

// Consultation types - matching your chatbot's exact structure
export const insertConsultationSchema = createInsertSchema(consultations);
export type InsertConsultation = z.infer<typeof insertConsultationSchema>;
export type Consultation = typeof consultations.$inferSelect;

export type InsertChatbotSettings = z.infer<typeof insertChatbotSettingsSchema>;
export type ChatbotSettings = typeof chatbotSettings.$inferSelect;
