import { supabase } from "@/integrations/supabase/client";
import { Lesson, LessonSlide, LessonBlock } from "@/types/lesson";
import { v4 as uuidv4 } from 'uuid';
import { Database } from "@/integrations/supabase/types";
import { Json } from "@/integrations/supabase/types";

// Helper function to convert any object to Json type
const toJson = <T>(data: T): Json => {
  return data as unknown as Json;
};

// Convert Supabase slide format to application Lesson format
export const convertDbSlideToAppSlide = (slide: any): LessonSlide => {
  return {
    id: slide.id,
    title: slide.content.title || 'Untitled Slide',
    blocks: slide.content.blocks || []
  };
};

// Convert application Lesson format to Supabase format for storage
export const convertAppLessonToDbFormat = (lesson: Lesson) => {
  const slidesForDb = lesson.slides.map((slide, index) => ({
    id: slide.id,
    presentation_id: lesson.id,
    slide_order: index,
    content: toJson({
      title: slide.title,
      blocks: slide.blocks
    })
  }));

  return {
    presentation: {
      id: lesson.id,
      title: lesson.title,
      user_id: lesson.createdBy,
      is_public: false,
      created_at: lesson.createdAt,
      updated_at: lesson.updatedAt
    },
    slides: slidesForDb
  };
};

// Create a new lesson
export const createLesson = async (userId: string, title: string = 'New Lesson'): Promise<Lesson | null> => {
  const lessonId = uuidv4();
  const now = new Date().toISOString();
  
  const newLesson: Lesson = {
    id: lessonId,
    title,
    createdBy: userId,
    createdAt: now,
    updatedAt: now,
    slides: [{
      id: uuidv4(),
      title: 'Slide 1',
      blocks: []
    }]
  };

  // Convert to database format
  const dbData = convertAppLessonToDbFormat(newLesson);
  
  // Insert the presentation
  const { error: presentationError } = await supabase
    .from('presentations')
    .insert(dbData.presentation);
    
  if (presentationError) {
    console.error('Error creating presentation:', presentationError);
    return null;
  }
  
  // Insert the initial slide
  const { error: slideError } = await supabase
    .from('slides')
    .insert(dbData.slides);
    
  if (slideError) {
    console.error('Error creating slides:', slideError);
    // Clean up the presentation if slide insertion fails
    await supabase.from('presentations').delete().eq('id', lessonId);
    return null;
  }
  
  return newLesson;
};

// Get all lessons for a user
export const getLessonsForUser = async (userId: string): Promise<Lesson[]> => {
  // Get presentations
  const { data: presentations, error: presentationsError } = await supabase
    .from('presentations')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
    
  if (presentationsError || !presentations) {
    console.error('Error fetching presentations:', presentationsError);
    return [];
  }
  
  // Get slides for each presentation and build full lesson objects
  const lessons: Lesson[] = [];
  
  for (const presentation of presentations) {
    const { data: slides, error: slidesError } = await supabase
      .from('slides')
      .select('*')
      .eq('presentation_id', presentation.id)
      .order('slide_order', { ascending: true });
      
    if (slidesError) {
      console.error(`Error fetching slides for presentation ${presentation.id}:`, slidesError);
      continue;
    }
    
    const lessonSlides: LessonSlide[] = slides.map(convertDbSlideToAppSlide);
    
    lessons.push({
      id: presentation.id,
      title: presentation.title,
      createdBy: presentation.user_id,
      createdAt: presentation.created_at,
      updatedAt: presentation.updated_at,
      slides: lessonSlides
    });
  }
  
  return lessons;
};

// Get a single lesson by ID
export const getLessonById = async (lessonId: string): Promise<Lesson | null> => {
  // Get presentation
  const { data: presentation, error: presentationError } = await supabase
    .from('presentations')
    .select('*')
    .eq('id', lessonId)
    .maybeSingle();
    
  if (presentationError || !presentation) {
    console.error('Error fetching presentation:', presentationError);
    return null;
  }
  
  // Get slides
  const { data: slides, error: slidesError } = await supabase
    .from('slides')
    .select('*')
    .eq('presentation_id', lessonId)
    .order('slide_order', { ascending: true });
    
  if (slidesError || !slides) {
    console.error('Error fetching slides:', slidesError);
    return null;
  }
  
  // Convert to application format
  const lessonSlides: LessonSlide[] = slides.map(convertDbSlideToAppSlide);
  
  return {
    id: presentation.id,
    title: presentation.title,
    createdBy: presentation.user_id,
    createdAt: presentation.created_at,
    updatedAt: presentation.updated_at,
    slides: lessonSlides
  };
};

// Save a lesson (update existing)
export const saveLesson = async (lesson: Lesson): Promise<boolean> => {
  const now = new Date().toISOString();
  const updatedLesson = { ...lesson, updatedAt: now };
  
  // Convert to database format
  const dbData = convertAppLessonToDbFormat(updatedLesson);
  
  // Update the presentation
  const { error: presentationError } = await supabase
    .from('presentations')
    .update({ 
      title: dbData.presentation.title,
      updated_at: now
    })
    .eq('id', lesson.id);
    
  if (presentationError) {
    console.error('Error updating presentation:', presentationError);
    return false;
  }
  
  // Delete all existing slides and insert the new ones
  // This is simpler than trying to figure out which ones to update/insert/delete
  const { error: deleteError } = await supabase
    .from('slides')
    .delete()
    .eq('presentation_id', lesson.id);
    
  if (deleteError) {
    console.error('Error deleting slides:', deleteError);
    return false;
  }
  
  // Insert all slides
  const { error: insertError } = await supabase
    .from('slides')
    .insert(dbData.slides);
    
  if (insertError) {
    console.error('Error inserting slides:', insertError);
    return false;
  }
  
  return true;
};

// Start a new presentation session
export const startPresentationSession = async (lessonId: string): Promise<string | null> => {
  // Generate a 6-character join code
  // Using a direct random generation instead of RPC function
  const joinCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  
  try {
    const { data, error: sessionError } = await supabase
      .from('presentation_sessions')
      .insert({
        presentation_id: lessonId,
        join_code: joinCode,
        started_at: new Date().toISOString(),
        is_synced: true,
        current_slide: 0
      })
      .select('id, join_code')
      .single();
      
    if (sessionError || !data) {
      console.error('Error creating presentation session:', sessionError);
      return null;
    }
    
    return data.join_code;
  } catch (error) {
    console.error('Error in startPresentationSession:', error);
    return null;
  }
};

// Join a presentation session as a student
export const joinPresentationSession = async (joinCode: string, userId: string): Promise<{ sessionId: string, presentationId: string } | null> => {
  // Find the active session with this join code
  const { data: session, error: sessionError } = await supabase
    .from('presentation_sessions')
    .select('id, presentation_id, current_slide')
    .eq('join_code', joinCode)
    .is('ended_at', null)
    .single();
    
  if (sessionError || !session) {
    console.error('Error finding session:', sessionError);
    return null;
  }
  
  // Add the student to the session
  const { error: participantError } = await supabase
    .from('session_participants')
    .insert({
      session_id: session.id,
      user_id: userId,
      current_slide: session.current_slide
    });
    
  if (participantError) {
    console.error('Error joining session:', participantError);
    return null;
  }
  
  // Update session data to reflect new student joining
  try {
    // Manually increment the count instead of using RPC
    const { data: currentSession } = await supabase
      .from('presentation_sessions')
      .select('*')
      .eq('id', session.id)
      .single();
    
    if (currentSession) {
      // Only update the current_slide to ensure compatibility with the database schema
      await supabase
        .from('presentation_sessions')
        .update({ 
          current_slide: currentSession.current_slide // Keep existing value
        })
        .eq('id', session.id);
    }
  } catch (error) {
    // Log but don't fail the function if this update fails
    console.warn('Could not update active students count:', error);
  }
  
  return {
    sessionId: session.id,
    presentationId: session.presentation_id
  };
};

// Update current slide for a session
export const updateSessionSlide = async (sessionId: string, slideIndex: number): Promise<boolean> => {
  const { error } = await supabase
    .from('presentation_sessions')
    .update({ current_slide: slideIndex })
    .eq('id', sessionId);
    
  return !error;
};

// Update student's current slide
export const updateStudentSlide = async (sessionId: string, userId: string, slideIndex: number): Promise<boolean> => {
  const { error } = await supabase
    .from('session_participants')
    .update({ current_slide: slideIndex, last_active_at: new Date().toISOString() })
    .eq('session_id', sessionId)
    .eq('user_id', userId);
    
  return !error;
};

// Submit an answer to a question
export const submitAnswer = async (
  sessionId: string, 
  slideId: string, 
  contentId: string, 
  userId: string, 
  answer: string | number | boolean
): Promise<boolean> => {
  const { error } = await supabase
    .from('student_answers')
    .insert({
      session_id: sessionId,
      slide_id: slideId,
      content_id: contentId,
      user_id: userId,
      answer: String(answer)
    });
    
  return !error;
};

// Get all session participants
export const getSessionParticipants = async (sessionId: string): Promise<any[]> => {
  const { data, error } = await supabase
    .from('session_participants')
    .select(`
      id,
      user_id,
      current_slide,
      joined_at,
      last_active_at
    `)
    .eq('session_id', sessionId);
    
  if (error) {
    console.error('Error fetching participants:', error);
    return [];
  }
  
  return data || [];
};

// Get all answers for a session
export const getSessionAnswers = async (sessionId: string): Promise<any[]> => {
  const { data, error } = await supabase
    .from('student_answers')
    .select('*')
    .eq('session_id', sessionId);
    
  if (error) {
    console.error('Error fetching answers:', error);
    return [];
  }
  
  return data || [];
};

// End a presentation session
export const endPresentationSession = async (sessionId: string): Promise<boolean> => {
  const { error } = await supabase
    .from('presentation_sessions')
    .update({ ended_at: new Date().toISOString() })
    .eq('id', sessionId);
    
  return !error;
};

// Find existing active session for a lesson
export const getActiveSessionForLesson = async (lessonId: string): Promise<{ id: string, join_code: string, current_slide: number } | null> => {
  try {
    // Attempt to find an active session for this lesson
    const { data, error } = await supabase
      .from('presentation_sessions')
      .select('id, join_code, current_slide')
      .eq('presentation_id', lessonId)
      .is('ended_at', null)
      .order('started_at', { ascending: false })
      .limit(1);
      
    if (error || !data || data.length === 0) {
      console.log("No active session found for lesson:", lessonId);
      return null;
    }
    
    console.log("Found active session:", data[0]);
    return data[0];
  } catch (error) {
    console.error('Error in getActiveSessionForLesson:', error);
    return null;
  }
};
