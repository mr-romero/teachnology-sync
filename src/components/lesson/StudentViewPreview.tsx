import React from 'react';
import { cn } from '@/lib/utils';
import { LessonSlide, LessonBlock } from '@/types/lesson';
import ImageViewer from './ImageViewer';

interface StudentViewPreviewProps {
  slide: LessonSlide;
  className?: string;
  showRealContent?: boolean;
}

/**
 * A miniature preview of how the slide will look in student view
 * Shows the actual content that students would see
 */
const StudentViewPreview: React.FC<StudentViewPreviewProps> = ({
  slide,
  className,
  showRealContent = false
}) => {
  // Check if this slide uses a grid layout
  const useGridLayout = slide.layout?.gridRows && slide.layout?.gridColumns && 
    (slide.layout.gridRows > 1 || slide.layout.gridColumns > 1);
  
  // Get grid dimensions
  const gridSize = {
    rows: slide.layout?.gridRows || 1,
    columns: slide.layout?.gridColumns || 1
  };
  
  // Helper to get block position in the grid
  const getBlockPosition = (blockId: string) => {
    if (!slide.layout?.blockPositions) return { row: 0, column: 0 };
    const position = slide.layout.blockPositions[blockId];
    return position || { row: 0, column: 0 };
  };
  
  // Helper to get block span in the grid
  const getBlockSpan = (blockId: string) => {
    if (!slide.layout?.blockSpans) return { rowSpan: 1, columnSpan: 1 };
    const span = slide.layout.blockSpans[blockId];
    return span || { rowSpan: 1, columnSpan: 1 };
  };
  
  // Block renderer - either shows placeholder or actual content
  const renderBlock = (block: LessonBlock) => {
    if (!showRealContent) {
      // Simple block renderer - just shows basic placeholder for each block type
      switch(block.type) {
        case 'text':
          return <div className="w-full h-2 bg-slate-300 rounded"></div>;
        case 'heading':
          return <div className="w-full h-3 bg-slate-400 rounded"></div>;
        case 'image':
          return <div className="w-full h-full bg-slate-200 rounded flex items-center justify-center">
            <div className="w-3 h-3 bg-slate-300 rounded-sm"></div>
          </div>;
        case 'question':
          return (
            <div className="space-y-1">
              <div className="w-full h-2 bg-amber-200 rounded"></div>
              <div className="flex gap-1">
                <div className="w-1 h-1 rounded-full bg-amber-300"></div>
                <div className="w-full h-1 bg-amber-100 rounded"></div>
              </div>
            </div>
          );
        case 'graph':
          return <div className="w-full h-full bg-green-100 rounded flex items-center justify-center">
            <div className="w-4 h-3 bg-green-200 rounded-sm"></div>
          </div>;
        default:
          return <div className="w-full h-2 bg-slate-200 rounded"></div>;
      }
    } else {
      // Show actual content
      switch(block.type) {
        case 'text':
          return (
            <div className="prose prose-sm max-w-none overflow-hidden text-[7px] leading-tight">
              {block.content ? String(block.content) : ''}
            </div>
          );
        case 'heading':
          return (
            <div className="font-bold text-[8px] leading-tight">
              {block.content ? String(block.content) : ''}
            </div>
          );
        case 'image':
          return (
            <div className="w-full h-full flex items-center justify-center">
              <ImageViewer 
                url={block.content as string} 
                className="max-h-full object-contain rounded-sm"
                disableControls={true}
              />
            </div>
          );
        case 'question':
          return (
            <div className="text-[7px] space-y-0.5">
              <div className="font-medium text-amber-700">
                {block.content ? String(block.content) : 'Question'}
              </div>
              {block.options && (
                <div className="space-y-0.5">
                  {(block.options as string[]).map((option, i) => (
                    <div key={i} className="flex items-center gap-0.5">
                      <div className="w-1 h-1 rounded-full border border-amber-400"></div>
                      <div className="text-[6px]">{option}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        case 'graph':
          return (
            <div className="w-full h-full bg-green-50 rounded flex items-center justify-center">
              <div className="text-[6px] text-center text-green-700">Graph: {block.title || 'Coordinate System'}</div>
            </div>
          );
        default:
          return (
            <div className="text-[7px] text-muted-foreground">
              {block.content ? String(block.content).substring(0, 50) + '...' : `${block.type} content`}
            </div>
          );
      }
    }
  };
  
  return (
    <div className={cn(
      "w-full h-full overflow-hidden bg-white",
      useGridLayout ? "p-1" : "p-1.5", 
      className
    )}>
      {useGridLayout ? (
        // Grid layout preview
        <div 
          className="grid gap-1 w-full h-full" 
          style={{ 
            gridTemplateRows: `repeat(${gridSize.rows}, minmax(0, 1fr))`,
            gridTemplateColumns: `repeat(${gridSize.columns}, minmax(0, 1fr))`
          }}
        >
          {slide.blocks.map((block) => {
            const position = getBlockPosition(block.id);
            const blockSpan = getBlockSpan(block.id);
            
            return (
              <div 
                key={block.id} 
                className="bg-card border rounded overflow-hidden p-0.5"
                style={{
                  gridRowStart: position.row + 1,
                  gridRowEnd: position.row + 1 + (blockSpan.rowSpan || 1),
                  gridColumnStart: position.column + 1,
                  gridColumnEnd: position.column + 1 + (blockSpan.columnSpan || 1)
                }}
              >
                {renderBlock(block)}
              </div>
            );
          })}
        </div>
      ) : (
        // Linear layout preview
        <div className="space-y-1 w-full h-full flex flex-col">
          {slide.blocks.map((block) => (
            <div key={block.id} className="border rounded p-0.5 flex-grow overflow-hidden">
              {renderBlock(block)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StudentViewPreview;