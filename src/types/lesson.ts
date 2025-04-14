// Import BlockConnection from our new manager
import { BlockConnection } from '@/components/lesson/BlockConnectionManager';

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
  equation?: string;
  equations?: Equation[];
  color?: string;
  settings: {
    xMin: number;
    xMax: number;
    yMin: number;
    yMax: number;
    showGrid?: boolean;
    showAxes?: boolean;
    showXAxis?: boolean;
    showYAxis?: boolean;
    polarMode?: boolean;
    allowPanning?: boolean;
    allowZooming?: boolean;
    backgroundColor?: string;
    xAxisLabel?: string;
    yAxisLabel?: string;
    showCalculator?: boolean; // Add this to control calculator visibility
  };
}

export interface Equation {
  id: string;
  latex: string;
  color: string;
  label?: string;
  showLabel?: boolean;
  pointStyle?: 'POINT' | 'OPEN' | 'CROSS';  // Add explicit style options
  lineStyle?: 'SOLID' | 'DASHED' | 'DOTTED';  // Add explicit style options
  points?: Point[];
  visible?: boolean;
}

export interface Point {
  x: number;
  y: number;
}

export interface AIChatBlock extends BaseBlock {
  type: 'ai-chat';
  instructions: string;
  systemPrompt: string;
  sentenceStarters?: string[];
  targetConclusion?: string;
  apiEndpoint?: string;
  modelName?: string;
  repetitionPrevention?: string;
  maxTokens?: number;
}

// New combo block type that combines question with AI chat feedback
export interface FeedbackQuestionBlock extends BaseBlock {
  type: 'feedback-question';
  questionType: QuestionType;
  questionText: string;
  options?: string[];
  optionStyle?: 'text' | 'A-D' | 'F-J';
  correctAnswer?: string | number | boolean | string[]; // Modified to allow array of strings for multiple correct answers
  allowMultipleAnswers?: boolean; // New property to enable multiple selections
  allowAnswerChange?: boolean;  // Add this property
  imageUrl?: string;
  imageAlt?: string;
  imageStoragePath?: string;
  feedbackInstructions: string;
  feedbackSystemPrompt: string;
  feedbackSentenceStarters: string[];
  apiEndpoint?: string;
  modelName?: string;
  repetitionPrevention?: string;
  // New properties for split functionality
  displayMode?: 'all' | 'image' | 'question' | 'feedback';
  isGrouped?: boolean;
  groupId?: string;
  // New properties for defense mechanism
  requireDefense?: boolean; // Whether to require students to defend their answers
  defensePrompt?: string; // Custom prompt for the defense input
  defenseEvaluationCriteria?: string; // Criteria for evaluating defense quality
}

export type LessonBlock = TextBlock | ImageBlock | QuestionBlock | GraphBlock | AIChatBlock | FeedbackQuestionBlock;

// Define a string for formatting guidance that can be appended to prompts
export const MATH_FORMATTING_GUIDE = `
When responding with mathematical content:
1. Use \\( and \\) for inline math expressions instead of dollar signs (which can be misinterpreted as currency)
2. Use \\[ and \\] for block/display equations
3. For currency values, use the escaped dollar symbol: \\$ followed by the amount
4. Use \\boxed{...} for answers that should be highlighted
5. Use \\text{...} for text within math expressions
6. For multi-line equations, use aligned environments:
   \\begin{aligned}
   equation 1 \\\\
   equation 2 \\\\
   \\end{aligned}

Example:
"The cost of the item is \\$2.50."
"The solution is \\( x = 5 \\)"
"\\[ \\frac{dy}{dx} = 2x \\]"
"The answer is \\boxed{42}."
`;

// Define a grid position type
export interface GridPosition {
  row: number;
  column: number;
}

// Define grid span type for blocks that span multiple cells
export interface GridSpan {
  columnSpan?: number; // Number of columns this block spans (default: 1)
  rowSpan?: number;    // Number of rows this block spans (default: 1)
}

export interface LessonSlide {
  id: string;
  title: string;
  blocks: LessonBlock[];
  layout?: SlideLayout; // Optional layout configuration
  connections?: BlockConnection[];  // Add connections array to store block relationships
}

// Updated slide layout interface with grid-based positioning
export interface SlideLayout {
  // Grid-based positioning (new system)
  gridRows?: number;  // Number of rows in the grid
  gridColumns?: number;  // Number of columns in the grid
  blockPositions?: Record<string, GridPosition>;  // Map of blockId to grid position
  blockSizes?: Record<string, { width: string, height: string }>;  // Map of blockId to sizes
  blockSpans?: Record<string, GridSpan>;  // Map of blockId to column/row span
  
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
  settings?: {
    showCalculator?: boolean;  // Global setting for calculator availability
  };
}

export interface StudentResponse {
  studentId: string;
  studentName: string;
  studentClass?: string; // Add student class information
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
  studentClass?: string; // Add student class information
  lessonId: string;
  currentSlide: number;  // Explicitly typed as number
  completedBlocks: string[];
  responses: StudentResponse[];
  is_active: boolean;  // Add active status flag
} 

export interface LessonData {
  id: string;
  title: string;
  description?: string;
  slides: LessonSlide[];
}
