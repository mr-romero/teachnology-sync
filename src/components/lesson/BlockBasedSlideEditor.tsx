import React, { useState, useRef, useEffect } from 'react';
import { LessonSlide, LessonBlock, GridPosition, GridSpan } from '@/types/lesson';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Trash, 
  Copy,
  Grid2x2,
  Grid3x3,
  ScrollText,
  Columns,
  RowsIcon,
  PanelTopIcon,
  Plus,
  Minus,
  MoveIcon,
  StretchHorizontal,
  StretchVertical,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Define DnD item types
const ItemTypes = {
  BLOCK: 'block',
  CELL: 'cell'
};

// Define DnD drag item structure
interface DragItem {
  type: string;
  id: string;
  originalPosition?: GridPosition;
}

// Main component
interface BlockBasedSlideEditorProps {
  slide: LessonSlide;
  onUpdateSlide: (updatedSlide: LessonSlide) => void;
  renderBlockPreview: (block: LessonBlock) => React.ReactNode;
}

// Span Controls - new component for setting columns spans
const SpanControls = ({ 
  blockId, 
  span,
  maxColumns,
  maxRows,
  onUpdateSpan 
}: { 
  blockId: string; 
  span?: GridSpan;
  maxColumns: number;
  maxRows: number;
  onUpdateSpan: (blockId: string, span: GridSpan) => void;
}) => {
  const columnSpan = span?.columnSpan || 1;
  const rowSpan = span?.rowSpan || 1;
  
  return (
    <div className="flex items-center space-x-2 mt-2">
      <div className="flex items-center">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              disabled={columnSpan <= 1}
              onClick={() => onUpdateSpan(blockId, { 
                ...span, 
                columnSpan: Math.max(1, (columnSpan || 1) - 1) 
              })}
            >
              <Minimize2 className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Reduce column span</TooltipContent>
        </Tooltip>
        
        <div className="mx-1 flex items-center space-x-1">
          <StretchHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-medium">{columnSpan}</span>
        </div>
        
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              disabled={columnSpan >= maxColumns}
              onClick={() => onUpdateSpan(blockId, { 
                ...span, 
                columnSpan: Math.min(maxColumns, (columnSpan || 1) + 1) 
              })}
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Increase column span</TooltipContent>
        </Tooltip>
      </div>
      
      {/* We can enable row span controls later if needed */}
      {/* <div className="flex items-center">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              disabled={rowSpan <= 1}
              onClick={() => onUpdateSpan(blockId, { 
                ...span, 
                rowSpan: Math.max(1, (rowSpan || 1) - 1) 
              })}
            >
              <Minimize2 className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Reduce row span</TooltipContent>
        </Tooltip>
        
        <div className="mx-1 flex items-center space-x-1">
          <StretchVertical className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-medium">{rowSpan}</span>
        </div>
        
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              disabled={rowSpan >= maxRows}
              onClick={() => onUpdateSpan(blockId, { 
                ...span, 
                rowSpan: Math.min(maxRows, (rowSpan || 1) + 1) 
              })}
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Increase row span</TooltipContent>
        </Tooltip>
      </div> */}
    </div>
  );
};

// Grid Controls component for choosing layouts
const GridLayoutControls = ({ 
  onChangeGridSize,
  gridSize,
  maxSize = 4,
  selectedBlockId,
  onPositionBlock
}: { 
  onChangeGridSize: (rows: number, columns: number) => void;
  gridSize: { rows: number, columns: number };
  maxSize?: number;
  selectedBlockId: string | null;
  onPositionBlock: (blockId: string, position: GridPosition) => void;
}) => {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="h-8 px-2">
          <Grid2x2 className="h-4 w-4 mr-2" />
          <span>Grid Layout</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-4">
        <div className="space-y-4">
          <h4 className="font-medium text-sm">Layout Grid</h4>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs">Rows: {gridSize.rows}</span>
              <div className="flex items-center space-x-1">
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="h-6 w-6"
                  onClick={() => onChangeGridSize(Math.max(1, gridSize.rows - 1), gridSize.columns)}
                  disabled={gridSize.rows <= 1}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="h-6 w-6"
                  onClick={() => onChangeGridSize(Math.min(maxSize, gridSize.rows + 1), gridSize.columns)}
                  disabled={gridSize.rows >= maxSize}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-xs">Columns: {gridSize.columns}</span>
              <div className="flex items-center space-x-1">
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="h-6 w-6"
                  onClick={() => onChangeGridSize(gridSize.rows, Math.max(1, gridSize.columns - 1))}
                  disabled={gridSize.columns <= 1}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="h-6 w-6"
                  onClick={() => onChangeGridSize(gridSize.rows, Math.min(maxSize, gridSize.columns + 1))}
                  disabled={gridSize.columns >= maxSize}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>

          <div className="my-3 border-t pt-3">
            <h4 className="font-medium text-sm mb-2">Preview</h4>
            <div 
              className="grid gap-1 border rounded-md p-1.5 bg-muted/20" 
              style={{ 
                gridTemplateRows: `repeat(${gridSize.rows}, minmax(0, 1fr))`,
                gridTemplateColumns: `repeat(${gridSize.columns}, minmax(0, 1fr))`,
              }}
            >
              {Array.from({ length: gridSize.rows * gridSize.columns }).map((_, index) => {
                const row = Math.floor(index / gridSize.columns);
                const column = index % gridSize.columns;
                return (
                  <div 
                    key={index}
                    className={cn(
                      "h-8 border border-dashed rounded transition-colors",
                      selectedBlockId ? "cursor-pointer hover:bg-primary/10" : "bg-muted/20"
                    )}
                    onClick={() => {
                      if (selectedBlockId) {
                        onPositionBlock(selectedBlockId, { row, column });
                        setOpen(false);
                      }
                    }}
                  />
                );
              })}
            </div>
            
            {selectedBlockId ? (
              <div className="text-xs text-center mt-2 text-muted-foreground">
                Click on a cell to position the selected block
              </div>
            ) : (
              <div className="text-xs text-center mt-2 text-amber-600">
                Select a block first to position it
              </div>
            )}
          </div>
          
          <div className="flex justify-between pt-2 border-t">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onChangeGridSize(1, 1)}
                  >
                    <PanelTopIcon className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Single Column</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onChangeGridSize(1, 2)}
                  >
                    <Columns className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Two Columns</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onChangeGridSize(2, 1)}
                  >
                    <RowsIcon className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Two Rows</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onChangeGridSize(2, 2)}
                  >
                    <Grid2x2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>2x2 Grid</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onChangeGridSize(3, 3)}
                  >
                    <Grid3x3 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>3x3 Grid</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

// Draggable Block component
const DraggableBlock = ({ 
  block, 
  isSelected, 
  onSelect, 
  onDuplicate, 
  onDelete, 
  renderPreview,
  position,
  span,
  maxColumns,
  maxRows,
  onUpdateSpan
}: { 
  block: LessonBlock; 
  isSelected: boolean;
  onSelect: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  renderPreview: (block: LessonBlock) => React.ReactNode;
  position: GridPosition;
  span?: GridSpan;
  maxColumns: number;
  maxRows: number;
  onUpdateSpan: (blockId: string, span: GridSpan) => void;
}) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.BLOCK,
    item: { 
      type: ItemTypes.BLOCK, 
      id: block.id,
      originalPosition: position
    },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }), [block.id, position]);

  return (
    <div 
      ref={drag}
      className={cn(
        "relative mb-4 p-4 border rounded-md group transition-all cursor-move",
        isSelected ? "ring-2 ring-primary" : "",
        isDragging ? "opacity-50" : "opacity-100",
        // Add a visual indicator for blocks that span multiple columns
        span?.columnSpan && span.columnSpan > 1 ? "border-violet-300 border-2 bg-violet-50/30" : ""
      )}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      {/* Span indicator badge - show for blocks that span multiple columns */}
      {span?.columnSpan && span.columnSpan > 1 && (
        <Badge 
          variant="span" 
          className="absolute top-1 right-1 z-10"
        >
          Spans {span.columnSpan} columns
        </Badge>
      )}
    
      {/* Drag handle */}
      <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100">
        <MoveIcon className="h-4 w-4 text-muted-foreground" />
      </div>
      
      {/* Preview content */}
      {renderPreview(block)}
      
      {/* Controls */}
      <div className={cn(
        "absolute top-2 right-2 flex space-x-1 opacity-0 group-hover:opacity-100"
      )}>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-6 w-6 bg-background/80 backdrop-blur-sm"
          onClick={(e) => {
            e.stopPropagation();
            onDuplicate();
          }}
        >
          <Copy className="h-3 w-3" />
        </Button>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-6 w-6 bg-background/80 backdrop-blur-sm text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <Trash className="h-3 w-3" />
        </Button>
      </div>

      {/* Column span controls - show when selected */}
      {isSelected && (
        <div className="mt-3 pt-3 border-t">
          <div className="flex justify-between items-center">
            <span className="text-xs font-medium text-muted-foreground">
              {maxColumns > 1 ? 
                `Column span (max: ${maxColumns})` : 
                "Add more columns to enable spanning"}
            </span>
            {maxColumns > 1 && (
              <SpanControls 
                blockId={block.id}
                span={span}
                maxColumns={maxColumns}
                maxRows={maxRows}
                onUpdateSpan={onUpdateSpan}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Droppable Cell component
const DroppableCell = ({ 
  position, 
  onDrop, 
  isEmpty, 
  children,
  span = { columnSpan: 1, rowSpan: 1 }
}: { 
  position: GridPosition; 
  onDrop: (blockId: string, position: GridPosition) => void;
  isEmpty: boolean;
  children: React.ReactNode;
  span?: GridSpan;
}) => {
  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: ItemTypes.BLOCK,
    drop: (item: DragItem) => {
      if (item.id) {
        onDrop(item.id, position);
      }
      return { position };
    },
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
      canDrop: !!monitor.canDrop(),
    }),
  }), [position, onDrop]);

  return (
    <div 
      ref={drop}
      className={cn(
        "min-h-[100px] p-2 rounded-md border border-dashed transition-colors",
        isOver && canDrop ? "bg-primary/10 border-primary" : 
        isEmpty ? "bg-muted/5 border-muted" : "border-transparent"
      )}
      style={{
        gridRow: position.row + 1, // 1-based in CSS grid
        gridColumn: span.columnSpan && span.columnSpan > 1
          ? `${position.column + 1} / span ${span.columnSpan}` // Apply span
          : `${position.column + 1}` // No span
      }}
    >
      {children}
    </div>
  );
};

const BlockBasedSlideEditor: React.FC<BlockBasedSlideEditorProps> = ({
  slide,
  onUpdateSlide,
  renderBlockPreview
}) => {
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  // Get grid size from slide layout or default to 1x1
  const gridSize = {
    rows: slide.layout?.gridRows || 1,
    columns: slide.layout?.gridColumns || 1
  };
  
  // Add effect to detect when dragging starts/ends to help with grid resize decisions
  useEffect(() => {
    const handleDragStart = () => setIsDragging(true);
    const handleDragEnd = () => setIsDragging(false);
    
    window.addEventListener('dragstart', handleDragStart);
    window.addEventListener('dragend', handleDragEnd);
    
    return () => {
      window.removeEventListener('dragstart', handleDragStart);
      window.removeEventListener('dragend', handleDragEnd);
    };
  }, []);
  
  // Handle grid size change
  const handleGridSizeChange = (rows: number, columns: number) => {
    const updatedSlide = { ...slide };
    
    // Ensure we have layout information
    if (!updatedSlide.layout) {
      updatedSlide.layout = {
        gridRows: rows,
        gridColumns: columns,
        blockPositions: {},
        blockSizes: {}
      };
    } else {
      updatedSlide.layout.gridRows = rows;
      updatedSlide.layout.gridColumns = columns;
    }
    
    // Ensure blockPositions exists
    if (!updatedSlide.layout.blockPositions) {
      updatedSlide.layout.blockPositions = {};
    }
    
    onUpdateSlide(updatedSlide);
  };

  // Handle positioning a block on the grid
  const handlePositionBlock = (blockId: string, position: GridPosition) => {
    if (!blockId) return;

    const updatedSlide = { ...slide };
    
    // Ensure we have layout information
    if (!updatedSlide.layout) {
      updatedSlide.layout = {
        gridRows: Math.max(2, position.row + 1),
        gridColumns: Math.max(2, position.column + 1),
        blockPositions: {},
        blockSizes: {}
      };
    }
    
    // Ensure blockPositions exists
    if (!updatedSlide.layout.blockPositions) {
      updatedSlide.layout.blockPositions = {};
    }
    
    // Check if we need to expand the grid
    let needsGridExpansion = false;
    
    // For 1-column layouts, automatically convert to 2-column when dragging
    if (updatedSlide.layout.gridColumns === 1 && updatedSlide.blocks.length > 1) {
      updatedSlide.layout.gridColumns = 2;
      needsGridExpansion = true;
    }
    
    // Update grid dimensions if necessary
    if (position.row >= (updatedSlide.layout.gridRows || 1)) {
      updatedSlide.layout.gridRows = position.row + 1;
      needsGridExpansion = true;
    }
    
    if (position.column >= (updatedSlide.layout.gridColumns || 1)) {
      updatedSlide.layout.gridColumns = position.column + 1;
      needsGridExpansion = true;
    }
    
    // Set the position for this block
    updatedSlide.layout.blockPositions[blockId] = position;
    
    // If we've expanded to a 2-column layout from a 1-column layout
    // and there are other blocks that don't have explicit positions yet,
    // distribute them between the columns
    if (needsGridExpansion && updatedSlide.layout.gridColumns === 2) {
      // Find blocks without positions and put them in column 0
      let blocksInColumn0 = 0;
      let blocksInColumn1 = 0;
      
      // Count existing blocks in each column
      Object.entries(updatedSlide.layout.blockPositions).forEach(([id, pos]) => {
        if (pos.column === 0) blocksInColumn0++;
        if (pos.column === 1) blocksInColumn1++;
      });
      
      // Place the blocks without positions
      updatedSlide.blocks.forEach(block => {
        // Skip the block we're currently positioning
        if (block.id === blockId) return;
        
        // Skip blocks that already have positions
        if (updatedSlide.layout?.blockPositions?.[block.id]) return;
        
        // Determine which column to place this block in
        let targetColumn = 0;
        if (blocksInColumn0 > blocksInColumn1) {
          targetColumn = 1;
          blocksInColumn1++;
        } else {
          blocksInColumn0++;
        }
        
        // Assign a position to this block
        updatedSlide.layout.blockPositions[block.id] = {
          row: 0,
          column: targetColumn
        };
      });
    }
    
    onUpdateSlide(updatedSlide);
  };

  // Function to get block span
  const getBlockSpan = (blockId: string): GridSpan => {
    if (slide.layout?.blockSpans?.[blockId]) {
      return slide.layout.blockSpans[blockId];
    }
    return { columnSpan: 1, rowSpan: 1 };
  };

  // Function to update block span
  const handleUpdateBlockSpan = (blockId: string, span: GridSpan) => {
    const updatedSlide = { ...slide };
    
    // Ensure we have layout information
    if (!updatedSlide.layout) {
      updatedSlide.layout = {
        gridRows: 1,
        gridColumns: 1,
        blockPositions: {},
        blockSpans: {}
      };
    }
    
    // Ensure blockSpans exists
    if (!updatedSlide.layout.blockSpans) {
      updatedSlide.layout.blockSpans = {};
    }
    
    // Update the span for this block
    updatedSlide.layout.blockSpans[blockId] = span;
    
    onUpdateSlide(updatedSlide);
  };

  // Function to duplicate a block
  const handleDuplicateBlock = (id: string) => {
    const blockToDuplicate = slide.blocks.find(block => block.id === id);
    if (!blockToDuplicate) return;
    
    // Create a new block with a new ID but same content
    const newBlock = {
      ...JSON.parse(JSON.stringify(blockToDuplicate)),
      id: `block-${Date.now()}`
    };
    
    // Find the index of the original block
    const blockIndex = slide.blocks.findIndex(block => block.id === id);
    
    // Insert the new block after the original
    const newBlocks = [...slide.blocks];
    newBlocks.splice(blockIndex + 1, 0, newBlock);
    
    // Copy the position too if it exists
    const updatedSlide = {
      ...slide,
      blocks: newBlocks
    };
    
    if (updatedSlide.layout?.blockPositions && id in updatedSlide.layout.blockPositions) {
      if (!updatedSlide.layout.blockPositions) {
        updatedSlide.layout.blockPositions = {};
      }
      
      // Find a new position for the duplicated block
      const originalPos = updatedSlide.layout.blockPositions[id];
      
      // Try to position it in the next cell to the right or below
      if (originalPos.column + 1 < (updatedSlide.layout.gridColumns || 1)) {
        // Position to the right
        updatedSlide.layout.blockPositions[newBlock.id] = {
          row: originalPos.row,
          column: originalPos.column + 1
        };
      } else if (originalPos.row + 1 < (updatedSlide.layout.gridRows || 1)) {
        // Position below
        updatedSlide.layout.blockPositions[newBlock.id] = {
          row: originalPos.row + 1,
          column: 0
        };
      } else {
        // Just keep same position if no space
        updatedSlide.layout.blockPositions[newBlock.id] = {...originalPos};
      }
    }
    
    onUpdateSlide(updatedSlide);
  };
  
  // Function to delete a block
  const handleDeleteBlock = (id: string) => {
    const newBlocks = slide.blocks.filter(block => block.id !== id);
    
    // Also remove any layout information for this block
    const updatedSlide = { ...slide, blocks: newBlocks };
    if (updatedSlide.layout?.blockSizes) {
      delete updatedSlide.layout.blockSizes[id];
    }
    if (updatedSlide.layout?.blockPositions) {
      delete updatedSlide.layout.blockPositions[id];
    }
    
    onUpdateSlide(updatedSlide);
  };
  
  // Get block position
  const getBlockPosition = (blockId: string): GridPosition => {
    if (slide.layout?.blockPositions?.[blockId]) {
      return slide.layout.blockPositions[blockId];
    }
    return { row: 0, column: 0 };
  };
  
  // Group blocks by grid position
  const getBlocksByPosition = () => {
    const result: {
      [rowCol: string]: LessonBlock[];
    } = {};
    
    // Create a grid with all possible positions based on the layout
    const rowCount = slide.layout?.gridRows || 1;
    const colCount = slide.layout?.gridColumns || 1;
    
    for (let row = 0; row < rowCount; row++) {
      for (let col = 0; col < colCount; col++) {
        const key = `${row}-${col}`;
        result[key] = [];
      }
    }
    
    // Assign blocks to their positions
    slide.blocks.forEach(block => {
      const position = getBlockPosition(block.id);
      const key = `${position.row}-${position.column}`;
      
      if (!result[key]) {
        result[key] = [];
      }
      
      result[key].push(block);
    });
    
    return result;
  };

  // Handle drop in a new column when we're in single column mode
  const handleDropInNewColumn = (blockId: string) => {
    // Only apply this logic if we're currently in a single column layout
    if ((slide.layout?.gridColumns || 1) === 1) {
      const updatedSlide = { ...slide };
      
      // Create or update layout
      if (!updatedSlide.layout) {
        updatedSlide.layout = {
          gridRows: 1,
          gridColumns: 2, // Expand to 2 columns
          blockPositions: {},
        };
      } else {
        updatedSlide.layout.gridColumns = 2; // Expand to 2 columns
        if (!updatedSlide.layout.blockPositions) {
          updatedSlide.layout.blockPositions = {};
        }
      }
      
      // Place the dragged block in column 1
      updatedSlide.layout.blockPositions[blockId] = {
        row: 0,
        column: 1
      };
      
      // Place all other blocks in column 0 if they don't have positions
      updatedSlide.blocks.forEach(block => {
        if (block.id !== blockId && !updatedSlide.layout?.blockPositions?.[block.id]) {
          updatedSlide.layout.blockPositions[block.id] = {
            row: 0,
            column: 0
          };
        }
      });
      
      onUpdateSlide(updatedSlide);
      return true;
    }
    return false;
  };

  const blocksByPosition = getBlocksByPosition();
  
  // Track if we're in single column mode with multiple blocks
  // This is where we want to add our special behavior
  const isInSingleColumnWithMultipleBlocks = 
    (slide.layout?.gridColumns || 1) === 1 && 
    slide.blocks.length > 1;

  // Correctly calculate max span for a block based on its position and grid size
  const getMaxSpan = (position: GridPosition): { maxColumns: number; maxRows: number } => {
    const totalCols = slide.layout?.gridColumns || 1;
    const totalRows = slide.layout?.gridRows || 1;
    
    // Calculate remaining columns from current position
    const remainingCols = totalCols - position.column;
    // Calculate remaining rows from current position
    const remainingRows = totalRows - position.row;
    
    return {
      maxColumns: remainingCols,
      maxRows: remainingRows
    };
  };
  
  return (
    <DndProvider backend={HTML5Backend}>
      <div className="w-full">
        <div className="mb-4 flex justify-between items-center">
          <h3 className="text-sm font-medium">Slide Layout</h3>
          <div className="flex items-center space-x-2">
            <p className="text-xs text-muted-foreground mr-2">
              {isInSingleColumnWithMultipleBlocks ? 
                'Drag a block to create a two-column layout' : 
                selectedBlockId ? 
                  'Select a cell to place the block or drag blocks between cells' : 
                  'Select a block to position it or make it span multiple columns'}
            </p>
            <GridLayoutControls 
              onChangeGridSize={handleGridSizeChange}
              gridSize={gridSize}
              selectedBlockId={selectedBlockId}
              onPositionBlock={handlePositionBlock}
            />
          </div>
        </div>
        
        <div className="min-h-[300px] border-dashed border-2 rounded-lg p-6 bg-background relative">
          {slide.blocks.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center text-muted-foreground py-12">
                <p>No content blocks yet</p>
                <p className="text-sm">Add blocks from the panel on the left and position them using the Grid Layout button</p>
              </div>
            </div>
          ) : (
            <div 
              className="grid gap-4" 
              style={{ 
                gridTemplateRows: `repeat(${gridSize.rows}, minmax(0, auto))`,
                gridTemplateColumns: `repeat(${gridSize.columns}, minmax(0, 1fr))`
              }}
            >
              {/* Render all grid cells */}
              {Object.keys(blocksByPosition).map(position => {
                const [row, col] = position.split('-').map(Number);
                const blocksInPosition = blocksByPosition[position] || [];
                const cellPosition = { row, column: col };
                
                // Skip rendering a cell if there's another cell that spans into this position
                const isSpannedOver = Object.entries(slide.layout?.blockPositions || {}).some(([blockId, pos]) => {
                  if (pos.row !== row || pos.column !== col) {
                    const blockSpan = getBlockSpan(blockId);
                    if (!blockSpan.columnSpan || blockSpan.columnSpan <= 1) return false;
                    
                    // Check if this span covers our position
                    return (
                      pos.row === row && // Same row
                      pos.column < col && // Column starts before current col
                      pos.column + (blockSpan.columnSpan || 1) > col // Span extends past current col
                    );
                  }
                  return false;
                });
                
                // Skip this cell if it's being spanned over by another block
                if (isSpannedOver) return null;
                
                // If this cell contains a block that spans multiple columns,
                // we need to pass that span information to the DroppableCell
                let cellSpan = { columnSpan: 1, rowSpan: 1 };
                
                if (blocksInPosition.length > 0) {
                  const block = blocksInPosition[0]; // Get the first block in this position
                  cellSpan = getBlockSpan(block.id);
                }
                
                return (
                  <DroppableCell 
                    key={position}
                    position={cellPosition}
                    span={cellSpan}
                    onDrop={(blockId, position) => {
                      // Check if we should handle this as a special case for creating columns
                      if (isInSingleColumnWithMultipleBlocks && col === 1 && row === 0) {
                        handleDropInNewColumn(blockId);
                      } else {
                        handlePositionBlock(blockId, position);
                      }
                    }}
                    isEmpty={blocksInPosition.length === 0}
                  >
                    {blocksInPosition.length === 0 ? (
                      <div className="h-full w-full flex items-center justify-center">
                        <span className="text-xs text-muted-foreground">
                          {isInSingleColumnWithMultipleBlocks && col === 1 ? 
                            "Drag here to create column" : 
                            `Empty cell (Row ${row+1}, Col ${col+1})`}
                        </span>
                      </div>
                    ) : (
                      blocksInPosition.map((block) => {
                        const blockSpan = getBlockSpan(block.id);
                        const { maxColumns, maxRows } = getMaxSpan(cellPosition);
                        
                        return (
                          <div 
                            key={block.id}
                            className="block-container w-full"
                          >
                            <DraggableBlock
                              block={block}
                              isSelected={selectedBlockId === block.id}
                              onSelect={() => setSelectedBlockId(block.id)}
                              onDuplicate={() => handleDuplicateBlock(block.id)}
                              onDelete={() => handleDeleteBlock(block.id)}
                              renderPreview={renderBlockPreview}
                              position={cellPosition}
                              span={blockSpan}
                              maxColumns={maxColumns}
                              maxRows={maxRows}
                              onUpdateSpan={handleUpdateBlockSpan}
                            />
                          </div>
                        );
                      })
                    )}
                  </DroppableCell>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </DndProvider>
  );
};

export default BlockBasedSlideEditor;