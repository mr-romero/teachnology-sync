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
    blocks: slide.content.blocks || [],
    // Add layout information from the database
    layout: slide.content.layout || undefined
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
      blocks: slide.blocks,
      // Include layout information in the content JSON
      layout: slide.layout || null
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
    settings: {
      showCalculator: true  // Set calculator enabled by default
    },
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
    settings: presentation.settings || { showCalculator: true },  // Include settings with default
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
      updated_at: now,
      settings: lesson.settings || { showCalculator: true }  // Include settings in update
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
export const startPresentationSession = async (lessonId: string, classroomId?: string): Promise<string | null> => {
  // Generate a 6-character join code
  // Using a direct random generation instead of RPC function
  const joinCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  
  try {
    // If classroom ID is provided, get the classroom name
    let classroomName: string | null = null;
    
    if (classroomId) {
      // Look up the classroom name from imported_classrooms table
      const { data, error } = await supabase
        .from('imported_classrooms')
        .select('classroom_name')
        .eq('classroom_id', classroomId)
        .maybeSingle();
        
      if (!error && data && data.classroom_name) {
        classroomName = data.classroom_name;
      }
    }
    
    // Create the session with classroom_id only to ensure backward compatibility
    // The classroom_name column is added via migration but might not exist yet
    const sessionData = {
      presentation_id: lessonId,
      join_code: joinCode,
      started_at: new Date().toISOString(),
      is_synced: true,
      is_paused: false,
      current_slide: 0,
      classroom_id: classroomId || null
    };
    
    // Try to add the classroom_name if we've obtained it
    // If the column doesn't exist yet, this will be safely ignored
    try {
      if (classroomName) {
        const { data, error: testError } = await supabase
          .from('presentation_sessions')
          .insert({ ...sessionData, classroom_name: classroomName })
          .select('id, join_code')
          .single();
          
        if (!testError && data) {
          return data.join_code;
        }
      }
    } catch (nameError) {
      // Column probably doesn't exist yet, continue with basic insert
      console.log('Could not include classroom_name, falling back to basic insert:', nameError);
    }
    
    // Fallback to basic insert without classroom_name
    const { data, error: sessionError } = await supabase
      .from('presentation_sessions')
      .insert(sessionData)
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

  // Add the student to the session or update their record
  const { error: participantError } = await supabase
    .from('session_participants')
    .upsert({
      session_id: session.id,
      user_id: userId,
      current_slide: session.current_slide, // Always use the session's current slide
      joined_at: new Date().toISOString(),
      last_active_at: new Date().toISOString()
    }, {
      onConflict: 'session_id,user_id'
    });
    
  if (participantError) {
    console.error('Error joining session:', participantError);
    return null;
  }
  
  return {
    sessionId: session.id,
    presentationId: session.presentation_id
  };
};

// Update current slide for a session
export const updateSessionSlide = async (sessionId: string, slideIndex: number): Promise<boolean> => {
  try {
    // First update the session's current slide
    const { error: sessionError } = await supabase
      .from('presentation_sessions')
      .update({ current_slide: slideIndex })
      .eq('id', sessionId);

    if (sessionError) {
      console.error('Error updating session slide:', sessionError);
      return false;
    }

    // Check if the session is in sync mode
    const { data: sessionData } = await supabase
      .from('presentation_sessions')
      .select('is_synced')
      .eq('id', sessionId)
      .single();

    // If in sync mode, update all participants to match the new slide position
    if (sessionData?.is_synced) {
      const { error: participantsError } = await supabase
        .from('session_participants')
        .update({ 
          current_slide: slideIndex,
          last_active_at: new Date().toISOString()
        })
        .eq('session_id', sessionId);

      if (participantsError) {
        console.error('Error updating participants slide:', participantsError);
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error('Error in updateSessionSlide:', error);
    return false;
  }
};

// Update student's current slide
export const updateStudentSlide = async (sessionId: string, userId: string, slideIndex: number): Promise<boolean> => {
  try {
    // First, check if the student's navigation should be restricted
    try {
      // Get session data - only request fields we know exist
      const { data: sessionData, error: sessionError } = await supabase
        .from('presentation_sessions')
        .select('is_synced')
        .eq('id', sessionId)
        .single();
        
      if (sessionError) {
        console.error('Error fetching session sync status:', sessionError);
        // Continue anyway to support older database versions
      } else if (sessionData && sessionData.is_synced) {
        // If in sync mode, students shouldn't update their position at all
        console.log('Student attempted to navigate while in sync mode');
        return false;
      }
      
      // Check if paced slides are configured
      // This is a separate query to handle if the column doesn't exist
      try {
        const { data, error } = await supabase.rpc('check_paced_slides', { 
          session_id: sessionId,
          slide_idx: slideIndex
        });
        
        // If the RPC function exists and returns false, slide is not allowed
        if (!error && data === false) {
          console.warn(`Student attempted to navigate to non-allowed slide: ${slideIndex}`);
          return false;
        }
      } catch (rpcError) {
        // RPC function might not exist, just continue
        console.log('Paced slides check not available:', rpcError);
      }
    } catch (checkError) {
      // If any error happens during restriction checks, log it but still
      // allow the update to proceed (fail open for backwards compatibility)
      console.warn('Error checking navigation restrictions:', checkError);
    }
    
    // Update the student's current slide
    const { error } = await supabase
      .from('session_participants')
      .update({ current_slide: slideIndex, last_active_at: new Date().toISOString() })
      .eq('session_id', sessionId)
      .eq('user_id', userId);
      
    return !error;
  } catch (error) {
    console.error('Error in updateStudentSlide:', error);
    return false;
  }
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

// Delete a lesson
export const deleteLesson = async (lessonId: string): Promise<boolean> => {
  try {
    // First, check for active sessions for this lesson
    const { data: activeSessions } = await supabase
      .from('presentation_sessions')
      .select('id')
      .eq('presentation_id', lessonId)
      .is('ended_at', null);
      
    // End any active sessions
    if (activeSessions && activeSessions.length > 0) {
      for (const session of activeSessions) {
        await endPresentationSession(session.id);
      }
    }
    
    // Delete all related slides
    const { error: slidesError } = await supabase
      .from('slides')
      .delete()
      .eq('presentation_id', lessonId);
      
    if (slidesError) {
      console.error('Error deleting slides:', slidesError);
      return false;
    }
    
    // Delete the presentation itself
    const { error: presentationError } = await supabase
      .from('presentations')
      .delete()
      .eq('id', lessonId);
      
    if (presentationError) {
      console.error('Error deleting presentation:', presentationError);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error in deleteLesson:', error);
    return false;
  }
};

// End a presentation session and clean up related data
export const endPresentationSession = async (sessionId: string): Promise<boolean> => {
  try {
    // Mark the session as ended
    const { error: sessionError } = await supabase
      .from('presentation_sessions')
      .update({ ended_at: new Date().toISOString() })
      .eq('id', sessionId);
      
    if (sessionError) {
      console.error('Error ending session:', sessionError);
      return false;
    }
    
    // This ensures old session data doesn't accumulate in the database
    // Note: We don't delete answers as they might be useful for analytics later
    
    // Clean up session participants after a delay to allow for data consistency
    setTimeout(async () => {
      try {
        const { error: participantsError } = await supabase
          .from('session_participants')
          .delete()
          .eq('session_id', sessionId);
          
        if (participantsError) {
          console.error('Error cleaning up session participants:', participantsError);
        }
      } catch (cleanupError) {
        console.error('Error during session cleanup:', cleanupError);
      }
    }, 5000); // 5 second delay to ensure all clients have processed the session end
    
    return true;
  } catch (error) {
    console.error('Error in endPresentationSession:', error);
    return false;
  }
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
