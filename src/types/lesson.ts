export type QuestionType = 'multiple-choice' | 'free-response' | 'true-false';

export interface BaseBlock {
  id: string;
  type: string;
}

export interface TextBlock extends BaseBlock {
  type: 'text';
  content: string;
}

export interface ImageBlock extends BaseBlock {
  type: 'image';
  url: string;
  alt: string;
  storagePath?: string; // Add storagePath for Supabase Storage reference
}

export interface QuestionBlock extends BaseBlock {
  type: 'question';
  questionType: QuestionType;
  question: string;
  options?: string[];
  correctAnswer?: string | number | boolean;  // Updated to include boolean
}

export interface GraphBlock extends BaseBlock {
  type: 'graph';
  equation: string;
  settings: {
    xMin: number;
    xMax: number;
    yMin: number;
    yMax: number;
  };
}

export type LessonBlock = TextBlock | ImageBlock | QuestionBlock | GraphBlock;

// Define a grid position type
export interface GridPosition {
  row: number;
  column: number;
}

export interface LessonSlide {
  id: string;
  title: string;
  blocks: LessonBlock[];
  layout?: SlideLayout; // Optional layout configuration
}

// Updated slide layout interface with grid-based positioning
export interface SlideLayout {
  // Grid-based positioning (new system)
  gridRows?: number;  // Number of rows in the grid
  gridColumns?: number;  // Number of columns in the grid
  blockPositions?: Record<string, GridPosition>;  // Map of blockId to grid position
  blockSizes?: Record<string, { width: string, height: string }>;  // Map of blockId to sizes
  
  // Legacy column-based positioning (keeping for backward compatibility)
  columnCount?: number;  // Number of columns (1-4)
  columnWidths?: number[];  // Array of percentages (should sum to 100)
  blockAssignments?: Record<string, number>;  // Map of blockId to column index
}

export interface Lesson {
  id: string;
  title: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  slides: LessonSlide[];
}

export interface StudentResponse {
  studentId: string;
  studentName: string;
  lessonId: string;
  slideId: string;
  blockId: string;
  response: string | number | boolean;  // Updated to include boolean
  isCorrect?: boolean;
  timestamp: string;
}

export interface StudentProgress {
  studentId: string;
  studentName: string;
  lessonId: string;
  currentSlide: string;
  completedBlocks: string[];
  responses: StudentResponse[];
}

export interface LessonData {
  id: string;
  title: string;
  description?: string;
  slides: LessonSlide[];
}
