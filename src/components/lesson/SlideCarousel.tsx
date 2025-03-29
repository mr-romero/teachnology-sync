
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
  return (
    <Carousel
      opts={{
        align: 'start',
        loop: false,
      }}
      className="w-full"
    >
      <CarouselContent>
        {slides.map((slide, index) => (
          <CarouselItem key={slide.id} className="basis-1/6 min-w-24 sm:basis-1/6 md:basis-1/8">
            <div 
              className="p-1 cursor-pointer" 
              onClick={() => onSlideClick(index)}
            >
              <Card className={cn(
                "rounded-lg border hover:border-primary transition-all duration-200",
                index === currentSlideIndex ? "border-primary-600 border-2 bg-primary/5" : ""
              )}>
                <CardContent className="p-2 flex flex-col items-center justify-center h-full">
                  <div className="text-center font-medium text-xs truncate w-full">{index + 1}</div>
                  <Badge 
                    variant={index === currentSlideIndex ? "default" : "outline"} 
                    className="mt-1 text-xs h-5 w-5 p-0 flex items-center justify-center"
                  >
                    {index + 1}
                  </Badge>
                </CardContent>
              </Card>
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious className="left-0" />
      <CarouselNext className="right-0" />
    </Carousel>
  );
};

export default SlideCarousel;
