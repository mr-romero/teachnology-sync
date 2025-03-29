
import React from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { StudentProgress, LessonSlide } from '@/types/lesson';
import { CheckCircle2, XCircle, Circle, HelpCircle, MoreVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StudentProgressGridProps {
  studentProgress: StudentProgress[];
  slides: LessonSlide[];
  anonymousMode: boolean;
}

const StudentProgressGrid: React.FC<StudentProgressGridProps> = ({
  studentProgress,
  slides,
  anonymousMode
}) => {
  // Function to determine the status icon for a particular student and slide
  const getStatusIcon = (student: StudentProgress, slideId: string) => {
    // Check if student has responses for this slide
    const slideResponses = student.responses.filter(response => response.slideId === slideId);
    
    if (!slideResponses.length) {
      // No response for this slide
      return <Circle className="h-4 w-4 text-muted-foreground/40" />;
    }
    
    // Count correct and incorrect responses
    const correctCount = slideResponses.filter(r => r.isCorrect === true).length;
    const incorrectCount = slideResponses.filter(r => r.isCorrect === false).length;
    const unevaluatedCount = slideResponses.filter(r => r.isCorrect === null).length;
    
    // If all responses are correct
    if (correctCount > 0 && incorrectCount === 0 && unevaluatedCount === 0) {
      return <CheckCircle2 className="h-5 w-5 text-green-600" />;
    }
    
    // If all responses are incorrect
    if (incorrectCount > 0 && correctCount === 0 && unevaluatedCount === 0) {
      return <XCircle className="h-5 w-5 text-red-500" />;
    }
    
    // If there are unevaluated responses
    if (unevaluatedCount > 0) {
      return <HelpCircle className="h-5 w-5 text-amber-500" />;
    }
    
    // Mixed responses (some correct, some incorrect)
    return (
      <div className="flex items-center">
        <CheckCircle2 className="h-4 w-4 text-green-600 mr-1" />
        <XCircle className="h-4 w-4 text-red-500" />
      </div>
    );
  };

  return (
    <div className="relative overflow-auto border rounded-lg">
      <Table>
        <TableHeader className="sticky top-0 bg-background z-10">
          <TableRow>
            <TableHead className="sticky left-0 bg-background z-20 min-w-[200px]">Student</TableHead>
            {slides.map((slide, index) => (
              <TableHead key={slide.id} className="text-center min-w-[100px]">
                Slide {index + 1}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {studentProgress.length === 0 ? (
            <TableRow>
              <TableCell colSpan={slides.length + 1} className="text-center h-32 text-muted-foreground">
                No students have joined yet
              </TableCell>
            </TableRow>
          ) : (
            studentProgress.map((student, studentIndex) => (
              <TableRow key={student.studentId} className="hover:bg-muted/50">
                <TableCell className="sticky left-0 bg-background font-medium flex items-center">
                  <span className="truncate">
                    {anonymousMode 
                      ? `Student ${studentIndex + 1}` 
                      : student.studentName}
                  </span>
                  <MoreVertical className="h-4 w-4 ml-2 text-muted-foreground" />
                </TableCell>
                {slides.map((slide) => (
                  <TableCell 
                    key={`${student.studentId}-${slide.id}`} 
                    className={cn(
                      "text-center", 
                      student.currentSlide === slide.id.toString() 
                        ? "bg-primary/10"
                        : ""
                    )}
                  >
                    {getStatusIcon(student, slide.id)}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default StudentProgressGrid;
