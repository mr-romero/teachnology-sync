import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { LayoutGrid, Columns, AlignVerticalJustifyCenter, Maximize, Move } from 'lucide-react';
import { LessonSlide, SlideLayout } from '@/types/lesson';
import { cn } from '@/lib/utils';

interface SlideLayoutManagerProps {
  slide: LessonSlide;
  onLayoutChange: (slideId: string, layout: SlideLayout) => void;
}

const SlideLayoutManager: React.FC<SlideLayoutManagerProps> = ({
  slide,
  onLayoutChange
}) => {
  // Get current layout or initialize with defaults
  const [layout, setLayout] = useState<SlideLayout>(
    slide.layout || {
      columnCount: 1,
      columnWidths: [100],
      blockAssignments: {}
    }
  );

  // Track which block is being dragged and over which column
  const [draggedBlockId, setDraggedBlockId] = useState<string | null>(null);
  const [dragOverColumnIndex, setDragOverColumnIndex] = useState<number | null>(null);

  // Handle column count change
  const handleColumnCountChange = (count: number) => {
    // Adjust column widths to be equal percentages
    const equalWidth = Math.floor(100 / count);
    const widths = Array(count).fill(equalWidth);
    
    // Ensure widths sum to 100%
    widths[count - 1] = 100 - (equalWidth * (count - 1));
    
    // Create new layout
    const newLayout: SlideLayout = {
      columnCount: count,
      columnWidths: widths,
      blockAssignments: { ...layout.blockAssignments }
    };
    
    // Clear assignments for columns that no longer exist
    for (const blockId in newLayout.blockAssignments) {
      if (newLayout.blockAssignments[blockId] >= count) {
        newLayout.blockAssignments[blockId] = 0; // Reset to first column
      }
    }
    
    setLayout(newLayout);
    onLayoutChange(slide.id, newLayout);
  };

  // Handle column width change
  const handleColumnWidthChange = (index: number, value: number[]) => {
    // Calculate how much we're adjusting this column
    const diff = value[0] - layout.columnWidths[index];
    
    // Can't have a column smaller than 10% or larger than 90%
    if (layout.columnWidths[index] + diff < 10 || layout.columnWidths[index] + diff > 90) {
      return;
    }
    
    // Distribute the difference to other columns proportionally
    const newWidths = [...layout.columnWidths];
    newWidths[index] = value[0];
    
    // Find another column to adjust (the next one, or the first if this is the last)
    const adjustIndex = index < newWidths.length - 1 ? index + 1 : 0;
    newWidths[adjustIndex] = newWidths[adjustIndex] - diff;
    
    // Ensure we don't make any column too small
    if (newWidths[adjustIndex] < 10) {
      return;
    }
    
    const newLayout = {
      ...layout,
      columnWidths: newWidths
    };
    
    setLayout(newLayout);
    onLayoutChange(slide.id, newLayout);
  };

  // Handle block assignment to a column
  const handleBlockAssigned = (blockId: string, columnIndex: number) => {
    const newAssignments = {
      ...layout.blockAssignments,
      [blockId]: columnIndex
    };
    
    const newLayout = {
      ...layout,
      blockAssignments: newAssignments
    };
    
    setLayout(newLayout);
    onLayoutChange(slide.id, newLayout);
  };

  // Get the blocks assigned to a specific column
  const getColumnBlocks = (columnIndex: number) => {
    return slide.blocks.filter(block => {
      // If the block isn't assigned to any column yet, default to column 0
      const assignedColumn = layout.blockAssignments[block.id] ?? 0;
      return assignedColumn === columnIndex;
    });
  };

  // Handle drag start
  const handleDragStart = (blockId: string) => {
    setDraggedBlockId(blockId);
  };

  // Handle drag end
  const handleDragEnd = () => {
    if (draggedBlockId && dragOverColumnIndex !== null) {
      handleBlockAssigned(draggedBlockId, dragOverColumnIndex);
    }
    
    setDraggedBlockId(null);
    setDragOverColumnIndex(null);
  };

  return (
    <div className="space-y-6 border rounded-lg p-4 bg-muted/10">
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-medium">Slide Layout</h3>
          <div className="flex space-x-1">
            {[1, 2, 3, 4].map((count) => (
              <Button
                key={count}
                variant={layout.columnCount === count ? "default" : "outline"}
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => handleColumnCountChange(count)}
                title={`${count} column${count > 1 ? 's' : ''}`}
              >
                {count === 1 && <AlignVerticalJustifyCenter className="h-4 w-4" />}
                {count === 2 && <Columns className="h-4 w-4" />}
                {count === 3 && <LayoutGrid className="h-4 w-4" />}
                {count === 4 && <Maximize className="h-4 w-4" />}
              </Button>
            ))}
          </div>
        </div>
        
        {layout.columnCount > 1 && (
          <div className="space-y-3 mt-4">
            <h4 className="text-xs font-medium text-muted-foreground">Column Widths</h4>
            
            {layout.columnWidths.map((width, index) => (
              <div key={index} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs">Column {index + 1}</span>
                  <span className="text-xs font-medium">{width}%</span>
                </div>
                <Slider
                  value={[width]}
                  min={10}
                  max={90}
                  step={5}
                  onValueChange={(value) => handleColumnWidthChange(index, value)}
                />
              </div>
            ))}
          </div>
        )}
      </div>
      
      <div className="space-y-3">
        <h4 className="text-xs font-medium text-muted-foreground">
          {layout.columnCount > 1 
            ? "Drag blocks to assign to columns" 
            : "Single column layout (all blocks in sequence)"}
        </h4>
        
        {layout.columnCount > 1 && (
          <div 
            className="grid gap-2"
            style={{ 
              gridTemplateColumns: layout.columnWidths.map(w => `${w}%`).join(' ') 
            }}
          >
            {Array.from({length: layout.columnCount}).map((_, colIndex) => (
              <div
                key={colIndex}
                className={cn(
                  "min-h-[100px] p-2 rounded-md border-2 border-dashed",
                  dragOverColumnIndex === colIndex ? "bg-primary/10 border-primary" : "border-muted"
                )}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverColumnIndex(colIndex);
                }}
                onDragLeave={() => setDragOverColumnIndex(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  handleDragEnd();
                }}
              >
                <div className="text-xs font-medium text-center mb-2 text-muted-foreground">
                  Column {colIndex + 1}
                </div>
                
                {getColumnBlocks(colIndex).map(block => (
                  <div
                    key={block.id}
                    draggable
                    onDragStart={() => handleDragStart(block.id)}
                    onDragEnd={handleDragEnd}
                    className={cn(
                      "p-2 mb-2 rounded-md border",
                      draggedBlockId === block.id ? "opacity-50" : "",
                      "bg-card cursor-move flex items-center gap-2"
                    )}
                  >
                    <Move className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs truncate">{block.type} Block</span>
                  </div>
                ))}
                
                {getColumnBlocks(colIndex).length === 0 && (
                  <div className="text-xs text-center text-muted-foreground p-2">
                    Drag blocks here
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SlideLayoutManager;