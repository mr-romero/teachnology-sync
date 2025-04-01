import React from 'react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import StudentViewPreview from './StudentViewPreview';
import { LessonSlide } from '@/types/lesson';

interface MiniSlidePreviewProps {
  slide: LessonSlide;
  index: number;
  active?: boolean;
  onSelect?: (index: number) => void;
  className?: string;
}

const MiniSlidePreview: React.FC<MiniSlidePreviewProps> = ({
  slide,
  index,
  active = false,
  onSelect,
  className,
}) => {
  return (
    <div 
      className={cn(
        "relative group cursor-pointer transition-all",
        className
      )}
      onClick={() => onSelect?.(index)}
    >
      <div className={cn(
        "absolute -inset-1 rounded-lg transition-all",
        active ? "bg-primary/15 ring-2 ring-primary" : "bg-transparent group-hover:bg-muted/50"
      )} />
      
      <div className="relative">
        {/* Teacher editing view on top */}
        <Card className={cn(
          "overflow-hidden w-full aspect-video border border-border shadow-sm bg-card",
        )}>
          <div className="relative h-full p-1.5 flex flex-col">
            {!slide.blocks || slide.blocks.length === 0 ? (
              <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
                Empty slide
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-1 overflow-hidden h-full">
                {slide.blocks.slice(0, 3).map((block, i) => (
                  <div 
                    key={i} 
                    className={cn(
                      "rounded-sm p-0.5 truncate text-[6px]",
                      block.type === 'heading' && "font-bold text-[7px]",
                      block.type === 'math' && "bg-blue-50/30",
                      block.type === 'image' && "flex items-center justify-center bg-muted/30",
                      block.type === 'question' && "bg-green-50/30"
                    )}
                  >
                    {block.type === 'image' ? (
                      <div className="w-4 h-2 bg-muted rounded-sm" />
                    ) : (
                      block.content?.slice(0, 20) || `${block.type} block`
                    )}
                  </div>
                ))}
                {slide.blocks.length > 3 && (
                  <div className="text-[6px] text-muted-foreground text-center">
                    +{slide.blocks.length - 3} more
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>
        
        {/* Student preview underneath with slight shadow/overlap */}
        <div className="absolute w-full h-full transform scale-[0.65] -bottom-3 -right-2 z-[-1] shadow-md rounded-lg overflow-hidden opacity-80">
          <StudentViewPreview 
            slide={slide} 
            className="h-full w-full border-2 border-muted bg-white"
          />
        </div>
      </div>
      
      <div className={cn(
        "absolute -bottom-2 left-1/2 transform -translate-x-1/2 px-2 py-0.5 text-[10px] font-medium bg-card border border-border rounded-full shadow-sm",
        active ? "bg-primary text-primary-foreground" : "bg-card text-foreground"
      )}>
        {index + 1}
      </div>
    </div>
  );
};

export default MiniSlidePreview;