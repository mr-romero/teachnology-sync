import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export interface GoogleClassroom {
  id: string;
  name: string;
  section?: string;
  description?: string;
}

export interface GoogleClassroomStudent {
  id: string;
  name: string;
  email: string;
  profileId: string;
}

export interface GoogleClassroomAssignment {
  id: string;
  title: string;
  description?: string;
  url?: string;
}

export type ImportedClassroom = Database['Tables']['imported_classrooms']['Row'];

// Add this helper function at the top level of the service
async function getValidAccessToken(): Promise<string> {
  const { data: sessionData } = await supabase.auth.getSession();
  
  if (!sessionData.session) {
    throw new Error("No active session found");
  }
  
  let providerToken = sessionData.session.provider_token;
  
  if (!providerToken) {
    // If no provider token, try to refresh the session
    const { data: { session }, error } = await supabase.auth.refreshSession();
    
    if (error || !session?.provider_token) {
      throw new Error("Please re-authenticate with Google");
    }
    
    providerToken = session.provider_token;
  }
  
  return providerToken;
}

/**
 * Service to interact with Google Classroom API
 */
export const classroomService = {
  /**
   * Get all Google Classroom courses for the authenticated teacher
   * @returns Array of classroom courses
   */
  async getClassrooms(): Promise<GoogleClassroom[]> {
    try {
      const providerToken = await getValidAccessToken();
      
      // Fetch classrooms from Google Classroom API
      const response = await fetch('https://classroom.googleapis.com/v1/courses?teacherId=me', {
        headers: {
          'Authorization': `Bearer ${providerToken}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to fetch classrooms: ${errorData.error?.message || response.statusText}`);
      }
      
      const data = await response.json();
      
      return (data.courses || []).map((course: any) => ({
        id: course.id,
        name: course.name,
        section: course.section,
        description: course.description
      }));
    } catch (error: any) {
      console.error("Error fetching Google Classrooms:", error);
      throw error;
    }
  },
  
  /**
   * Get all students for a specific Google Classroom
   * @param classroomId The ID of the Google Classroom
   * @returns Array of students in the classroom
   */
  async getClassroomStudents(classroomId: string): Promise<GoogleClassroomStudent[]> {
    try {
      const providerToken = await getValidAccessToken();
      
      // Fetch students from Google Classroom API
      const response = await fetch(`https://classroom.googleapis.com/v1/courses/${classroomId}/students`, {
        headers: {
          'Authorization': `Bearer ${providerToken}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to fetch classroom students: ${errorData.error?.message || response.statusText}`);
      }
      
      const data = await response.json();
      
      return (data.students || []).map((student: any) => ({
        id: student.userId,
        name: student.profile.name.fullName,
        email: student.profile.emailAddress,
        profileId: student.profile.id
      }));
    } catch (error: any) {
      console.error("Error fetching Google Classroom students:", error);
      throw error;
    }
  },
  
  /**
   * Import students from Google Classroom to the current lesson
   * @param classroomId The ID of the Google Classroom
   * @param lessonId The ID of the lesson to import students into
   * @returns Boolean indicating success
   */
  async importStudentsToLesson(classroomId: string, lessonId: string): Promise<boolean> {
    try {
      // Get students from the classroom
      const students = await this.getClassroomStudents(classroomId);
      
      // Get classroom details
      const classrooms = await this.getClassrooms();
      const classroom = classrooms.find(c => c.id === classroomId);
      
      if (!classroom) {
        throw new Error("Classroom not found");
      }
      
      // Get current user's ID
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("No authenticated user found");
      }
      
      // Store or update imported classroom in the database
      const { data, error } = await supabase
        .from('imported_classrooms')
        .upsert({
          classroom_id: classroomId,
          classroom_name: classroom.name,
          teacher_id: user.id,
          student_count: students.length,
          last_used_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'classroom_id, teacher_id',
          ignoreDuplicates: false
        });
      
      if (error) {
        console.error("Error storing imported classroom:", error);
      }
      
      console.log(`Imported ${students.length} students from classroom ${classroomId} to lesson ${lessonId}`);
      
      // Return true to indicate success
      return true;
    } catch (error: any) {
      console.error("Error importing students to lesson:", error);
      throw error;
    }
  },

  /**
   * Get all previously imported classrooms for the current teacher
   * @returns Array of imported classroom information
   */
  async getImportedClassrooms(): Promise<ImportedClassroom[]> {
    try {
      const { data, error } = await supabase
        .from('imported_classrooms')
        .select('*')
        .order('last_used_at', { ascending: false });
      
      if (error) {
        console.error("Error fetching imported classrooms:", error);
        throw error;
      }
      
      return data || [];
    } catch (error: any) {
      console.error("Error getting imported classrooms:", error);
      throw error;
    }
  },

  /**
   * Update the last used timestamp for an imported classroom
   * @param classroomId The ID of the Google Classroom to update
   */
  async updateClassroomLastUsed(classroomId: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("No authenticated user found");
      }
      
      const { error } = await supabase
        .from('imported_classrooms')
        .update({
          last_used_at: new Date().toISOString()
        })
        .eq('classroom_id', classroomId)
        .eq('teacher_id', user.id);
        
      if (error) {
        console.error("Error updating classroom last used timestamp:", error);
      }
    } catch (error: any) {
      console.error("Error updating classroom last used timestamp:", error);
    }
  },
  
  /**
   * Create a new assignment in Google Classroom for the specified class
   * @param classroomId The ID of the Google Classroom
   * @param title The title of the assignment
   * @param description The description of the assignment
   * @param joinUrl The URL students will use to join the lesson session
   * @returns The created assignment
   */
  async createAssignment(
    classroomId: string, 
    title: string, 
    description: string, 
    joinUrl: string
  ): Promise<GoogleClassroomAssignment> {
    try {
      const providerToken = await getValidAccessToken();
      
      const response = await fetch(`https://classroom.googleapis.com/v1/courses/${classroomId}/courseWork`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${providerToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title,
          description,
          workType: 'ASSIGNMENT',
          state: 'PUBLISHED',
          materials: [
            {
              link: {
                url: joinUrl,
                title: "Join Lesson Session"
              }
            }
          ]
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to create assignment: ${errorData.error?.message || response.statusText}`);
      }
      
      const data = await response.json();
      
      // Update the last used timestamp for this classroom
      await this.updateClassroomLastUsed(classroomId);
      
      return {
        id: data.id,
        title: data.title,
        description: data.description,
        url: data.alternateLink || joinUrl
      };
    } catch (error: any) {
      console.error("Error creating Google Classroom assignment:", error);
      throw error;
    }
  }
};