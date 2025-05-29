// server/webhooks/chatbot.ts

export const chatStepToField: Record<string, string> = {
  // Welcome & Basic Info
  welcome:              "interaction_start",
  name:                 "patient_name",
  clinic_location:      "clinic_location",
  clinic_info_confirm:  "clinic_info_confirmed",

  // Image Upload & Analysis
  upload_prompt:        "image_upload_prompted",
  image_upload:         "image_file_url",
  image_analysis:       "image_analysis_requested",
  image_analysis_results: "image_analysis_text",

  // Issue Classification
  issue_category:       "issue_type",

  // Pain Details
  pain_specifics:       "pain_presence",
  heel_pain_type:       "pain_heel_type",
  arch_pain_type:       "pain_arch_type",
  ball_foot_pain_type:  "pain_ball_type",
  toe_pain_type:        "pain_toe_type",
  ankle_pain_type:      "pain_ankle_type",
  entire_foot_pain_type:"pain_whole_foot_type",

  // Nail Conditions
  nail_specifics:       "nail_issue_details",

  // Skin Conditions
  skin_specifics:       "skin_issue_general",
  calluses_details:     "calluses_info",
  dry_skin_details:     "dry_skin_info",
  rash_details:         "rash_info",
  warts_details:        "warts_info",
  athletes_foot_details:"athletes_foot_info",

  // Structural Conditions
  structural_specifics: "structural_issue_general",
  bunions_details:      "bunions_info",
  hammer_toes_details:  "hammer_toes_info",
  flat_feet_details:    "flat_feet_info",
  high_arches_details:  "high_arches_info",
  claw_toes_details:    "claw_toes_info",

  // Additional Medical Details
  symptom_description_prompt: "symptom_description_prompted",
  symptom_description:  "symptom_description",
  previous_treatment:    "treatment_history",

  // Booking Flow
  calendar_booking:      "booking_date_requested",
  booking_confirmation:  "booking_confirmed_at",

  // Final Q & Feedback
  final_question:        "final_question_prompted",
  additional_help:       "asked_for_more_help",
  emoji_survey:          "survey_prompted",
  survey_response:       "survey_rating",

  // Wrap-up
  thanks:               "conversation_end",
};

// Question text mapping for proper display
export const stepToQuestionText: Record<string, string> = {
  welcome: "Welcome to FootCare Clinic",
  name: "What is your name?",
  clinic_location: "Which clinic location would you prefer?",
  clinic_info_confirm: "Is this clinic location correct?",
  
  upload_prompt: "Would you like to upload an image of your foot concern?",
  image_upload: "Please upload your image",
  image_analysis: "Would you like AI analysis of your image?",
  image_analysis_results: "Image analysis results",
  
  issue_category: "What type of foot issue are you experiencing?",
  
  pain_specifics: "Are you experiencing pain?",
  heel_pain_type: "What type of heel pain?",
  arch_pain_type: "What type of arch pain?",
  ball_foot_pain_type: "What type of ball of foot pain?",
  toe_pain_type: "What type of toe pain?",
  ankle_pain_type: "What type of ankle pain?",
  entire_foot_pain_type: "What type of whole foot pain?",
  
  nail_specifics: "Please describe your nail condition",
  
  skin_specifics: "What type of skin condition?",
  calluses_details: "Tell us about your calluses",
  dry_skin_details: "Describe your dry skin condition",
  rash_details: "Tell us about the rash",
  warts_details: "Describe the warts",
  athletes_foot_details: "Tell us about the athlete's foot symptoms",
  
  structural_specifics: "What structural issue are you experiencing?",
  bunions_details: "Tell us about your bunions",
  hammer_toes_details: "Describe your hammer toes",
  flat_feet_details: "Tell us about your flat feet",
  high_arches_details: "Describe your high arches",
  claw_toes_details: "Tell us about your claw toes",
  
  symptom_description_prompt: "Please describe your symptoms in detail",
  symptom_description: "Detailed symptom description",
  previous_treatment: "Have you had any previous treatment?",
  
  calendar_booking: "Would you like to book an appointment?",
  booking_confirmation: "Appointment booking confirmation",
  
  final_question: "Is there anything else we can help with?",
  additional_help: "Additional help requested",
  emoji_survey: "How was your experience? (Rate with emoji)",
  survey_response: "Experience rating",
  
  thanks: "Thank you for using FootCare Clinic chatbot"
};

// Helper function to convert chatbot data to structured responses
export function processChatbotData(webhookData: any): {
  patient: any;
  responses: any[];
  clinicLocation: string | null;
  assessment: any;
} {
  const responses: any[] = [];
  let clinicLocation: string | null = null;
  
  // Process each step in the correct order
  const stepOrder = Object.keys(chatStepToField);
  
  for (const step of stepOrder) {
    const fieldName = chatStepToField[step];
    const questionText = stepToQuestionText[step];
    
    if (webhookData[fieldName]) {
      responses.push({
        question: questionText,
        answer: webhookData[fieldName],
        step: step,
        fieldName: fieldName
      });
      
      // Extract clinic location
      if (step === 'clinic_location') {
        clinicLocation = webhookData[fieldName];
      }
    }
  }
  
  // Extract patient info
  const patient = {
    name: webhookData.patient_name || webhookData.name,
    email: webhookData.email || webhookData.patient_email,
    phone: webhookData.phone || webhookData.patient_phone
  };
  
  // Extract assessment info
  const assessment = {
    status: 'completed',
    riskLevel: determineRiskLevel(webhookData),
    primaryConcern: webhookData.issue_type || webhookData.symptom_description,
    imageUrl: webhookData.image_file_url,
    imageAnalysis: webhookData.image_analysis_text
  };
  
  return {
    patient,
    responses,
    clinicLocation,
    assessment
  };
}

function determineRiskLevel(data: any): string {
  // Simple risk assessment based on symptoms
  if (data.pain_presence && data.symptom_description) {
    const symptoms = data.symptom_description.toLowerCase();
    if (symptoms.includes('severe') || symptoms.includes('unbearable') || symptoms.includes('emergency')) {
      return 'high';
    } else if (symptoms.includes('moderate') || symptoms.includes('concerning')) {
      return 'medium';
    }
  }
  return 'low';
}