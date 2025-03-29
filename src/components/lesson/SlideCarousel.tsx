
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

interface SlideCarouselProps {
  slides: LessonSlide[];
  currentSlideIndex: number;
  onSlideClick: (index: number) => void;
}

const SlideCarousel: React.FC<SlideCarouselProps> = ({
  slides,
  currentSlideIndex,
  onSlideClick
}) => {
  // Function to generate a simple visual preview of a slide
  const renderMiniSlidePreview = (slide: LessonSlide, index: number) => {
    // Determine type of content to show a hint of what's on the slide
    const hasQuestion = slide.blocks.some(block => block.type === 'question');
    const hasImage = slide.blocks.some(block => block.type === 'image');
    const hasGraph = slide.blocks.some(block => block.type === 'graph');
    
    return (
      <Card className={cn(
        "rounded-md border hover:border-primary transition-all duration-200 overflow-hidden",
        index === currentSlideIndex ? "border-primary-600 border-2 bg-primary/5" : ""
      )}>
        <CardContent className="p-1 flex flex-col items-center justify-center h-10">
          <Badge 
            variant={index === currentSlideIndex ? "default" : "outline"} 
            className="h-5 w-5 p-0 flex items-center justify-center text-[10px] mb-1"
          >
            {index + 1}
          </Badge>
          <div className="flex gap-0.5 mt-0.5">
            {hasQuestion && <div className="h-1 w-1 rounded-full bg-amber-500"></div>}
            {hasImage && <div className="h-1 w-1 rounded-full bg-blue-500"></div>}
            {hasGraph && <div className="h-1 w-1 rounded-full bg-green-500"></div>}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <Carousel
      opts={{
        align: 'start',
        loop: false,
      }}
      className="w-full"
    >
      <CarouselContent className="-ml-1">
        {slides.map((slide, index) => (
          <CarouselItem key={slide.id} className="basis-1/12 pl-1 md:basis-1/15 min-w-[40px]">
            <div 
              className="cursor-pointer" 
              onClick={() => onSlideClick(index)}
            >
              {renderMiniSlidePreview(slide, index)}
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious className="-left-4 h-6 w-6" />
      <CarouselNext className="-right-4 h-6 w-6" />
    </Carousel>
  );
};

export default SlideCarousel;
