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
  ArrowDownAZ
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
  onToggleAnonymous: () => void;
  onToggleSync: () => void;
  onTogglePacing: () => void;
  onTogglePause: () => void;
  onSortChange?: (sortBy: string) => void;
  onSlideClick: (index: number) => void;
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
  onToggleAnonymous,
  onToggleSync,
  onTogglePacing,
  onTogglePause,
  onSortChange,
  onSlideClick
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

  // Function to generate slide header content - mini preview of slide
  const renderSlideHeader = (slide: LessonSlide, index: number) => {
    // Get representative content from the slide
    const title = slide.title || 'Slide ' + (index + 1);
    const hasQuestion = slide.blocks.some(block => block.type === 'question');
    const hasImage = slide.blocks.some(block => block.type === 'image');
    const hasText = slide.blocks.some(block => block.type === 'text');
    const hasGraph = slide.blocks.some(block => block.type === 'graph');
    
    // Get first text content for preview
    const firstTextBlock = slide.blocks.find(block => block.type === 'text');
    const textPreview = firstTextBlock?.content ? 
      String(firstTextBlock.content).substring(0, 15) + '...' : '';
    
    return (
      <div 
        className={cn(
          "p-2 w-[120px] h-[100px] cursor-pointer flex flex-col border border-transparent rounded-md transition-all duration-200",
          index === currentSlideIndex 
            ? "bg-primary/10 border-primary/50" 
            : "hover:bg-muted/40"
        )}
        onClick={() => onSlideClick(index)}
      >
        {/* Slide number and title */}
        <div className="flex justify-between items-center mb-1">
          <Badge 
            variant={index === currentSlideIndex ? "default" : "outline"} 
            className="h-5 w-5 p-0 flex items-center justify-center text-[10px]"
          >
            {index + 1}
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
      {/* Integrated Matrix with Fixed Positioning */}
      <div className="border rounded-lg overflow-hidden relative">
        {/* More graceful scroll controls that don't cover slide content */}
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
        
        {/* Table Headers Row with Controls in first column */}
        <div className="flex border-b bg-muted/10">
          {/* Fixed Control Column Header */}
          <div className="flex-shrink-0 w-[200px] border-r p-2 flex flex-col justify-between">
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
              <div className="flex gap-1.5 w-full justify-center">
                <Button
                  variant={anonymousMode ? "default" : "outline"}
                  size="sm"
                  onClick={onToggleAnonymous}
                  className="h-7 w-7 rounded-full p-0"
                  title={anonymousMode ? "Show names" : "Hide names"}
                >
                  {anonymousMode ? <UserX size={12} /> : <Users size={12} />}
                </Button>
                
                <Button
                  variant={studentPacingEnabled ? "default" : "outline"}
                  size="sm"
                  onClick={onTogglePacing}
                  className="h-7 w-7 rounded-full p-0"
                  title={studentPacingEnabled ? "Student pacing on" : "Student pacing off"}
                >
                  <FastForward size={12} />
                </Button>
                
                <Button
                  variant={syncEnabled ? "default" : "outline"}
                  size="sm"
                  onClick={onToggleSync}
                  className={`h-7 w-7 rounded-full p-0 ${syncEnabled ? "bg-green-600 hover:bg-green-700" : ""}`}
                  title={syncEnabled ? "Students locked to teacher view" : "Students can navigate freely"}
                >
                  {syncEnabled ? <Lock size={12} /> : <Unlock size={12} />}
                </Button>
                
                <Button
                  variant={isPaused ? "default" : "outline"}
                  size="sm"
                  onClick={onTogglePause}
                  className={`h-7 w-7 rounded-full p-0 ${isPaused ? "bg-amber-500 hover:bg-amber-600" : ""}`}
                  title={isPaused ? "Resume session" : "Pause session"}
                >
                  {isPaused ? <Pause size={12} /> : <Play size={12} />}
                </Button>
              </div>
            </div>
            
            <div className="flex justify-center mt-2">
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
                  <SelectItem value="joinTime">Join Time</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Scrollable Slide Headers */}
          <div className="relative flex-grow overflow-hidden">
            <div 
              ref={slidesContainerRef} 
              className="flex overflow-x-auto"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {slides.map((slide, index) => (
                <div 
                  key={index}
                  className="flex-shrink-0 w-[120px] box-border" 
                >
                  {renderSlideHeader(slide, index)}
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Student Progress Rows */}
        <div 
          ref={tableContainerRef} 
          className="overflow-x-auto max-h-[60vh]"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {/* Table with absolute sizing to match header row */}
          <table className="w-full border-collapse table-fixed">
            <colgroup>
              <col style={{ width: "200px" }} />
              {slides.map((_, index) => (
                <col key={index} style={{ width: "120px" }} />
              ))}
            </colgroup>
            <tbody>
              {isLoading || sortedStudents.length === 0 ? (
                <tr>
                  <td colSpan={slides.length + 1} className="text-center h-32 text-muted-foreground p-4">
                    {isLoading ? "Loading student data..." : "No students have joined yet"}
                  </td>
                </tr>
              ) : (
                sortedStudents.map((student, studentIndex) => (
                  <tr key={student.studentId} className="hover:bg-muted/50 border-b last:border-b-0">
                    <td className="sticky left-0 bg-background z-10 w-[200px] p-2 border-r">
                      <div className="flex items-center justify-between">
                        <span className="truncate text-xs font-medium">
                          {anonymousMode 
                            ? `Student ${studentIndex + 1}` 
                            : student.studentName}
                        </span>
                        <Badge 
                          variant="outline" 
                          className="text-[10px] h-5 px-1 bg-background ml-1"
                        >
                          {parseInt(student.currentSlide) + 1}
                        </Badge>
                      </div>
                    </td>
                    
                    {slides.map((slide, slideIndex) => (
                      <td 
                        key={`${student.studentId}-${slide.id}`} 
                        className={cn(
                          "text-center p-2", 
                          parseInt(student.currentSlide) === slideIndex 
                            ? "bg-primary/5"
                            : slideIndex === currentSlideIndex 
                              ? "bg-primary/5"
                              : ""
                        )}
                      >
                        {getStatusIcon(student, slide.id)}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Slide Navigation Controls */}
      <div className="flex justify-between items-center pt-1">
        <Button 
          onClick={() => onSlideClick(currentSlideIndex - 1)} 
          disabled={currentSlideIndex === 0}
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
          disabled={currentSlideIndex === slides.length - 1}
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

export default LessonMatrix;