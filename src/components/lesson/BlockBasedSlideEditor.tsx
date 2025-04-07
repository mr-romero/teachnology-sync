import React, { useState, useRef, useEffect } from 'react';
import { LessonSlide, LessonBlock, GridPosition, GridSpan, FeedbackQuestionBlock } from '@/types/lesson';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/AuthContext'; // Added
import { uploadImage } from '@/services/imageService'; // Added
import { analyzeQuestionImage } from '@/services/aiService'; // Added
import { toast } from '@/components/ui/sonner';
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
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger
} from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import LessonBlockEditor from './LessonBlockEditor';
import BlockConnectionManager, { BlockConnection } from './BlockConnectionManager';

// Add at the top of the file, after other imports
declare global {
  interface Window {
    showBlockSettings?: (blockId: string) => void;
    updateConnectionsFromLayout?: () => void;
    addSplitBlocks?: (blocks: LessonBlock[]) => void;
  }
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
      
      {/* Row span controls - now enabled */}
      <div className="flex items-center">
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
      </div>
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
  onUpdateSpan,
  isDirectEditing,
  onDoubleClick,
  onDirectEditComplete
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
  isDirectEditing: boolean;
  onDoubleClick: (block: LessonBlock) => void;
  onDirectEditComplete: (blockId: string, value: string) => void;
}) => {
  return (
    <div 
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', block.id);
        e.stopPropagation();
      }}
      className={cn(
        "relative mb-4 p-4 border rounded-md group transition-all cursor-move min-h-[200px]",
        isSelected ? "ring-2 ring-primary" : "",
        // Add visual indicators for split feedback blocks
        block.type === 'feedback-question' && block.isGrouped ? "border-purple-300 border-2 bg-purple-50/30" : "",
        // Add visual indicator for blocks that span multiple columns
        span?.columnSpan && span.columnSpan > 1 ? "border-violet-300 border-2 bg-violet-50/30" : "",
        // Special styling for feedback blocks
        block.type === 'feedback-question' ? "flex flex-col justify-between" : ""
      )}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onDoubleClick(block);
      }}
    >
      {/* Group indicator badge for split feedback blocks */}
      {block.type === 'feedback-question' && block.isGrouped && block.groupId && (
        <Badge 
          variant="outline" 
          className="absolute top-2 left-2 z-10 bg-purple-100 text-purple-700 hover:bg-purple-100"
        >
          Group: {block.groupId}
        </Badge>
      )}

      {/* Display mode badge for split feedback blocks */}
      {block.type === 'feedback-question' && block.displayMode && (
        <Badge 
          variant="outline" 
          className="absolute top-2 right-2 z-10 bg-purple-100 text-purple-700 hover:bg-purple-100"
        >
          {block.displayMode === 'image' ? 'Image' : 
           block.displayMode === 'question' ? 'Question' : 
           'Feedback'}
        </Badge>
      )}

      {/* Span indicator badge - show for blocks that span multiple columns */}
      {span?.columnSpan && span.columnSpan > 1 && (
        <Badge 
          variant="span" 
          className="absolute bottom-2 left-2 z-10 bg-violet-100 text-violet-700 hover:bg-violet-100"
        >
          Spans {span.columnSpan} columns
        </Badge>
      )}
    
      {/* Drag handle */}
      <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100">
        <MoveIcon className="h-4 w-4 text-muted-foreground" />
      </div>
      
      {/* Preview content */}
      <div className="pointer-events-none">
        {renderPreview(block)}
      </div>
      
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
          className="h-6 w-6 bg-background/80 backdrop-blur-sm"
          onClick={(e) => {
            e.stopPropagation();
            // Here we would trigger the settings dialog for this block
            if (window.showBlockSettings) {
              window.showBlockSettings(block.id);
            }
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 15 15" fill="none" className="h-3 w-3">
            <path d="M8.625 2.5C8.625 3.12132 8.12132 3.625 7.5 3.625C6.87868 3.625 6.375 3.12132 6.375 2.5C6.375 1.87868 6.87868 1.375 7.5 1.375C8.12132 1.375 8.625 1.87868 8.625 2.5ZM8.625 7.5C8.625 8.12132 8.12132 8.625 7.5 8.625C6.87868 8.625 6.375 8.12132 6.375 7.5C6.375 6.87868 6.87868 6.375 7.5 6.375C8.12132 6.375 8.625 6.87868 8.625 7.5ZM7.5 13.625C8.12132 13.625 8.625 13.1213 8.625 12.5C8.625 11.8787 8.12132 11.375 7.5 11.375C6.87868 11.375 6.375 11.8787 6.375 12.5C6.375 13.1213 6.87868 13.625 7.5 13.625Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
          </svg>
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
  onDrop: (blockId: string, position: GridPosition, dataTransfer?: DataTransfer) => void;
  isEmpty: boolean;
  children: React.ReactNode;
  span?: GridSpan;
}) => {
  return (
    <div 
      className={cn(
        "min-h-[100px] p-2 rounded-md border border-dashed transition-colors",
        isEmpty ? "bg-muted/5 border-muted" : "border-transparent"
      )}
      style={{
        gridRow: span.rowSpan && span.rowSpan > 1
          ? `${position.row + 1} / span ${span.rowSpan}`
          : `${position.row + 1}`,
        gridColumn: span.columnSpan && span.columnSpan > 1
          ? `${position.column + 1} / span ${span.columnSpan}`
          : `${position.column + 1}`
      }}
      onDragOver={(e) => {
        e.preventDefault(); // Crucial: Allow dropping
        e.dataTransfer.dropEffect = 'copy'; // Indicate copy is allowed (or 'move')
        console.log('[DroppableCell] onDragOver triggered for cell:', position); // Log
      }}
      onDrop={(e) => {
        e.preventDefault(); // Prevent default drop behavior
        const blockId = e.dataTransfer.getData('text/plain');
        console.log('[DroppableCell] onDrop triggered for cell:', position, 'Data:', blockId, 'Files:', e.dataTransfer.files); // Added log
        if (blockId || e.dataTransfer.files.length > 0) { // Check for files too
          // Pass the blockId (if available) or a marker for file drop
          onDrop(blockId || 'file_drop', position, e.dataTransfer); 
        } else {
          console.warn('[DroppableCell] onDrop triggered but no blockId or files found.'); // Added log
        }
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
  const [directEditingBlock, setDirectEditingBlock] = useState<string | null>(null);
  const { user } = useAuth(); // Added
  
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

  // Handle dropping a new block type from the sidebar
  const handleDropNewBlockType = async (blockType: string, position: GridPosition) => {
    // Create a new block based on the type
    let newBlock: LessonBlock;
    const blockId = `block-${Date.now()}`;

    // Get user's model settings
    const { data: { user } } = await supabase.auth.getUser();
    let modelSettings = {
      default_model: getDefaultModel(),
      openrouter_endpoint: 'https://openrouter.ai/api/v1/chat/completions'
    };
    
    if (user?.id) {
      modelSettings = await getModelSettings(user.id);
    }
    
    // If it's a feedback block, create it with default layout and trigger wizard
    if (blockType === 'feedback-question') {
      const feedbackBlock: FeedbackQuestionBlock = {
        id: blockId,
        type: 'feedback-question',
        questionText: 'Enter your question here',
        questionType: 'multiple-choice',
        options: ['Option 1', 'Option 2', 'Option 3'],
        correctAnswer: 'Option 1',
        feedbackInstructions: 'Ask me questions about this topic.',
        feedbackSystemPrompt: 'You are a helpful AI tutor. Provide encouraging and informative feedback on the student\'s answer. If they got it correct, explain why. If they got it wrong, guide them toward the correct understanding without directly giving the answer.',
        feedbackSentenceStarters: ['Can you explain why?', 'I need help with...', 'How did you get that?'],
        apiEndpoint: modelSettings.openrouter_endpoint,
        modelName: modelSettings.default_model,
        optionStyle: 'A-D',
        repetitionPrevention: 'You should provide a direct answer to the question rather than repeating the prompt.',
        imageUrl: '',
        imageAlt: ''
      };

      // Add the block to the slide
      handleDropBlock(feedbackBlock, position);

      // After a short delay, show the block settings dialog
      setTimeout(() => {
        if (window.showBlockSettings) {
          window.showBlockSettings(blockId);
        }
      }, 100);

      return;
    }

    // Create a new block based on the type
    switch (blockType) {
      case 'ai-chat':
        newBlock = {
          id: blockId,
          type: 'ai-chat',
          instructions: 'Ask me questions about this topic.',
          sentenceStarters: ['What is...?', 'Can you explain...?', 'Why does...?'],
          apiEndpoint: modelSettings.openrouter_endpoint,
          modelName: modelSettings.default_model,
          systemPrompt: `You are a helpful AI assistant for education. Help the student understand the topic while guiding them toward the correct understanding.

When responding with mathematical content:
- Use \\( and \\) for inline math expressions
- Use \\[ and \\] for displayed math expressions
- Format equations and mathematical symbols properly
- Be consistent with LaTeX notation throughout the response`,
        };
        break;
        
      // ...rest of the switch cases...

      default:
        return;
    }
    
    // ...rest of the function implementation...
  };

  // Helper function to create a new block
  const createBlock = (blockType: string, overrides: any = {}): LessonBlock => {
    const blockId = overrides.id || `block-${Date.now()}`;
    
    switch (blockType) {
      case 'text':
        return {
          id: blockId,
          type: 'text',
          content: 'Enter your text here',
          ...overrides
        };
      case 'image':
        return {
          id: blockId,
          type: 'image',
          url: '',
          alt: '',
          ...overrides
        };
      case 'question':
        return {
          id: blockId,
          type: 'question',
          questionType: 'multiple-choice',
          question: 'Enter your question here',
          options: ['Option 1', 'Option 2', 'Option 3'],
          correctAnswer: 'Option 1',
          ...overrides
        };
      case 'graph':
        return {
          id: blockId,
          type: 'graph',
          equation: 'y = x^2',
          settings: {
            xMin: -10,
            xMax: 10,
            yMin: -10,
            yMax: 10
          },
          ...overrides
        };
      case 'ai-chat':
        return {
          id: blockId,
          type: 'ai-chat',
          instructions: 'Ask me questions about this topic.',
          sentenceStarters: ['What is...?', 'Can you explain...?', 'Why does...?'],
          apiEndpoint: 'https://openrouter.ai/api/v1/chat/completions',
          modelName: 'gpt-4o-mini',
          systemPrompt: `You are a helpful AI assistant for education. Help the student understand the topic while guiding them toward the correct understanding.

When responding with mathematical content:
- Use \\( and \\) for inline math expressions
- Use \\[ and \\] for displayed math expressions
- Format equations and mathematical symbols properly
- Be consistent with LaTeX notation throughout the response`,
          ...overrides
        };
      case 'feedback-question':
        return {
          id: blockId,
          type: 'feedback-question',
          questionText: 'Enter your question here',
          questionType: 'multiple-choice',
          options: ['Option 1', 'Option 2', 'Option 3'],
          correctAnswer: 'Option 1',
          feedbackInstructions: 'Ask me questions about this topic.',
          feedbackSystemPrompt: 'You are a helpful AI tutor. Provide encouraging and informative feedback on the student\'s answer. If they got it correct, explain why. If they got it wrong, guide them toward the correct understanding without directly giving the answer.',
          feedbackSentenceStarters: ['Can you explain why?', 'I need help with...', 'How did you get that?'],
          apiEndpoint: 'https://openrouter.ai/api/v1/chat/completions',
          modelName: 'mistralai/mistral-small-3.1-24b-instruct',
          optionStyle: 'A-D',
          repetitionPrevention: 'You should provide a direct answer to the question rather than repeating the prompt. Focus on explaining the solution step by step.',
          ...overrides
        };
      default:
        throw new Error(`Unknown block type: ${blockType}`);
    }
  };

  // Helper function to add a block and position it
  const handleDropBlock = (block: LessonBlock, position: GridPosition) => {
    const updatedSlide = { ...slide };
    
    // Add the block to the slide
    updatedSlide.blocks = [...updatedSlide.blocks, block];
    
    // Make sure layout exists
    if (!updatedSlide.layout) {
      updatedSlide.layout = {
        gridRows: Math.max(position.row + 1, slide.layout?.gridRows || 1),
        gridColumns: Math.max(position.column + 1, slide.layout?.gridColumns || 1),
        blockPositions: {},
      };
    }
    
    // Ensure blockPositions exists
    if (!updatedSlide.layout.blockPositions) {
      updatedSlide.layout.blockPositions = {};
    }
    
    // Position the block
    updatedSlide.layout.blockPositions[block.id] = position;
    
    // Update grid dimensions if necessary
    updatedSlide.layout.gridRows = Math.max(position.row + 1, updatedSlide.layout.gridRows || 1);
    updatedSlide.layout.gridColumns = Math.max(position.column + 1, updatedSlide.layout.gridColumns || 1);
    
    onUpdateSlide(updatedSlide);
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
  
  // Add a global handler to display settings when showBlockSettings is called
  const [blockSettingsDialogOpen, setBlockSettingsDialogOpen] = useState(false);
  const [currentEditingBlock, setCurrentEditingBlock] = useState<LessonBlock | null>(null);

  useEffect(() => {
    // Define the window method for showing block settings
    window.showBlockSettings = (blockId: string) => {
      // Find the block to make it active for editing
      const block = slide.blocks.find(b => b.id === blockId);
      if (block) {
        setSelectedBlockId(blockId);
        setCurrentEditingBlock(block);
        setBlockSettingsDialogOpen(true);
      }
    };
    
    return () => {
      // Clean up when component unmounts
      delete window.showBlockSettings;
    };
  }, [slide.blocks]);

  // Handle block update from settings dialog
  const handleUpdateBlockFromSettings = (updatedBlock: LessonBlock) => {
    const updatedSlide = { ...slide };
    
    // Find and update the block
    updatedSlide.blocks = updatedSlide.blocks.map(block => 
      block.id === updatedBlock.id ? updatedBlock : block
    );
    
    onUpdateSlide(updatedSlide);
  };

  const handleDoubleClick = (block: LessonBlock) => {
    setSelectedBlockId(block.id);
    setCurrentEditingBlock(block);
    setBlockSettingsDialogOpen(true);
  };

  const handleDirectEditComplete = (blockId: string, newValue: string) => {
    const updatedSlide = { ...slide };
    updatedSlide.blocks = updatedSlide.blocks.map(block => {
      if (block.id === blockId) {
        if (block.type === 'text') {
          return { ...block, content: newValue };
        } else if (block.type === 'question') {
          return { ...block, question: newValue };
        }
      }
      return block;
    });
    onUpdateSlide(updatedSlide);
    setDirectEditingBlock(null);
  };

  const handleConnectionUpdate = (slideId: string, connections: BlockConnection[]) => {
    if (slideId !== slide.id) return;
    
    const updatedSlide = { ...slide, connections };
    onUpdateSlide(updatedSlide);
  };

  useEffect(() => {
    // If we have any blocks with columnSpan > 1, ensure we're tracking the connections
    let needsConnectionUpdate = false;
    
    Object.entries(slide.layout?.blockSpans || {}).forEach(([blockId, span]) => {
      if (span.columnSpan && span.columnSpan > 1) {
        needsConnectionUpdate = true;
      }
    });
    
    if (needsConnectionUpdate && window.updateConnectionsFromLayout) {
      window.updateConnectionsFromLayout();
    }
  }, [slide.layout?.blockSpans]);

  // Add handler for split blocks
  useEffect(() => {
    window.addSplitBlocks = (newBlocks: LessonBlock[]) => {
      const updatedSlide = { ...slide };
      
      // Add the new blocks to the slide
      updatedSlide.blocks = [...updatedSlide.blocks, ...newBlocks];
      
      // Ensure we have layout information
      if (!updatedSlide.layout) {
        updatedSlide.layout = {
          gridRows: Math.max(3, slide.layout?.gridRows || 1), // Ensure at least 3 rows for split blocks
          gridColumns: 1,
          blockPositions: {},
          blockSpans: {}
        };
      }
      
      // Position the split blocks in a vertical stack by default
      if (!updatedSlide.layout.blockPositions) {
        updatedSlide.layout.blockPositions = {};
      }
      
      // Find the first available row
      let currentRow = 0;
      while (Object.values(updatedSlide.layout.blockPositions).some(pos => pos.row === currentRow)) {
        currentRow++;
      }
      
      // Position each block in its own row
      newBlocks.forEach((block, index) => {
        updatedSlide.layout.blockPositions[block.id] = {
          row: currentRow + index,
          column: 0
        };
      });
      
      // Ensure the grid has enough rows
      updatedSlide.layout.gridRows = Math.max(
        updatedSlide.layout.gridRows || 1,
        currentRow + newBlocks.length
      );
      
      onUpdateSlide(updatedSlide);
    };
    
    return () => {
      delete window.addSplitBlocks;
    };
  }, [slide, onUpdateSlide]);

  // New function to handle image drop specifically on feedback blocks
  const handleImageDropOnFeedbackBlock = async (file: File, blockId: string, position: GridPosition) => {
    console.log('[handleImageDropOnFeedbackBlock] Starting for block:', blockId, 'File:', file.name, 'Position:', position); 
    if (!user) {
      console.error('[handleImageDropOnFeedbackBlock] User not logged in.'); 
      toast.error("You must be logged in to upload images.");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      console.warn('[handleImageDropOnFeedbackBlock] File too large:', file.size); 
      toast.error("Image file size must be less than 5MB");
      return;
    }

    const loadingToastId = toast.loading('Uploading and analyzing image...');
    console.log('[handleImageDropOnFeedbackBlock] Starting upload and analysis...'); 

    try {
      // Upload to Supabase
      console.log('[handleImageDropOnFeedbackBlock] Uploading image...'); 
      const uploadResult = await uploadImage(file, user.id);
      console.log('[handleImageDropOnFeedbackBlock] Raw upload result:', uploadResult); 
      
      if ('error' in uploadResult) {
        console.error('[handleImageDropOnFeedbackBlock] Upload error:', uploadResult.error); 
        throw new Error(uploadResult.error);
      }
      console.log('[handleImageDropOnFeedbackBlock] Image uploaded:', uploadResult.url); 

      // Generate alt text from filename
      const suggestedAlt = file.name.split('.')[0].replace(/[_-]/g, ' ');
      console.log('[handleImageDropOnFeedbackBlock] Generated alt text:', suggestedAlt); 
      
      // Find the target block
      const targetBlock = slide.blocks.find(b => b.id === blockId);
      if (!targetBlock || targetBlock.type !== 'feedback-question') {
        console.error('[handleImageDropOnFeedbackBlock] Target feedback block not found for ID:', blockId); 
        throw new Error("Target feedback block not found.");
      }
      console.log('[handleImageDropOnFeedbackBlock] Found target block:', targetBlock); 

      // Call the analyze image function
      console.log('[handleImageDropOnFeedbackBlock] Analyzing image with model:', targetBlock.modelName); 
      const analysisResult = await analyzeQuestionImage(uploadResult.url, targetBlock.modelName);
      console.log('[handleImageDropOnFeedbackBlock] Raw analysis result:', analysisResult); 
      
      if (!analysisResult.questionText || !analysisResult.options || !analysisResult.correctAnswer) {
        console.error('[handleImageDropOnFeedbackBlock] Incomplete analysis results:', analysisResult); 
        throw new Error('Incomplete analysis results from LLM');
      }
      console.log('[handleImageDropOnFeedbackBlock] Image analysis successful.'); 
      
      // Update the block with the image and analysis results
      console.log('[handleImageDropOnFeedbackBlock] Preparing updated block data...'); 
      const updatedBlock: FeedbackQuestionBlock = {
        ...targetBlock,
        imageUrl: uploadResult.url, 
        imageAlt: suggestedAlt,
        questionText: analysisResult.questionText,
        options: analysisResult.options,
        correctAnswer: analysisResult.correctAnswer,
        questionType: 'multiple-choice',
        optionStyle: analysisResult.optionStyle || 'A-D'
      };
      console.log('[handleImageDropOnFeedbackBlock] Updated block data:', updatedBlock); 
      
      // Update the lesson state
      console.log('[handleImageDropOnFeedbackBlock] Updating slide state...'); 
      const updatedSlide = {
        ...slide,
        blocks: slide.blocks.map(b => b.id === blockId ? updatedBlock : b)
      };
      
      onUpdateSlide(updatedSlide);
      console.log('[handleImageDropOnFeedbackBlock] Slide state updated.'); 
      
      toast.success('Image processed and question generated!', { id: loadingToastId });

    } catch (error) {
      console.error('[handleImageDropOnFeedbackBlock] Error:', error); 
      toast.error(error instanceof Error ? error.message : 'Failed to process image', { id: loadingToastId });
    }
  };

  // Update drop handling in the DroppableCell component
  const handleDropInCell = (blockId: string, position: GridPosition, dataTransfer?: DataTransfer) => {
    console.log('[handleDropInCell] Drop event triggered on cell:', position, 'Dropped ID/Type:', blockId); 
    
    // Check if this is an image being dropped
    console.log('[handleDropInCell] Checking for image drop...'); 
    const isImageDrop = dataTransfer?.items?.[0]?.type.startsWith('image/');
    console.log('[handleDropInCell] Is image drop?', isImageDrop); 
    
    if (isImageDrop) {
      console.log('[handleDropInCell] Image detected. DataTransfer items:', dataTransfer?.items, 'Files:', dataTransfer?.files); 
      
      // Find if there's an existing feedback block in this cell
      console.log('[handleDropInCell] Searching for existing feedback block in cell:', position); 
      const existingFeedbackBlock = slide.blocks.find(block => {
        const blockPos = slide.layout?.blockPositions?.[block.id];
        return block.type === 'feedback-question' && 
               blockPos?.row === position.row && 
               blockPos?.column === position.column;
      });
      console.log('[handleDropInCell] Found existing feedback block?', !!existingFeedbackBlock, 'ID:', existingFeedbackBlock?.id); 

      // If an image is dropped onto an existing feedback block, process it directly
      if (existingFeedbackBlock && existingFeedbackBlock.type === 'feedback-question') {
        const file = dataTransfer.files[0];
        if (file) {
          console.log('[handleDropInCell] Calling handleImageDropOnFeedbackBlock for block:', existingFeedbackBlock.id, 'File:', file.name); 
          handleImageDropOnFeedbackBlock(file, existingFeedbackBlock.id, position);
          return; // Stop further processing for this drop event
        } else {
          console.warn('[handleDropInCell] Image drop detected but no file found in dataTransfer.'); 
        }
      }
      
      // If dropped on an empty cell or a non-feedback block, ignore the image drop for now
      console.log("[handleDropInCell] Image dropped on non-feedback block or empty cell, ignoring."); 
      return; // Prevent further processing for image drops not on feedback blocks
    }

    // Handle regular block drops (moving existing blocks or dropping new types from sidebar)
    console.log('[handleDropInCell] Handling regular block drop for ID/Type:', blockId); 
    if (blockId.startsWith('block-')) {
      if (isInSingleColumnWithMultipleBlocks && position.column === 1) {
        handleDropInNewColumn(blockId);
      } else {
        handlePositionBlock(blockId, position);
      }
    } else if (['text', 'image', 'question', 'graph', 'ai-chat', 'feedback-question'].includes(blockId)) {
      handleDropNewBlockType(blockId, position);
    }
  };

  return (
    <div className="w-full">
      <BlockConnectionManager 
        slide={slide} 
        onUpdateConnections={handleConnectionUpdate} 
      />
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
      
      <div 
        className="min-h-[300px] border-dashed border-2 rounded-lg p-6 bg-background relative"
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'copy';
        }}
        onDrop={(e) => {
          e.preventDefault();
          const blockType = e.dataTransfer.getData('text/plain');
          
          if (blockType && ['text', 'image', 'question', 'graph', 'ai-chat', 'feedback-question'].includes(blockType)) {
            // Get drop position relative to grid
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            // Calculate grid position based on percentages
            const cols = gridSize.columns || 1;
            const rows = gridSize.rows || 1;
            
            const col = Math.min(Math.floor((x / rect.width) * cols), cols - 1);
            const row = Math.min(Math.floor((y / rect.height) * rows), rows - 1);

            // If it's a feedback block, automatically split it into three parts
            if (blockType === 'feedback-question') {
              const baseId = `block-${Date.now()}`;
              const groupId = `group-${Date.now()}`;

              // Create three connected blocks
              const questionBlock = createBlock('feedback-question', {
                displayMode: 'question',
                isGrouped: true,
                groupId,
                id: `${baseId}-question`
              });
              
              const imageBlock = createBlock('feedback-question', {
                displayMode: 'image',
                isGrouped: true,
                groupId,
                id: `${baseId}-image`
              });
              
              const feedbackBlock = createBlock('feedback-question', {
                displayMode: 'feedback',
                isGrouped: true,
                groupId,
                id: `${baseId}-feedback`
              });

              // Add all three blocks
              handleDropBlock(questionBlock, { row, column: col });
              handleDropBlock(imageBlock, { row, column: Math.min(col + 1, cols - 1) });
              handleDropBlock(feedbackBlock, { row, column: Math.min(col + 2, cols - 1) });
            } else {
              const blockId = `block-${Date.now()}`;
              const newBlock = createBlock(blockType, { id: blockId });
              handleDropBlock(newBlock, { row, column: col });
            }
          }
        }}
      >
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
              const blockSpan = blocksInPosition[0] ? getBlockSpan(blocksInPosition[0].id) : { columnSpan: 1, rowSpan: 1 };
              let cellSpan = { 
                columnSpan: blockSpan.columnSpan || 1, 
                rowSpan: blockSpan.rowSpan || 1 
              };
              
              return (
                <DroppableCell 
                  key={position}
                  position={cellPosition}
                  span={cellSpan}
                  onDrop={handleDropInCell}
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
                            isDirectEditing={directEditingBlock === block.id}
                            onDoubleClick={handleDoubleClick}
                            onDirectEditComplete={handleDirectEditComplete}
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
    
    {/* Block Settings Dialog */}
    <Dialog open={blockSettingsDialogOpen} onOpenChange={setBlockSettingsDialogOpen}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="capitalize">{currentEditingBlock?.type} Block Settings</DialogTitle>
          <DialogDescription>
            Configure the settings for this block.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          {currentEditingBlock && (
            <LessonBlockEditor
              block={currentEditingBlock}
              onUpdate={(updatedBlock) => {
                handleUpdateBlockFromSettings(updatedBlock as LessonBlock);
                setCurrentEditingBlock(updatedBlock as LessonBlock);
              }}
              onDelete={() => {
                handleDeleteBlock(currentEditingBlock.id);
                setBlockSettingsDialogOpen(false);
              }}
            />
          )}
        </div>
        
        <div className="flex items-center justify-between border-t pt-4 mt-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Column span:</span>
            {currentEditingBlock && (
              <SpanControls
                blockId={currentEditingBlock.id}
                span={getBlockSpan(currentEditingBlock.id)}
                maxColumns={gridSize.columns - getBlockPosition(currentEditingBlock.id).column}
                maxRows={gridSize.rows}
                onUpdateSpan={handleUpdateBlockSpan}
              />
            )}
          </div>
          
          <Button 
            onClick={() => setBlockSettingsDialogOpen(false)}
            variant="outline"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  </div>
  );
};

export default BlockBasedSlideEditor;
