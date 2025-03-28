
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

export interface LessonSlide {
  id: string;
  title: string;
  blocks: LessonBlock[];
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
