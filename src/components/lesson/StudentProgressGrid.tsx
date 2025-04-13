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
import { CheckCircle2, XCircle, Circle, HelpCircle, MoreVertical, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface StudentProgressGridProps {
  studentProgress: StudentProgress[];
  slides: LessonSlide[];
  anonymousMode: boolean;
  sortBy?: string;
  isLoading?: boolean;
}

const StudentProgressGrid: React.FC<StudentProgressGridProps> = ({
  studentProgress,
  slides,
  anonymousMode,
  sortBy = "lastName",
  isLoading = false
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
      return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    }
    
    // If all responses are incorrect
    if (incorrectCount > 0 && correctCount === 0 && unevaluatedCount === 0) {
      return <XCircle className="h-4 w-4 text-red-500" />;
    }
    
    // If there are unevaluated responses
    if (unevaluatedCount > 0) {
      return <HelpCircle className="h-4 w-4 text-amber-500" />;
    }
    
    // Mixed responses (some correct, some incorrect)
    return (
      <div className="flex items-center">
        <CheckCircle2 className="h-3 w-3 text-green-600 mr-0.5" />
        <XCircle className="h-3 w-3 text-red-500" />
      </div>
    );
  };

  // Sort students based on sortBy parameter
  const sortedStudents = [...studentProgress].sort((a, b) => {
    if (sortBy === "firstName") {
      return a.studentName.localeCompare(b.studentName);
    } else if (sortBy === "lastName") {
      // Assume last name is after the first space
      const aLastName = a.studentName.includes(" ") ? 
        a.studentName.split(" ")[1] : a.studentName;
      const bLastName = b.studentName.includes(" ") ? 
        b.studentName.split(" ")[1] : b.studentName;
      return aLastName.localeCompare(bLastName);
    } else if (sortBy === "class") {
      // Sort by class if available
      const aClass = a.studentClass || '';
      const bClass = b.studentClass || '';
      return aClass.localeCompare(bClass);
    }
    // Default is joinTime, but we don't have that info, so return as is
    return 0;
  });

  if (isLoading) {
    return (
      <div className="relative border rounded-lg">
        <Table className="w-full table-fixed">
          <TableHeader className="sticky top-0 bg-background z-10">
            <TableRow>
              <TableHead className="sticky left-0 bg-background z-20 w-[160px]">Student</TableHead>
              {slides.map((_, index) => (
                <TableHead key={index} className="text-center w-[40px]">
                  {index + 1}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell colSpan={slides.length + 1} className="text-center h-32 text-muted-foreground">
                Loading student data...
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <div className="relative overflow-auto border rounded-lg">
      <Table className="w-full table-fixed">
        <TableHeader className="sticky top-0 bg-background z-10">
          <TableRow>
            <TableHead className="sticky left-0 bg-background z-20 w-[160px]">Student</TableHead>
            {slides.map((_, index) => (
              <TableHead key={index} className="text-center w-[40px]">
                {index + 1}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedStudents.length === 0 ? (
            <TableRow>
              <TableCell colSpan={slides.length + 1} className="text-center h-32 text-muted-foreground">
                No students have joined yet
              </TableCell>
            </TableRow>
          ) : (
            sortedStudents.map((student, studentIndex) => (
              <TableRow key={student.studentId} className="hover:bg-muted/50">
                <TableCell className="sticky left-0 bg-background font-medium flex items-center py-2">
                  {anonymousMode ? (
                    <span className="truncate text-xs">
                      Student {studentIndex + 1}
                    </span>
                  ) : (
                    <div className="flex items-center gap-1">
                      <span className="truncate text-xs">
                        {student.studentName}
                      </span>
                      {/* Removed classroom badge display */}
                    </div>
                  )}
                  <MoreVertical className="h-3 w-3 ml-1 text-muted-foreground" />
                </TableCell>
                {slides.map((slide) => (
                  <TableCell 
                    key={`${student.studentId}-${slide.id}`} 
                    className={cn(
                      "text-center py-2", 
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
