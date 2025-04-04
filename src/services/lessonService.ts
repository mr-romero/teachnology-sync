import { supabase } from "@/integrations/supabase/client";
import { Lesson, LessonSlide, LessonBlock } from "@/types/lesson";
import { v4 as uuidv4 } from 'uuid';
import { Database } from "@/integrations/supabase/types";
import { Json } from "@/integrations/supabase/types";
import { classroomService } from "@/services/classroomService";

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
  
  // Use type assertion for presentation data
  const dbPresentation = presentation as any;
  
  return {
    id: dbPresentation.id,
    title: dbPresentation.title,
    createdBy: dbPresentation.user_id,
    createdAt: dbPresentation.created_at,
    updatedAt: dbPresentation.updated_at,
    settings: dbPresentation.settings || { showCalculator: true },
    slides: lessonSlides
  };
};

// Save a lesson (update existing)
export const saveLesson = async (lesson: Lesson): Promise<boolean> => {
  try {
    // 1. Update the lesson metadata
    const { error: lessonError } = await supabase
      .from('presentations')
      .update({
        title: lesson.title,
        updated_at: new Date().toISOString(),
        settings: lesson.settings || {}
      })
      .eq('id', lesson.id);

    if (lessonError) {
      console.error('Error updating lesson:', lessonError);
      return false;
    }

    // 2. Get existing slides to determine what needs to be updated/deleted
    const { data: existingSlides, error: existingSlidesError } = await supabase
      .from('slides')
      .select('id')
      .eq('presentation_id', lesson.id);

    if (existingSlidesError) {
      console.error('Error getting existing slides:', existingSlidesError);
      return false;
    }

    const existingSlideIds = new Set(existingSlides.map(slide => slide.id));
    const currentSlideIds = new Set(lesson.slides.map(slide => slide.id));

    // 3. Delete slides that no longer exist
    const slidesToDelete = [...existingSlideIds].filter(id => !currentSlideIds.has(id));
    if (slidesToDelete.length > 0) {
      const { error: deleteError } = await supabase
        .from('slides')
        .delete()
        .in('id', slidesToDelete);

      if (deleteError) {
        console.error('Error deleting slides:', deleteError);
        return false;
      }
    }

    // 4. Upsert current slides
    const slideData = lesson.slides.map((slide, index) => ({
      id: slide.id,
      presentation_id: lesson.id,
      slide_order: index,
      content: slide
    }));

    const { error: upsertError } = await supabase
      .from('slides')
      .upsert(slideData, { 
        onConflict: 'id',
        ignoreDuplicates: false 
      });

    if (upsertError) {
      console.error('Error upserting slides:', upsertError);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Exception in saveLesson:', error);
    return false;
  }
};

// Start a new presentation session
export const startPresentationSession = async (lessonId: string, classroomId?: string): Promise<string | null> => {
  const joinCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  
  try {
    // If we have a classroom ID, get the classroom details first
    let classroomName = null;
    let classroomStudents: any[] = [];
    
    if (classroomId) {
      try {
        // Get all classrooms and find the matching one
        const classrooms = await classroomService.getClassrooms();
        const classroom = classrooms.find(c => c.id === classroomId);
        classroomName = classroom?.name;
        
        // Get students for this classroom
        classroomStudents = await classroomService.getClassroomStudents(classroomId);
      } catch (error) {
        console.error('Error getting classroom details:', error);
        // Continue anyway as this is not critical
      }
    }

    const sessionData = {
      presentation_id: lessonId,
      join_code: joinCode,
      started_at: new Date().toISOString(),
      is_synced: true,
      is_paused: false,
      current_slide: 0,
      classroom_id: classroomId || null,
      classroom_name: classroomName,
      paced_slides: [] // Initialize with empty array
    };

    // Create session and get its ID
    const { data: sessionResult, error: sessionError } = await supabase
      .from('presentation_sessions')
      .insert(sessionData)
      .select('id')
      .single();
      
    if (sessionError || !sessionResult) {
      console.error('Error creating presentation session:', sessionError);
      return null;
    }

    // If we have classroom students, create inactive session participants for them
    if (classroomStudents.length > 0) {
      const participantRecords = classroomStudents.map(student => ({
        session_id: sessionResult.id,
        user_id: student.profileId,
        current_slide: 0,
        is_active: false,
        joined_at: null,
        last_active_at: null
      }));

      // Insert all classroom students as inactive participants
      const { error: participantsError } = await supabase
        .from('session_participants')
        .insert(participantRecords);

      if (participantsError) {
        console.error('Error creating inactive participants:', participantsError);
        // Continue anyway as this is not critical
      }
    }

    return joinCode;
  } catch (error) {
    console.error('Error in startPresentationSession:', error);
    return null;
  }
};

// Join a presentation session as a student
export const joinPresentationSession = async (joinCode: string, userId: string): Promise<{ sessionId: string, presentationId: string } | null> => {
  try {
    // Find the active session with this join code
    const { data: session, error: sessionError } = await supabase
      .from('presentation_sessions')
      .select('id, presentation_id, current_slide, is_synced')
      .eq('join_code', joinCode)
      .is('ended_at', null)
      .single();
      
    if (sessionError || !session) {
      console.error('Error finding session:', sessionError);
      return null;
    }

    // Check for stored position in localStorage
    let initialSlide = session.current_slide;
    if (!session.is_synced) {
      try {
        const storedData = localStorage.getItem(`student_session_${session.id}`);
        if (storedData) {
          const { currentSlideIndex } = JSON.parse(storedData);
          if (typeof currentSlideIndex === 'number' && currentSlideIndex >= 0) {
            initialSlide = currentSlideIndex;
          }
        }
      } catch (e) {
        console.warn('Error reading stored slide position:', e);
      }
    }

    // Add the student to the session or update their record
    const { error: participantError } = await supabase
      .from('session_participants')
      .upsert({
        session_id: session.id,
        user_id: userId,
        current_slide: initialSlide,
        is_active: true,
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
  } catch (error) {
    console.error('Error in joinPresentationSession:', error);
    return null;
  }
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
      const { data: sessionData, error: sessionError } = await supabase
        .from('presentation_sessions')
        .select('is_synced, paced_slides')
        .eq('id', sessionId)
        .single();
        
      if (sessionError) {
        console.error('Error fetching session sync status:', sessionError);
      } else if (sessionData) {
        if (sessionData.is_synced) {
          // If in sync mode, don't update student's position
          console.log('Student attempted to navigate while in sync mode');
          return false;
        }
        
        // If paced slides are enabled, verify this is an allowed slide
        if (sessionData.paced_slides && sessionData.paced_slides.length > 0) {
          if (!sessionData.paced_slides.includes(slideIndex)) {
            console.log('Student attempted to navigate to non-allowed slide');
            return false;
          }
        }
      }
    } catch (checkError) {
      console.warn('Error checking navigation restrictions:', checkError);
    }

    // Update the student's current slide in the database
    const { error } = await supabase
      .from('session_participants')
      .update({ 
        current_slide: slideIndex, 
        last_active_at: new Date().toISOString() 
      })
      .eq('session_id', sessionId)
      .eq('user_id', userId);

    if (!error) {
      // Also update localStorage to keep local state in sync
      try {
        localStorage.setItem(`student_session_${sessionId}`, JSON.stringify({
          currentSlideIndex: slideIndex,
          timestamp: new Date().toISOString()
        }));
      } catch (storageError) {
        console.warn('Error updating localStorage:', storageError);
      }

      return true;
    }

    console.error('Error updating student slide:', error);
    return false;
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
