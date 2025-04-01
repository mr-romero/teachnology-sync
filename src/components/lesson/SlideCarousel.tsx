import React from 'react';
import { 
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious
} from '@/components/ui/carousel';
import { LessonSlide } from '@/types/lesson';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, CheckCircle, Image, BarChart2, FileText, Check, Trash, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import StudentViewPreview from './StudentViewPreview';

interface SlideCarouselProps {
  slides: LessonSlide[];
  currentSlideIndex: number;
  onSlideClick: (index: number) => void;
  // Add new props for paced slides and slide deletion
  allowedSlides?: number[];
  onDeleteSlide?: (slideId: string) => void;
  allowDeletion?: boolean;
  onAddSlide?: () => void;  // New prop for adding slides
}

const SlideCarousel: React.FC<SlideCarouselProps> = ({
  slides,
  currentSlideIndex,
  onSlideClick,
  allowedSlides = [],
  onDeleteSlide,
  allowDeletion = true,
  onAddSlide
}) => {
  // Function to generate a mini visual preview of a slide that resembles the actual student view
  const renderMiniSlidePreview = (slide: LessonSlide, index: number) => {
    // Get representative content from the slide
    const title = slide.title || 'Slide ' + (index + 1);
    const hasQuestion = slide.blocks.some(block => block.type === 'question');
    const hasImage = slide.blocks.some(block => block.type === 'image');
    const hasText = slide.blocks.some(block => block.type === 'text');
    const hasGraph = slide.blocks.some(block => block.type === 'graph');
    
    // Check if this slide is a paced slide (allowed for student navigation)
    const isPacedSlide = allowedSlides.length > 0 && allowedSlides.includes(index);
    
    return (
      <Card 
        className={cn(
          "rounded-md border hover:border-primary transition-all duration-200 overflow-hidden cursor-pointer h-full relative group",
          index === currentSlideIndex ? "border-primary border-2 ring-2 ring-primary/30 shadow-md" : 
          isPacedSlide ? "border-blue-400 border-2 shadow-sm" : "border-muted-foreground/10"
        )}
        onClick={() => onSlideClick(index)}
      >
        <CardContent className={cn(
          "p-2 flex flex-col h-full w-full overflow-hidden",
          isPacedSlide && "bg-blue-50/50"
        )}>
          {/* Slide number badge and title */}
          <div className="flex justify-between items-center mb-1">
            <Badge 
              variant={
                index === currentSlideIndex ? "default" : 
                isPacedSlide ? "secondary" : "outline"
              } 
              className="h-5 p-1 flex items-center justify-center text-[10px]"
            >
              {isPacedSlide && allowedSlides.indexOf(index) !== -1 && (
                <span className="flex items-center gap-0.5">
                  {allowedSlides.indexOf(index) + 1}/{allowedSlides.length}
                </span>
              )}
              {!isPacedSlide && (
                <span>{index + 1}</span>
              )}
            </Badge>
            
            {/* Title */}
            <div className="text-[8px] font-medium truncate w-[70%] text-right">
              {title}
            </div>
          </div>
          
          {/* Student view preview - Show actual content */}
          <div className="flex-grow overflow-hidden rounded-sm border bg-white shadow-sm">
            <StudentViewPreview 
              slide={slide} 
              showRealContent={true}
            />
          </div>
          
          {/* Bottom content indicators */}
          <div className="flex flex-wrap gap-1 mt-1 justify-end">
            {hasImage && (
              <div className="flex items-center gap-0.5 bg-blue-50 rounded-full px-1.5 py-0.5">
                <Image className="h-2.5 w-2.5 text-blue-500" />
                <span className="text-[6px] text-blue-600 font-medium">Image</span>
              </div>
            )}
            {hasGraph && (
              <div className="flex items-center gap-0.5 bg-green-50 rounded-full px-1.5 py-0.5">
                <BarChart2 className="h-2.5 w-2.5 text-green-500" />
                <span className="text-[6px] text-green-600 font-medium">Graph</span>
              </div>
            )}
            {hasQuestion && (
              <div className="flex items-center gap-0.5 bg-amber-50 rounded-full px-1.5 py-0.5">
                <CheckCircle className="h-2.5 w-2.5 text-amber-500" />
                <span className="text-[6px] text-amber-600 font-medium">Question</span>
              </div>
            )}
          </div>

          {/* Delete button overlay - hidden by default, shown on hover */}
          {onDeleteSlide && allowDeletion && slides.length > 1 && (
            <div 
              className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity" 
              onClick={(e) => {
                e.stopPropagation();
                onDeleteSlide(slide.id);
              }}
            >
              <Button variant="ghost" size="icon" className="h-6 w-6 bg-white/80 hover:bg-red-50 text-red-500 rounded-full">
                <Trash className="h-3 w-3" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  // Add keyboard navigation support
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && currentSlideIndex > 0) {
        // If pacing is enabled, find the previous allowed slide
        if (allowedSlides.length > 0) {
          const currentAllowedIndex = allowedSlides.indexOf(currentSlideIndex);
          if (currentAllowedIndex > 0) {
            onSlideClick(allowedSlides[currentAllowedIndex - 1]);
            return;
          }
        } else {
          onSlideClick(currentSlideIndex - 1);
        }
      } else if (e.key === 'ArrowRight' && currentSlideIndex < slides.length - 1) {
        // If pacing is enabled, find the next allowed slide
        if (allowedSlides.length > 0) {
          const currentAllowedIndex = allowedSlides.indexOf(currentSlideIndex);
          if (currentAllowedIndex !== -1 && currentAllowedIndex < allowedSlides.length - 1) {
            onSlideClick(allowedSlides[currentAllowedIndex + 1]);
            return;
          }
        } else {
          onSlideClick(currentSlideIndex + 1);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentSlideIndex, slides.length, onSlideClick, allowedSlides]);

  return (
    <div className="w-full">
      {allowedSlides.length > 0 && (
        <div className="text-xs text-blue-700 mb-2 bg-blue-50 rounded-md p-2">
          <span className="font-medium">Student pacing enabled:</span> Students can only navigate between the {allowedSlides.length} highlighted slides
        </div>
      )}
      
      <div className="relative">
        <Carousel
          opts={{
            align: 'start',
            loop: false,
          }}
          className="w-full"
        >
          <CarouselContent className="-ml-4">
            {slides.map((slide, index) => (
              <CarouselItem 
                key={slide.id} 
                className="pl-4 basis-[130px] md:basis-[160px] min-w-[130px] md:min-w-[160px] h-[110px] md:h-[130px] group"
              >
                {renderMiniSlidePreview(slide, index)}
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious 
            className="-left-6 h-10 w-10 bg-white shadow-md hover:bg-primary/10" 
            icon={<ChevronLeft className="h-5 w-5" />}
          />
          <div className="absolute -right-6 flex items-center gap-2">
            <CarouselNext 
              className="h-10 w-10 bg-white shadow-md hover:bg-primary/10" 
              icon={<ChevronRight className="h-5 w-5" />}
            />
            {onAddSlide && (
              <Button
                size="icon"
                variant="outline"
                className="h-10 w-10 rounded-full bg-white shadow-md hover:bg-primary/10"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddSlide();
                  // The slide will be added at the end, so navigate to the last slide
                  onSlideClick(slides.length);
                }}
              >
                <Plus className="h-5 w-5" />
              </Button>
            )}
          </div>
        </Carousel>
      </div>
      
      {/* Current slide indicator */}
      <div className="flex justify-center mt-4 text-xs text-muted-foreground">
        {allowedSlides.length > 0 && allowedSlides.includes(currentSlideIndex) ? (
          <span>
            Selected slide {allowedSlides.indexOf(currentSlideIndex) + 1} of {allowedSlides.length} 
            (Slide {currentSlideIndex + 1} of {slides.length})
          </span>
        ) : (
          <span>Slide {currentSlideIndex + 1} of {slides.length}</span>
        )}
      </div>
    </div>
  );
};

export default SlideCarousel;
