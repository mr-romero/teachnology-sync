import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { GripVertical, Trash } from 'lucide-react';

interface DraggableSlideItemProps {
  slide: {
    id: string;
    title: string;
  };
  index: number;
  isActive: boolean;
  onSlideClick: (slideId: string) => void;
  onDeleteSlide: (slideId: string) => void;
  onDragStart: (e: React.DragEvent, index: number) => void;
  onDragEnter: (index: number) => void;
  onDragEnd: () => void;
  isDragging: boolean;
  allowDeletion: boolean;
}

const DraggableSlideItem: React.FC<DraggableSlideItemProps> = ({
  slide,
  index,
  isActive,
  onSlideClick,
  onDeleteSlide,
  onDragStart,
  onDragEnter,
  onDragEnd,
  isDragging,
  allowDeletion
}) => {
  const [isDragOver, setIsDragOver] = useState(false);

  return (
    <div 
      draggable
      onDragStart={(e) => onDragStart(e, index)}
      onDragEnter={() => onDragEnter(index)}
      onDragEnd={onDragEnd}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={() => {
        setIsDragOver(false);
      }}
      className={`flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors border ${
        isActive 
          ? 'bg-primary/10 text-primary border-primary shadow-sm' 
          : isDragOver
            ? 'bg-blue-50 border-blue-200'
            : 'hover:bg-muted border-gray-200 hover:border-gray-300'
      } ${isDragging ? 'opacity-50' : 'opacity-100'}`}
      onClick={() => onSlideClick(slide.id)}
    >
      <div className="flex items-center gap-2 flex-1">
        <div 
          className="cursor-grab active:cursor-grabbing p-1 -ml-1" 
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
        <span className="flex items-center justify-center bg-muted w-5 h-5 rounded-full text-[10px] font-medium">
          {index + 1}
        </span>
        <span className="text-sm truncate">{slide.title}</span>
      </div>
      {allowDeletion && (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 opacity-60 hover:opacity-100"
          onClick={(e) => {
            e.stopPropagation();
            onDeleteSlide(slide.id);
          }}
        >
          <Trash className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
};

export default DraggableSlideItem;