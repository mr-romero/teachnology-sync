
import { Lesson, LessonSlide, StudentProgress } from '@/types/lesson';

export const sampleLessons: Lesson[] = [
  {
    id: '1',
    title: 'Introduction to Quadratic Equations',
    createdBy: '1', // Teacher ID
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    slides: [
      {
        id: 'slide1',
        title: 'What are Quadratic Equations?',
        blocks: [
          {
            id: 'block1',
            type: 'text',
            content: 'A quadratic equation is a second-order polynomial equation in a single variable x with the form: ax² + bx + c = 0, where a ≠ 0.'
          },
          {
            id: 'block2',
            type: 'image',
            url: 'https://placehold.co/600x400?text=Quadratic+Equation+Graph',
            alt: 'A graph showing a parabola representing a quadratic equation'
          }
        ]
      },
      {
        id: 'slide2',
        title: 'Solving Quadratic Equations',
        blocks: [
          {
            id: 'block3',
            type: 'text',
            content: 'Quadratic equations can be solved using the quadratic formula: x = (-b ± √(b² - 4ac)) / 2a'
          },
          {
            id: 'block4',
            type: 'graph',
            equation: 'y = x^2 - 2x - 3',
            settings: {
              xMin: -5,
              xMax: 5,
              yMin: -10,
              yMax: 10
            }
          }
        ]
      },
      {
        id: 'slide3',
        title: 'Practice Questions',
        blocks: [
          {
            id: 'block5',
            type: 'question',
            questionType: 'multiple-choice',
            question: 'What are the solutions to x² - 5x + 6 = 0?',
            options: ['x = 2 and x = 3', 'x = -2 and x = -3', 'x = 2 and x = -3', 'x = -2 and x = 3'],
            correctAnswer: 'x = 2 and x = 3'
          },
          {
            id: 'block6',
            type: 'question',
            questionType: 'true-false',
            question: 'The graph of a quadratic equation is always a straight line.',
            correctAnswer: false
          }
        ]
      }
    ]
  },
  {
    id: '2',
    title: 'Basic Geometry: Triangles and Circles',
    createdBy: '1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    slides: [
      {
        id: 'slide1',
        title: 'Types of Triangles',
        blocks: [
          {
            id: 'block1',
            type: 'text',
            content: 'Triangles can be classified by their sides (scalene, isosceles, equilateral) or by their angles (acute, right, obtuse).'
          }
        ]
      },
      {
        id: 'slide2',
        title: 'Circle Properties',
        blocks: [
          {
            id: 'block2',
            type: 'text',
            content: 'The area of a circle is πr², where r is the radius.'
          }
        ]
      }
    ]
  }
];

export const mockStudentProgress: StudentProgress[] = [
  {
    studentId: '2',
    studentName: 'Alex Student',
    lessonId: '1',
    currentSlide: 'slide2',
    completedBlocks: ['block1', 'block2', 'block3'],
    responses: [
      {
        studentId: '2',
        studentName: 'Alex Student',
        lessonId: '1',
        slideId: 'slide3',
        blockId: 'block5',
        response: 'x = 2 and x = 3',
        isCorrect: true,
        timestamp: new Date().toISOString()
      }
    ]
  }
];
