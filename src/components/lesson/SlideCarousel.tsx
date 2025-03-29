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
import { ChevronLeft, ChevronRight, CheckCircle, Image, BarChart2, FileText, Check } from 'lucide-react';

interface SlideCarouselProps {
  slides: LessonSlide[];
  currentSlideIndex: number;
  onSlideClick: (index: number) => void;
  // Add new props for paced slides
  allowedSlides?: number[];
}

const SlideCarousel: React.FC<SlideCarouselProps> = ({
  slides,
  currentSlideIndex,
  onSlideClick,
  allowedSlides = []
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
    
    // Get first text content for preview
    const firstTextBlock = slide.blocks.find(block => block.type === 'text');
    const textPreview = firstTextBlock?.content ? 
      String(firstTextBlock.content).substring(0, 20) + '...' : '';
    
    return (
      <Card 
        className={cn(
          "rounded-md border hover:border-primary transition-all duration-200 overflow-hidden cursor-pointer h-full",
          index === currentSlideIndex ? "border-primary border-2 ring-2 ring-primary/30 shadow-md" : 
          isPacedSlide ? "border-blue-400 border-2 shadow-sm" : "border-muted-foreground/10"
        )}
        onClick={() => onSlideClick(index)}
      >
        <CardContent className={cn(
          "p-3 flex flex-col h-full w-full overflow-hidden",
          isPacedSlide && "bg-blue-50/50"
        )}>
          {/* Slide number badge and title */}
          <div className="flex justify-between items-center mb-2">
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
            <div className="text-[8px] font-medium truncate w-[80%] text-right">
              {title}
            </div>
          </div>
          
          {/* Content preview */}
          <div className="flex-grow flex flex-col justify-between">
            {/* Text preview */}
            {hasText && (
              <div className="flex items-start gap-1 mb-2">
                <FileText className="h-3 w-3 text-gray-500 flex-shrink-0 mt-0.5" />
                <div className="text-[7px] line-clamp-3 opacity-80">{textPreview}</div>
              </div>
            )}
            
            {/* Bottom content indicators */}
            <div className="mt-auto">
              {/* Image/Graph indicators */}
              <div className="flex flex-wrap gap-1.5 mt-1">
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
                {/* Question indicator */}
                {hasQuestion && (
                  <div className="flex items-center gap-0.5 bg-amber-50 rounded-full px-1.5 py-0.5">
                    <CheckCircle className="h-2.5 w-2.5 text-amber-500" />
                    <span className="text-[6px] text-amber-600 font-medium">Question</span>
                  </div>
                )}
              </div>
              
              {/* Bottom divider to simulate slide content */}
              <div className={cn(
                "h-1 w-full rounded-full mt-2",
                index === currentSlideIndex ? "bg-primary/20" : 
                isPacedSlide ? "bg-blue-300/30" : "bg-muted"
              )}></div>
            </div>
          </div>
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
      
      <Carousel
        opts={{
          align: 'start',
          loop: false,
        }}
        className="w-full"
      >
        <CarouselContent className="-ml-4">
          {slides.map((slide, index) => (
            <CarouselItem key={slide.id} className="pl-4 basis-[110px] md:basis-[130px] min-w-[110px] md:min-w-[130px] h-[100px] md:h-[110px]">
              {renderMiniSlidePreview(slide, index)}
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious 
          className="-left-6 h-10 w-10 bg-white shadow-md hover:bg-primary/10" 
          icon={<ChevronLeft className="h-5 w-5" />}
        />
        <CarouselNext 
          className="-right-6 h-10 w-10 bg-white shadow-md hover:bg-primary/10" 
          icon={<ChevronRight className="h-5 w-5" />}
        />
      </Carousel>
      
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
