
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
      <CarouselContent className="-ml-1">
        {slides.map((slide, index) => (
          <CarouselItem key={slide.id} className="basis-1/10 pl-1 md:basis-1/12 min-w-[40px]">
            <div 
              className="cursor-pointer" 
              onClick={() => onSlideClick(index)}
            >
              <Card className={cn(
                "rounded-md border hover:border-primary transition-all duration-200",
                index === currentSlideIndex ? "border-primary-600 border-2 bg-primary/5" : ""
              )}>
                <CardContent className="p-1 flex items-center justify-center h-8">
                  <Badge 
                    variant={index === currentSlideIndex ? "default" : "outline"} 
                    className="h-5 w-5 p-0 flex items-center justify-center text-[10px]"
                  >
                    {index + 1}
                  </Badge>
                </CardContent>
              </Card>
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
