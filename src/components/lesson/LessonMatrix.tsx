import React, { useRef, useEffect } from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  CheckCircle2, 
  XCircle, 
  Circle, 
  HelpCircle, 
  ChevronLeft, 
  ChevronRight,
  UserX, 
  Users, 
  FastForward, 
  Lock, 
  Unlock, 
  Pause, 
  Play,
  Copy,
  FileText,
  Image,
  BarChart2,
  CheckCircle,
  ArrowDownAZ,
  Glasses,
  LayoutGrid,
  Check,
  X,
  BookOpen
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { StudentProgress, LessonSlide } from '@/types/lesson';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface LessonMatrixProps {
  studentProgress: StudentProgress[];
  slides: LessonSlide[];
  currentSlideIndex: number;
  joinCode: string;
  activeStudents: number;
  anonymousMode: boolean;
  syncEnabled: boolean;
  studentPacingEnabled: boolean;
  isPaused: boolean;
  sortBy?: string;
  isLoading?: boolean;
  // Add new props for slide selection
  isSelectingSlides?: boolean;
  selectedSlides?: number[];
  pacedSlides?: number[];
  onToggleAnonymous: () => void;
  onToggleSync: () => void;
  onTogglePacing: () => void;
  onTogglePause: () => void;
  onSortChange?: (sortBy: string) => void;
  onSlideClick: (index: number) => void;
  // Add new props for selection actions
  onSlideSelection?: (index: number) => void;
  onConfirmSelection?: () => void;
  onCancelSelection?: () => void;
}

const LessonMatrix: React.FC<LessonMatrixProps> = ({
  studentProgress,
  slides,
  currentSlideIndex,
  joinCode,
  activeStudents,
  anonymousMode,
  syncEnabled,
  studentPacingEnabled,
  isPaused,
  sortBy = "lastName",
  isLoading = false,
  // New props with defaults
  isSelectingSlides = false,
  selectedSlides = [],
  pacedSlides = [],
  onToggleAnonymous,
  onToggleSync,
  onTogglePacing,
  onTogglePause,
  onSortChange,
  onSlideClick,
  onSlideSelection = () => {},
  onConfirmSelection = () => {},
  onCancelSelection = () => {}
}) => {
  const slidesContainerRef = useRef<HTMLDivElement>(null);
  const tableContainerRef = useRef<HTMLDivElement>(null);
  
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
      
      // First sort by class, then by name within each class
      if (aClass === bClass) {
        return a.studentName.localeCompare(b.studentName);
      }
      return aClass.localeCompare(bClass);
    }
    // Default is joinTime, but we don't have that info, so return as is
    return 0;
  });

  const copyJoinCode = () => {
    navigator.clipboard.writeText(joinCode);
    toast.success("Join code copied to clipboard");
  };

  // Simplified scroll function - using a containerRef to control both header and body
  const scrollMatrix = (direction: 'left' | 'right') => {
    if (slidesContainerRef.current) {
      const slideWidth = 120; // Width of each column
      const currentScroll = slidesContainerRef.current.scrollLeft;
      const scrollAmount = direction === 'left' ? -slideWidth : slideWidth;
      const newScroll = currentScroll + scrollAmount;
      
      // Scroll the headers and body will follow through the synced scrolling
      slidesContainerRef.current.scrollTo({
        left: newScroll,
        behavior: 'smooth'
      });
    }
  };

  // This ensures the table body scrolls in sync with the headers
  useEffect(() => {
    const headerEl = slidesContainerRef.current;
    const tableEl = tableContainerRef.current;
    
    if (!headerEl || !tableEl) return;
    
    const syncHeaderScroll = () => {
      if (tableEl) tableEl.scrollLeft = headerEl.scrollLeft;
    };
    
    const syncTableScroll = () => {
      if (headerEl) headerEl.scrollLeft = tableEl.scrollLeft;
    };
    
    // Listen for scroll events on both elements
    headerEl.addEventListener('scroll', syncHeaderScroll);
    tableEl.addEventListener('scroll', syncTableScroll);
    
    return () => {
      headerEl.removeEventListener('scroll', syncHeaderScroll);
      tableEl.removeEventListener('scroll', syncTableScroll);
    };
  }, []);

  // Force scroll synchronization when currentSlideIndex changes
  useEffect(() => {
    if (slidesContainerRef.current && currentSlideIndex >= 0) {
      const slideWidth = 120; // Width of each slide
      const targetScroll = slideWidth * currentSlideIndex;
      slidesContainerRef.current.scrollTo({
        left: targetScroll,
        behavior: 'smooth'
      });
    }
  }, [currentSlideIndex]);

  // Handle clicks on slide headers depending on mode
  const handleSlideHeaderClick = (index: number) => {
    if (isSelectingSlides) {
      onSlideSelection(index);
    } else {
      onSlideClick(index);
    }
  };

  // Function to generate slide header content - mini preview of slide
  const renderSlideHeader = (slide: LessonSlide, index: number) => {
    // Get representative content from the slide
    const title = slide.title || 'Slide ' + (index + 1);
    const hasQuestion = slide.blocks.some(block => block.type === 'question');
    const hasImage = slide.blocks.some(block => block.type === 'image');
    const hasText = slide.blocks.some(block => block.type === 'text');
    const hasGraph = slide.blocks.some(block => block.type === 'graph');
    
    // Check if this slide is selected in selection mode
    const isSelected = isSelectingSlides && selectedSlides.includes(index);
    
    // Check if this slide is a paced slide (when not in selection mode)
    const isPacedSlide = !isSelectingSlides && studentPacingEnabled && pacedSlides.includes(index);
    
    // Get first text content for preview
    const firstTextBlock = slide.blocks.find(block => block.type === 'text');
    const textPreview = firstTextBlock?.content ? 
      String(firstTextBlock.content).substring(0, 15) + '...' : '';
    
    return (
      <div 
        className={cn(
          "p-2 w-[120px] h-[100px] cursor-pointer flex flex-col border border-transparent rounded-md transition-all duration-200",
          isSelected 
            ? "bg-green-100 border-green-500" 
            : isPacedSlide
              ? "bg-blue-50 border-blue-200"
              : index === currentSlideIndex 
                ? "bg-primary/10 border-primary/50" 
                : "hover:bg-muted/40"
        )}
        onClick={() => handleSlideHeaderClick(index)}
      >
        {/* Slide number and title */}
        <div className="flex justify-between items-center mb-1">
          <Badge 
            variant={
              isSelected 
                ? "default" 
                : isPacedSlide
                  ? "secondary"
                  : index === currentSlideIndex 
                    ? "default" 
                    : "outline"
            } 
            className="h-5 flex items-center justify-center text-[10px] px-1.5"
          >
            {isSelected ? (
              <div className="flex items-center gap-1">
                <Check className="h-3 w-3" />
                <span>{index + 1}</span>
              </div>
            ) : (
              <span>{index + 1}</span>
            )}
          </Badge>
          
          <div className="text-[9px] font-medium truncate w-[80%] text-right">
            {title}
          </div>
        </div>
        
        {/* Content preview - simplified to save vertical space */}
        <div className="flex flex-wrap gap-1 mt-2 justify-center">
          {hasImage && (
            <div className="flex items-center gap-0.5 bg-blue-50 rounded-full px-1.5 py-0.5">
              <Image className="h-3 w-3 text-blue-500" />
              <span className="text-[8px] text-blue-500">Image</span>
            </div>
          )}
          {hasGraph && (
            <div className="flex items-center gap-0.5 bg-green-50 rounded-full px-1.5 py-0.5">
              <BarChart2 className="h-3 w-3 text-green-500" />
              <span className="text-[8px] text-green-500">Graph</span>
            </div>
          )}
          {hasQuestion && (
            <div className="flex items-center gap-0.5 bg-amber-50 rounded-full px-1.5 py-0.5">
              <CheckCircle className="h-3 w-3 text-amber-500" />
              <span className="text-[8px] text-amber-500">Question</span>
            </div>
          )}
        </div>
        
        {/* Small text preview if exists */}
        {hasText && (
          <div className="text-[8px] mt-auto line-clamp-2 opacity-80 text-center overflow-hidden">
            {textPreview}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col space-y-3">
      {/* Selection Mode Information Banner */}
      {isSelectingSlides && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-2 text-sm text-blue-700 flex justify-between items-center">
          <div>
            <span className="font-medium">Slide Selection Mode:</span> Select slides students will be able to access
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onCancelSelection}
              className="h-8 bg-white border-gray-300"
            >
              <X className="h-4 w-4 mr-1 text-gray-500" />
              Cancel
            </Button>
            <Button 
              variant="default" 
              size="sm" 
              onClick={onConfirmSelection}
              className={`h-8 ${selectedSlides.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={selectedSlides.length === 0}
            >
              <Check className="h-4 w-4 mr-1" />
              Confirm Selection
            </Button>
          </div>
        </div>
      )}

      {/* Integrated Matrix with Fixed Positioning */}
      <div className="border rounded-lg overflow-hidden relative">
        {/* Scroll controls - keep these */}
        <div className="absolute top-0 bottom-0 left-[204px] z-10 flex items-center">
          <Button 
            onClick={() => scrollMatrix('left')} 
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 rounded-full bg-gray-100/50 hover:bg-primary/20 ring-0 shadow-none"
          >
            <ChevronLeft className="h-4 w-4 text-gray-500" />
          </Button>
        </div>
        
        <div className="absolute top-0 bottom-0 right-1 z-10 flex items-center">
          <Button 
            onClick={() => scrollMatrix('right')} 
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 rounded-full bg-gray-100/50 hover:bg-primary/20 ring-0 shadow-none"
          >
            <ChevronRight className="h-4 w-4 text-gray-500" />
          </Button>
        </div>
        
        {/* Use a table for both headers and content to ensure alignment */}
        <table className="w-full border-collapse table-fixed">
          <colgroup>
            <col style={{ width: "200px" }} />
            {slides.map((_, index) => (
              <col key={index} style={{ width: "120px" }} />
            ))}
          </colgroup>
          
          {/* Table Headers */}
          <thead className="border-b bg-muted/10">
            <tr>
              {/* Fixed Control Column Header */}
              <th className="sticky left-0 bg-background z-10 w-[200px] p-2 border-r text-start">
                {isSelectingSlides ? (
                  <div className="flex flex-col items-center justify-center h-full">
                    <div className="text-xs font-medium mb-1 text-center">
                      Selected: {selectedSlides.length} slides
                    </div>
                    <div className="text-[10px] text-muted-foreground text-center px-2">
                      Click on slides to select or deselect them for student access
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col justify-between h-[120px]">
                    {/* Height increased to 120px from 100px */}
                    <div className="flex items-center justify-center">
                      <div className="flex items-center">
                        <div className="font-medium text-xs mr-1">Code:</div>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={copyJoinCode}
                          className="flex gap-1 items-center h-6 px-2"
                        >
                          <span className="font-mono text-primary font-bold text-xs">{joinCode}</span>
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between mt-2">
                      {/* Anonymize button with label */}
                      <div className="flex flex-col items-center w-[60px]">
                        <Button
                          variant={anonymousMode ? "default" : "outline"}
                          size="sm"
                          onClick={onToggleAnonymous}
                          className="h-8 w-8 rounded-full p-0 mb-1"
                          title={anonymousMode ? "Show names" : "Hide names"}
                        >
                          <Glasses size={14} />
                        </Button>
                        <span className="text-[9px] text-muted-foreground">Anonymize</span>
                      </div>
                      
                      {/* Pace button with label */}
                      <div className="flex flex-col items-center w-[60px]">
                        <Button
                          variant={studentPacingEnabled ? "default" : "outline"}
                          size="sm"
                          onClick={onTogglePacing}
                          className={`h-8 w-8 rounded-full p-0 mb-1 ${studentPacingEnabled ? "bg-blue-600 hover:bg-blue-700" : ""}`}
                          title={studentPacingEnabled ? "Edit paced slides" : "Enable student pacing"}
                        >
                          <LayoutGrid size={14} />
                        </Button>
                        <span className="text-[9px] text-muted-foreground">Pace</span>
                      </div>
                      
                      {/* Sync button with label */}
                      <div className="flex flex-col items-center w-[60px]">
                        <Button
                          variant={syncEnabled ? "default" : "outline"}
                          size="sm"
                          onClick={onToggleSync}
                          className={`h-8 w-8 rounded-full p-0 mb-1 ${syncEnabled ? "bg-green-600 hover:bg-green-700" : ""}`}
                          title={syncEnabled ? "Students follow teacher view" : "Students can navigate freely"}
                        >
                          {syncEnabled ? <Unlock size={14} /> : <Lock size={14} />}
                        </Button>
                        <span className="text-[9px] text-muted-foreground text-center">Sync</span>
                      </div>
                      
                      {/* Pause button with label */}
                      <div className="flex flex-col items-center w-[60px]">
                        <Button
                          variant={isPaused ? "default" : "outline"}
                          size="sm"
                          onClick={onTogglePause}
                          className={`h-8 w-8 rounded-full p-0 mb-1 ${isPaused ? "bg-amber-500 hover:bg-amber-600" : ""}`}
                          title={isPaused ? "Resume session" : "Pause session"}
                        >
                          {isPaused ? <Play size={14} /> : <Pause size={14} />}
                        </Button>
                        <span className="text-[9px] text-muted-foreground text-center">
                          {isPaused ? "Resume" : "Pause"}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex justify-center mt-3">
                      <Select onValueChange={onSortChange} defaultValue={sortBy}>
                        <SelectTrigger className="h-7 w-[140px] text-xs">
                          <div className="flex items-center gap-1">
                            <ArrowDownAZ className="h-3.5 w-3.5 text-muted-foreground" />
                            <SelectValue placeholder="Sort by" />
                          </div>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="lastName">Last Name</SelectItem>
                          <SelectItem value="firstName">First Name</SelectItem>
                          {/* Remove Class option */}
                          <SelectItem value="joinTime">Join Time</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </th>
              
              {/* Slide Headers - Now as table cells for perfect alignment */}
              {slides.map((slide, index) => (
                <th 
                  key={index} 
                  className="p-0 align-top"
                >
                  {renderSlideHeader(slide, index)}
                </th>
              ))}
            </tr>
          </thead>
          
          {/* Table Body - now directly connected to the headers */}
          <tbody 
            ref={tableContainerRef as React.LegacyRef<HTMLTableSectionElement>}
            className="max-h-[60vh] overflow-y-auto"
          >
            {isLoading || sortedStudents.length === 0 ? (
              <tr>
                <td colSpan={slides.length + 1} className="text-center h-32 text-muted-foreground p-4">
                  {isLoading ? "Loading student data..." : "No students have joined yet"}
                </td>
              </tr>
            ) : (
              sortedStudents.map((student, studentIndex) => {
                // Get previous student's class for comparison when grouping by class
                const prevStudent = studentIndex > 0 ? sortedStudents[studentIndex - 1] : null;
                const isNewClassGroup = sortBy === "class" && 
                  student.studentClass && 
                  (!prevStudent || prevStudent.studentClass !== student.studentClass);
                
                return (
                  <React.Fragment key={student.studentId}>
                    {/* Add class separator when sorting by class and encountering a new class */}
                    {isNewClassGroup && (
                      <tr className="bg-muted/30">
                        <td colSpan={slides.length + 1} className="py-1 px-2 text-xs font-medium">
                          <div className="flex items-center gap-1">
                            <BookOpen className="h-3.5 w-3.5 text-primary" />
                            <span>Class: {student.studentClass}</span>
                          </div>
                        </td>
                      </tr>
                    )}
                    
                    <tr className="hover:bg-muted/50 border-b last:border-b-0">
                      <td className={cn(
                        "sticky left-0 bg-background z-10 w-[200px] p-2 border-r",
                        !student.is_active && "text-muted-foreground italic"
                      )}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            <span className={cn(
                              "truncate text-xs font-medium",
                              !student.is_active && "opacity-50"
                            )}>
                              {anonymousMode 
                                ? `Student ${studentIndex + 1}` 
                                : student.studentName}
                            </span>
                            
                            {/* Show class as a badge unless we're already sorting by class */}
                            {!anonymousMode && student.studentClass && sortBy !== "class" && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Badge 
                                      variant="outline" 
                                      className={cn(
                                        "px-1 h-4 text-[9px] ml-1",
                                        !student.is_active && "opacity-50"
                                      )}
                                    >
                                      <BookOpen className="h-2 w-2 mr-0.5" />
                                      {student.studentClass}
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="text-xs">Class: {student.studentClass}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                        </div>
                      </td>
                      
                      {slides.map((slide, slideIndex) => {
                        // Determine cell styling based on selection state and current position
                        const isPacedCell = !isSelectingSlides && studentPacingEnabled && pacedSlides.includes(slideIndex);
                        const isSelectedCell = isSelectingSlides && selectedSlides.includes(slideIndex);
                        
                        // Always ensure we're working with numbers for comparison
                        const studentCurrentSlide = Number(student.currentSlide);
                        const isStudentCurrentSlide = !isNaN(studentCurrentSlide) && studentCurrentSlide === slideIndex;
                        
                        return (
                          <StudentCell
                            key={`${student.studentId}-${slide.id}`}
                            student={student}
                            slide={slide}
                            slideIndex={slideIndex}
                            isCurrentSlide={slideIndex === currentSlideIndex}
                            isPacedCell={!isSelectingSlides && studentPacingEnabled && pacedSlides.includes(slideIndex)}
                            isSelectedCell={isSelectingSlides && selectedSlides.includes(slideIndex)}
                            getStatusIcon={getStatusIcon}
                            isActive={student.is_active}
                          />
                        );
                      })}
                    </tr>
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      
      {/* Slide Navigation Controls */}
      <div className="flex justify-between items-center pt-1">
        <Button 
          onClick={() => onSlideClick(currentSlideIndex - 1)} 
          disabled={currentSlideIndex === 0 || isSelectingSlides}
          size="sm"
          variant="outline"
          className="flex items-center gap-1"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>Previous</span>
        </Button>
        
        <div className="text-sm font-medium">
          {currentSlideIndex + 1} / {slides.length}
        </div>
        
        <Button 
          onClick={() => onSlideClick(currentSlideIndex + 1)} 
          disabled={currentSlideIndex === slides.length - 1 || isSelectingSlides}
          size="sm"
          variant="outline"
          className="flex items-center gap-1"
        >
          <span>Next</span>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

interface StudentCellProps {
  student: StudentProgress;
  slide: LessonSlide;
  slideIndex: number;
  isCurrentSlide: boolean;
  isPacedCell: boolean;
  isSelectedCell: boolean;
  getStatusIcon: (student: StudentProgress, slideId: string) => React.ReactNode;
  isActive: boolean;
}

const StudentCell: React.FC<StudentCellProps> = ({
  student,
  slide,
  slideIndex,
  isCurrentSlide,
  isPacedCell,
  isSelectedCell,
  getStatusIcon,
  isActive
}) => {
  // Always ensure we're working with numbers for comparison
  const studentCurrentSlide = Number(student.currentSlide);
  const isStudentCurrentSlide = !isNaN(studentCurrentSlide) && studentCurrentSlide === slideIndex;

  return (
    <td 
      key={`${student.studentId}-${slide.id}`} 
      className={cn(
        "text-center p-2 w-[120px]", 
        isSelectedCell
          ? "bg-green-50"
          : isPacedCell
            ? "bg-blue-50"
            : isStudentCurrentSlide
              ? "bg-primary/5 border-2 border-primary ring-1 ring-primary/30"
              : "",
        !isActive && "opacity-50 italic" // Add styling for inactive students
      )}
    >
      {getStatusIcon(student, slide.id)}
    </td>
  );
};

export default LessonMatrix;