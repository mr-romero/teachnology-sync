import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { LessonSlide } from '@/types/lesson';
import { Eye } from 'lucide-react';
import StudentViewPreview from './StudentViewPreview';

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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{title} - Student View Preview</DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="all">All Slides</TabsTrigger>
              <TabsTrigger value="current">Single Slide</TabsTrigger>
            </TabsList>
            
            <TabsContent value="all" className="py-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {slides.map((slide, index) => (
                  <div 
                    key={slide.id} 
                    className="border rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all"
                    onClick={() => {
                      setCurrentSlideIndex(index);
                      document.querySelector('[data-value="current"]')?.click();
                    }}
                  >
                    <div className="p-1 bg-muted/20 border-b text-center text-xs truncate">
                      {slide.title || `Slide ${index + 1}`}
                    </div>
                    <div className="p-2 aspect-video">
                      <StudentViewPreview 
                        slide={slide}
                        showRealContent={true}
                        className="h-full w-full border bg-white rounded-md" 
                      />
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
                    <StudentViewPreview 
                      slide={slides[currentSlideIndex]} 
                      showRealContent={true}
                      className="w-full aspect-video border bg-white rounded-md"
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