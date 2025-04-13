import React from 'react';
import { LessonSlide } from '@/types/lesson';
import LessonSlideView from './LessonSlideView';
import { cn } from '@/lib/utils';

interface ActualStudentViewRendererProps {
  slide: LessonSlide;
  className?: string;
}

/**
 * Renders the actual student view of a slide (not just a preview)
 * This component is used in the preview modal to show exactly what students would see
 */
const ActualStudentViewRenderer: React.FC<ActualStudentViewRendererProps> = ({
  slide,
  className
}) => {
  return (
    <div className={cn("relative overflow-hidden", className)}>
      <div className="scale-100 origin-top-left w-full h-full">
        <div className="border rounded-md overflow-hidden">
          <LessonSlideView 
            slide={slide} 
            isStudentView={true}
            isPaused={false}
            showCalculator={false}
            isPreviewMode={true}
            sessionId="preview"
          />
        </div>
      </div>
    </div>
  );
};

export default ActualStudentViewRenderer;