export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  Tables: {
    presentation_sessions: {
      Row: {
        id: string;
        join_code: string;
        presentation_id: string;
        current_slide: number;
        started_at: string;
        ended_at: string | null;
        is_synced: boolean;
        is_paused: boolean;
        classroom_id: string | null;
        classroom_name: string | null;
        paced_slides: number[];
      };
      Insert: {
        id?: string;
        join_code: string;
        presentation_id: string;
        current_slide?: number;
        started_at?: string;
        ended_at?: string | null;
        is_synced?: boolean;
        is_paused?: boolean;
        classroom_id?: string | null;
        classroom_name?: string | null;
        paced_slides?: number[];
      };
      Update: {
        id?: string;
        join_code?: string;
        presentation_id?: string;
        current_slide?: number;
        started_at?: string;
        ended_at?: string | null;
        is_synced?: boolean;
        is_paused?: boolean;
        classroom_id?: string | null;
        classroom_name?: string | null;
        paced_slides?: number[];
      };
    };
    imported_classrooms: {
      Row: {
        id: number;
        classroom_id: string;
        classroom_name: string;
        teacher_id: string;
        student_count: number;
        created_at: string;
        updated_at: string;
        last_used_at: string | null;
      };
      Insert: {
        id?: number;
        classroom_id: string;
        classroom_name: string;
        teacher_id: string;
        student_count: number;
        created_at?: string;
        updated_at?: string;
        last_used_at?: string | null;
      };
      Update: {
        id?: number;
        classroom_id?: string;
        classroom_name?: string;
        teacher_id?: string;
        student_count?: number;
        created_at?: string;
        updated_at?: string;
        last_used_at?: string | null;
      };
    };
    profiles: {
      Row: {
        id: string;
        full_name: string;
        class: string | null;
        role: 'teacher' | 'student';
        created_at: string;
        updated_at: string;
      };
      Insert: {
        id: string;
        full_name: string;
        class?: string | null;
        role: 'teacher' | 'student';
        created_at?: string;
        updated_at?: string;
      };
      Update: {
        id?: string;
        full_name?: string;
        class?: string | null;
        role?: 'teacher' | 'student';
        created_at?: string;
        updated_at?: string;
      };
    };
    // Add other tables as needed
  };
};

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
