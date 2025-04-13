import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { LessonSlide } from '@/types/lesson';
import { Eye } from 'lucide-react';
import ActualStudentViewRenderer from './ActualStudentViewRenderer';

interface LessonPreviewModalProps {
  slides: LessonSlide[];
  title: string;
  trigger?: React.ReactNode;
}

const LessonPreviewModal: React.FC<LessonPreviewModalProps> = ({
  slides,
  title,
  trigger
}) => {
  const [open, setOpen] = useState(false);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  return (
    <>
      {trigger ? (
        <div onClick={() => setOpen(true)}>
          {trigger}
        </div>
      ) : (
        <Button 
          size="sm" 
          variant="ghost" 
          onClick={() => setOpen(true)}
          className="flex items-center gap-1"
        >
          <Eye className="h-3.5 w-3.5" />
          <span className="text-xs">Preview</span>
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen} className="w-full">
        <DialogContent className="max-w-[90vw] w-full max-h-[90vh] h-full overflow-auto">
          <DialogHeader>
            <DialogTitle>{title} - Preview</DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="all">All Slides</TabsTrigger>
              <TabsTrigger value="current">Current Slide</TabsTrigger>
            </TabsList>
            
            <TabsContent value="all" className="py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {slides.map((slide, index) => (
                  <div 
                    key={slide.id} 
                    className="border rounded-lg overflow-hidden cursor-pointer hover:border-primary hover:shadow-md transition-all"
                    onClick={() => {
                      setCurrentSlideIndex(index);
                      document.querySelector('[data-value="current"]')?.click();
                    }}
                  >
                    <div className="p-2 bg-muted/20 border-b flex justify-between items-center">
                      <span className="text-xs font-medium truncate">
                        {slide.title || `Slide ${index + 1}`}
                      </span>
                      <span className="bg-primary/10 text-primary text-xs px-1.5 py-0.5 rounded-full">
                        #{index + 1}
                      </span>
                    </div>
                    <div className="p-2 aspect-video" style={{ height: '150px', overflowY: 'hidden' }}>
                      <div className="transform scale-[0.3] origin-top-left w-[300%] h-[300%]">
                        <ActualStudentViewRenderer
                          slide={slide}
                          className="w-full h-full"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
            
            <TabsContent value="current" className="py-4">
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium">{slides[currentSlideIndex]?.title || `Slide ${currentSlideIndex + 1}`}</h3>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setCurrentSlideIndex(Math.max(0, currentSlideIndex - 1))}
                      disabled={currentSlideIndex === 0}
                    >
                      Previous
                    </Button>
                    <span className="text-xs">
                      {currentSlideIndex + 1} / {slides.length}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setCurrentSlideIndex(Math.min(slides.length - 1, currentSlideIndex + 1))}
                      disabled={currentSlideIndex === slides.length - 1}
                    >
                      Next
                    </Button>
                  </div>
                </div>

                <div className="border rounded-lg p-4 bg-white">
                  {slides[currentSlideIndex] ? (
                    <ActualStudentViewRenderer
                      slide={slides[currentSlideIndex]} 
                      className="w-full aspect-video"
                    />
                  ) : (
                    <div className="w-full aspect-video flex items-center justify-center text-muted-foreground">
                      No slides available
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default LessonPreviewModal;