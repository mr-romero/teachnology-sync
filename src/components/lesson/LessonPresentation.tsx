import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Check, X } from 'lucide-react';
import LessonSlideView from '@/components/lesson/LessonSlideView';
import SlideCarousel from '@/components/lesson/SlideCarousel';
import LessonControls from '@/components/lesson/LessonControls';
import LessonMatrix from '@/components/lesson/LessonMatrix';
import StudentResponseList from '@/components/lesson/StudentResponseList';
import StudentProgressGrid from '@/components/lesson/StudentProgressGrid';
import { LessonData, StudentProgress, StudentResponse } from '@/types/lesson';
import useRealTimeSync from '@/hooks/useRealTimeSync';
import { useMobile } from '@/hooks/use-mobile';

const sampleJoinCode = "ABCD1234";

export default function LessonPresentation() {
  const isMobile = useMobile();
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [showResponses, setShowResponses] = useState(false);
  const [anonymousMode, setAnonymousMode] = useState(false);
  const [syncEnabled, setSyncEnabled] = useState(true);
  const [studentPacingEnabled, setStudentPacingEnabled] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showMatrix, setShowMatrix] = useState(true);
  const [showCarousel, setShowCarousel] = useState(false);
  const [sortBy, setSortBy] = useState("lastName");
  
  // New state for slide selection
  const [isSelectingSlides, setIsSelectingSlides] = useState(false);
  const [selectedSlides, setSelectedSlides] = useState<number[]>([]);
  const [allowedSlides, setAllowedSlides] = useState<number[]>([]);

  // Sample lesson data (replace with your actual data)
  const lessonData: LessonData = {
    id: "123",
    title: "Introduction to Algebra",
    description: "Basic algebraic concepts",
    slides: [
      {
        id: "slide1",
        title: "Variables and Constants",
        blocks: [
          {
            id: "block1",
            type: "text",
            content: "Variables are symbols that can represent different values. Constants are fixed values."
          },
          {
            id: "block2",
            type: "image",
            content: "/placeholder.svg",
            caption: "Examples of Variables and Constants"
          }
        ]
      },
      {
        id: "slide2",
        title: "Expressions",
        blocks: [
          {
            id: "block3",
            type: "text",
            content: "An algebraic expression is a combination of variables, constants, and operations."
          },
          {
            id: "block4",
            type: "question",
            content: "Which of the following is an algebraic expression?",
            options: ["2x + 3", "x = 5", "3 > 2", "2(3)"],
            answer: "2x + 3"
          }
        ]
      },
      {
        id: "slide3",
        title: "Equations",
        blocks: [
          {
            id: "block5",
            type: "text",
            content: "An equation states that two expressions are equal."
          },
          {
            id: "block6",
            type: "image",
            content: "/placeholder.svg",
            caption: "Example of an Equation"
          }
        ]
      },
      {
        id: "slide4",
        title: "Solving Equations",
        blocks: [
          {
            id: "block7",
            type: "text",
            content: "To solve an equation, isolate the variable on one side."
          },
          {
            id: "block8",
            type: "question",
            content: "Solve for x: 2x + 3 = 7",
            options: ["x = 2", "x = 4", "x = 5", "x = 10"],
            answer: "x = 2"
          }
        ]
      },
      {
        id: "slide5",
        title: "Algebraic Properties",
        blocks: [
          {
            id: "block9",
            type: "text",
            content: "Algebraic properties include commutative, associative, and distributive properties."
          }
        ]
      },
      {
        id: "slide6",
        title: "Review",
        blocks: [
          {
            id: "block10",
            type: "text",
            content: "Let's review what we've learned about algebra."
          },
          {
            id: "block11",
            type: "question",
            content: "Which statement is false?",
            options: [
              "Variables can represent different values",
              "Equations always have exactly one solution",
              "Algebraic expressions can contain operations",
              "Constants have fixed values"
            ],
            answer: "Equations always have exactly one solution"
          }
        ]
      }
    ]
  };

  // Sample student progress data (replace with your actual data)
  const [studentProgress, setStudentProgress] = useState<StudentProgress[]>([
    {
      studentId: "1",
      studentName: "John Smith",
      currentSlide: "0",
      responses: [
        {
          slideId: "slide2",
          questionId: "block4",
          answer: "2x + 3",
          isCorrect: true,
          timestamp: new Date().toISOString()
        }
      ]
    },
    {
      studentId: "2",
      studentName: "Emma Johnson",
      currentSlide: "1",
      responses: [
        {
          slideId: "slide2",
          questionId: "block4",
          answer: "x = 5",
          isCorrect: false,
          timestamp: new Date().toISOString()
        }
      ]
    },
    {
      studentId: "3",
      studentName: "Michael Brown",
      currentSlide: "0",
      responses: []
    }
  ]);

  // Sample student responses for the current slide
  const getCurrentSlideResponses = (): StudentResponse[] => {
    const currentSlideId = lessonData.slides[currentSlideIndex].id;
    const allResponses: StudentResponse[] = [];
    
    studentProgress.forEach(student => {
      const studentResponses = student.responses.filter(r => r.slideId === currentSlideId);
      studentResponses.forEach(response => {
        allResponses.push({
          ...response,
          studentName: student.studentName,
          studentId: student.studentId
        });
      });
    });
    
    return allResponses;
  };

  const handleSlideChange = (index: number) => {
    // If in selection mode, toggle the slide in the selected list
    if (isSelectingSlides) {
      if (selectedSlides.includes(index)) {
        setSelectedSlides(selectedSlides.filter(i => i !== index));
      } else {
        setSelectedSlides([...selectedSlides, index]);
      }
      return;
    }
    
    // If not in selection mode, navigate to the clicked slide
    setCurrentSlideIndex(index);
    
    // If syncEnabled is true, update all student current slides
    if (syncEnabled) {
      setStudentProgress(prev => 
        prev.map(student => ({
          ...student,
          currentSlide: index.toString()
        }))
      );
    }
  };

  const handlePrevSlide = () => {
    if (currentSlideIndex > 0) {
      // If pacing is enabled, find the previous allowed slide
      if (studentPacingEnabled && allowedSlides.length > 0) {
        const currentAllowedIndex = allowedSlides.indexOf(currentSlideIndex);
        if (currentAllowedIndex > 0) {
          setCurrentSlideIndex(allowedSlides[currentAllowedIndex - 1]);
          return;
        }
      } else {
        setCurrentSlideIndex(currentSlideIndex - 1);
      }
    }
  };

  const handleNextSlide = () => {
    if (currentSlideIndex < lessonData.slides.length - 1) {
      // If pacing is enabled, find the next allowed slide
      if (studentPacingEnabled && allowedSlides.length > 0) {
        const currentAllowedIndex = allowedSlides.indexOf(currentSlideIndex);
        if (currentAllowedIndex < allowedSlides.length - 1 && currentAllowedIndex !== -1) {
          setCurrentSlideIndex(allowedSlides[currentAllowedIndex + 1]);
          return;
        }
      } else {
        setCurrentSlideIndex(currentSlideIndex + 1);
      }
    }
  };

  const toggleAnonymousMode = () => {
    setAnonymousMode(!anonymousMode);
  };

  const toggleSync = () => {
    setSyncEnabled(!syncEnabled);
  };

  // Function to toggle student pacing - enhanced for multi-slide selection
  const togglePacing = () => {
    if (studentPacingEnabled) {
      // If already in pacing mode but not selecting, enter selection mode
      if (!isSelectingSlides) {
        setIsSelectingSlides(true);
        setSelectedSlides([...allowedSlides]); // Start with currently allowed slides
      } else {
        // Confirm selection
        setAllowedSlides([...selectedSlides].sort((a, b) => a - b));
        setIsSelectingSlides(false);
      }
    } else {
      // Enable pacing mode and enter selection mode
      setStudentPacingEnabled(true);
      setIsSelectingSlides(true);
      setSelectedSlides([currentSlideIndex]); // Start with current slide selected
    }
  };

  // Function to cancel slide selection
  const cancelSlideSelection = () => {
    setIsSelectingSlides(false);
    if (allowedSlides.length === 0) {
      setStudentPacingEnabled(false);
    }
  };

  const togglePause = () => {
    setIsPaused(!isPaused);
  };

  const toggleMatrixView = () => {
    setShowMatrix(!showMatrix);
  };

  const toggleCarouselView = () => {
    setShowCarousel(!showCarousel);
  };

  const toggleResponsesView = () => {
    setShowResponses(!showResponses);
  };

  // Add a simple mock for student activity updates (simulating real-time updates)
  useEffect(() => {
    const interval = setInterval(() => {
      // Simulate a student changing slides or submitting a response
      const randomStudentIndex = Math.floor(Math.random() * studentProgress.length);
      const randomSlideIndex = Math.floor(Math.random() * lessonData.slides.length);
      
      setStudentProgress(prev => {
        const updated = [...prev];
        
        // Don't update if sync is enabled (teacher is controlling navigation)
        if (!syncEnabled) {
          // Only allow moving to allowed slides if pacing is enabled
          if (studentPacingEnabled && allowedSlides.length > 0) {
            if (allowedSlides.includes(randomSlideIndex)) {
              updated[randomStudentIndex] = {
                ...updated[randomStudentIndex],
                currentSlide: randomSlideIndex.toString()
              };
            }
          } else {
            updated[randomStudentIndex] = {
              ...updated[randomStudentIndex],
              currentSlide: randomSlideIndex.toString()
            };
          }
        }
        
        return updated;
      });
      
    }, 5000);
    
    return () => clearInterval(interval);
  }, [syncEnabled, studentPacingEnabled, allowedSlides]);

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col overflow-hidden">
      {/* Top Controls */}
      <div className="border-b p-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold">{lessonData.title}</h1>
            <p className="text-sm text-gray-500">{lessonData.description}</p>
          </div>
          
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={toggleMatrixView}
            >
              {showMatrix ? "Hide Progress" : "Show Progress"}
            </Button>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={toggleCarouselView}
            >
              {showCarousel ? "Hide Carousel" : "Show Carousel"}
            </Button>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={toggleResponsesView}
            >
              {showResponses ? "Hide Responses" : "Show Responses"}
            </Button>
          </div>
        </div>
      </div>
      
      {/* Conditional Student Progress Matrix */}
      {showMatrix && (
        <div className="border-b p-4 bg-card">
          <LessonMatrix 
            studentProgress={studentProgress}
            slides={lessonData.slides}
            currentSlideIndex={currentSlideIndex}
            joinCode={sampleJoinCode}
            activeStudents={studentProgress.length}
            anonymousMode={anonymousMode}
            syncEnabled={syncEnabled}
            studentPacingEnabled={studentPacingEnabled}
            isPaused={isPaused}
            sortBy={sortBy}
            onToggleAnonymous={toggleAnonymousMode}
            onToggleSync={toggleSync}
            onTogglePacing={togglePacing}
            onTogglePause={togglePause}
            onSortChange={setSortBy}
            onSlideClick={handleSlideChange}
            isSelectingSlides={isSelectingSlides}
            selectedSlides={selectedSlides}
            allowedSlides={allowedSlides}
          />
        </div>
      )}
      
      {/* Conditional Slide Carousel */}
      {showCarousel && (
        <div className="border-b p-4 bg-card">
          <SlideCarousel 
            slides={lessonData.slides}
            currentIndex={currentSlideIndex}
            onSlideClick={handleSlideChange}
            allowedSlides={studentPacingEnabled ? allowedSlides : []}
          />
        </div>
      )}
      
      {/* Main Content Area */}
      <div className="flex-grow flex flex-col md:flex-row overflow-hidden">
        {/* Slide View */}
        <div className="flex-grow p-4 overflow-auto">
          {/* Slide Selection Mode UI */}
          {isSelectingSlides && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-4">
              <h3 className="text-blue-700 font-medium mb-2">Select Slides for Student Access</h3>
              <p className="text-sm text-blue-600 mb-4">
                Click on slides to select which ones students can access. Selected slides will have a green border. 
                Students will only be able to navigate between the selected slides in the order you choose.
              </p>
              <div className="flex space-x-2">
                <Button 
                  onClick={togglePacing} 
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Check className="h-4 w-4 mr-2" /> Confirm Selection 
                  ({selectedSlides.length} {selectedSlides.length === 1 ? 'slide' : 'slides'})
                </Button>
                <Button 
                  variant="outline" 
                  onClick={cancelSlideSelection}
                >
                  <X className="h-4 w-4 mr-2" /> Cancel
                </Button>
              </div>
            </div>
          )}
          
          <LessonSlideView
            slide={lessonData.slides[currentSlideIndex]}
            slideIndex={currentSlideIndex}
            totalSlides={lessonData.slides.length}
            onNextSlide={handleNextSlide}
            onPrevSlide={handlePrevSlide}
            isEditable={false}
          />
          
          <LessonControls
            currentIndex={currentSlideIndex}
            totalSlides={lessonData.slides.length}
            onPrevSlide={handlePrevSlide}
            onNextSlide={handleNextSlide}
            allowedSlides={studentPacingEnabled ? allowedSlides : []}
          />
        </div>
        
        {/* Student Responses Panel (Conditional) */}
        {showResponses && !isMobile && (
          <div className="w-[350px] border-l p-4 overflow-auto bg-muted/20">
            <StudentResponseList 
              responses={getCurrentSlideResponses()}
              anonymousMode={anonymousMode}
            />
          </div>
        )}
      </div>
      
      {/* Mobile-only bottom panel for student responses */}
      {showResponses && isMobile && (
        <div className="border-t p-4 h-[300px] overflow-auto bg-muted/20">
          <StudentResponseList 
            responses={getCurrentSlideResponses()}
            anonymousMode={anonymousMode}
          />
        </div>
      )}
    </div>
  );
}