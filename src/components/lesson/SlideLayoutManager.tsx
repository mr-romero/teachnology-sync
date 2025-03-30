import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LayoutGrid, Columns, AlignVerticalJustifyCenter, Maximize, Move, Grid, LayoutPanelTop } from 'lucide-react';
import { LessonSlide, SlideLayout, GridSpan } from '@/types/lesson';
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
      gridRows: 1,
      gridColumns: 1,
      blockPositions: {},
      blockSpans: {}
    }
  );

  // Track which block is being dragged and over which grid cell
  const [draggedBlockId, setDraggedBlockId] = useState<string | null>(null);
  const [dragOverCell, setDragOverCell] = useState<{row: number, column: number} | null>(null);

  // Update layout when slide changes
  useEffect(() => {
    setLayout(slide.layout || {
      gridRows: 1,
      gridColumns: 1,
      blockPositions: {},
      blockSpans: {}
    });
  }, [slide.id]);

  // Handle grid dimensions change
  const handleGridDimensionsChange = (rows: number, columns: number) => {
    // Create new layout
    const newLayout: SlideLayout = {
      ...layout,
      gridRows: rows,
      gridColumns: columns,
      blockPositions: { ...layout.blockPositions },
      blockSpans: { ...layout.blockSpans }
    };
    
    // Adjust any blocks that would now be outside the grid
    for (const blockId in newLayout.blockPositions) {
      const position = newLayout.blockPositions[blockId];
      if (position.row >= rows) {
        position.row = rows - 1;
      }
      if (position.column >= columns) {
        position.column = columns - 1;
      }
      
      // Also check spans
      if (newLayout.blockSpans[blockId]) {
        const span = newLayout.blockSpans[blockId];
        // If span would extend beyond grid, adjust it
        if (position.row + (span.rowSpan || 1) > rows) {
          span.rowSpan = rows - position.row;
        }
        if (position.column + (span.columnSpan || 1) > columns) {
          span.columnSpan = columns - position.column;
        }
      }
    }
    
    setLayout(newLayout);
    onLayoutChange(slide.id, newLayout);
  };

  // Presets for quick grid setup
  const handlePresetSelect = (preset: string) => {
    switch (preset) {
      case "1x1":
        handleGridDimensionsChange(1, 1);
        break;
      case "1x2":
        handleGridDimensionsChange(1, 2);
        break;
      case "2x1":
        handleGridDimensionsChange(2, 1);
        break;
      case "2x2":
        handleGridDimensionsChange(2, 2);
        break;
      case "3x2":
        handleGridDimensionsChange(3, 2);
        break;
      case "3x3":
        handleGridDimensionsChange(3, 3);
        break;
    }
  };

  // Handle assigning a block to a grid cell
  const handleBlockAssigned = (blockId: string, row: number, column: number) => {
    console.log(`Assigning block ${blockId} to position (${row}, ${column})`);
    
    // Check if any block already occupies this cell
    const existingBlock = Object.entries(layout.blockPositions || {}).find(
      ([id, pos]) => id !== blockId && pos.row === row && pos.column === column
    );

    // If cell is occupied, don't assign
    if (existingBlock) {
      console.log(`Cell (${row}, ${column}) already occupied by block ${existingBlock[0]}`);
      return false;
    }
    
    const newPositions = {
      ...layout.blockPositions,
      [blockId]: { row, column }
    };
    
    const newLayout = {
      ...layout,
      blockPositions: newPositions
    };
    
    console.log('Updated layout:', newLayout);
    setLayout(newLayout);
    onLayoutChange(slide.id, newLayout);
    return true;
  };

  // Update block span
  const handleBlockSpanChange = (blockId: string, rowSpan: number, columnSpan: number) => {
    // Get the current position of the block
    const position = getBlockPosition(blockId);
    
    console.log(`Attempting span change for block ${blockId} to ${rowSpan}x${columnSpan} at position (${position.row}, ${position.column})`);
    
    // Perform a strict overlap check
    const willOverlap = checkIfSpanWillOverlap(blockId, position.row, position.column, rowSpan, columnSpan);
    
    if (willOverlap) {
      // Don't allow the span change if it would overlap
      console.log('⚠️ Cannot expand block span - would overlap with another block or exceed grid boundaries');
      return false;
    }
    
    // Update the block's span
    const newSpans = {
      ...layout.blockSpans,
      [blockId]: { rowSpan, columnSpan }
    };
    
    const newLayout = {
      ...layout,
      blockSpans: newSpans
    };
    
    console.log('✅ Updating block span:', { blockId, rowSpan, columnSpan });
    setLayout(newLayout);
    onLayoutChange(slide.id, newLayout);
    return true;
  };

  // Check if a span would overlap with any existing blocks
  const checkIfSpanWillOverlap = (blockId: string, row: number, column: number, rowSpan: number, columnSpan: number) => {
    // Calculate the proposed block's boundaries
    const thisLeft = column;
    const thisRight = column + columnSpan - 1;
    const thisTop = row;
    const thisBottom = row + rowSpan - 1;
    
    console.log(`Block ${blockId} would occupy area: top=${thisTop}, right=${thisRight}, bottom=${thisBottom}, left=${thisLeft}`);
    
    // Check against grid boundaries first
    if (thisRight >= layout.gridColumns! || thisBottom >= layout.gridRows!) {
      console.log('Block would exceed grid boundaries');
      return true;
    }
    
    // Check each positioned block
    const overlappingBlocks = Object.entries(layout.blockPositions || {}).filter(([otherBlockId, otherPos]) => {
      // Skip the current block
      if (otherBlockId === blockId) return false;
      
      const otherSpan = layout.blockSpans?.[otherBlockId] || { rowSpan: 1, columnSpan: 1 };
      
      // Calculate the other block's boundaries
      const otherLeft = otherPos.column;
      const otherRight = otherPos.column + (otherSpan.columnSpan || 1) - 1;
      const otherTop = otherPos.row;
      const otherBottom = otherPos.row + (otherSpan.rowSpan || 1) - 1;
      
      console.log(`Checking against block ${otherBlockId} at (${otherPos.row}, ${otherPos.column}) with span ${otherSpan.rowSpan || 1}x${otherSpan.columnSpan || 1}`);
      console.log(`Other block occupies area: top=${otherTop}, right=${otherRight}, bottom=${otherBottom}, left=${otherLeft}`);
      
      // Check for rectangle overlap - This is the corrected implementation that properly detects overlapping rectangles
      const overlaps = (
        thisLeft <= otherRight &&
        thisRight >= otherLeft &&
        thisTop <= otherBottom &&
        thisBottom >= otherTop
      );
      
      if (overlaps) {
        console.log(`OVERLAP DETECTED with block ${otherBlockId}`);
        console.log(`This block: (${thisTop},${thisLeft}) to (${thisBottom},${thisRight})`);
        console.log(`Other block: (${otherTop},${otherLeft}) to (${otherBottom},${otherRight})`);
      }
      
      return overlaps;
    });
    
    const hasOverlap = overlappingBlocks.length > 0;
    console.log(`Overlap check result: ${hasOverlap ? 'HAS OVERLAP with ' + overlappingBlocks.map(b => b[0]).join(', ') : 'No overlap'}`);
    
    return hasOverlap;
  };

  // Get block assigned to a specific grid cell
  const getCellBlock = (row: number, column: number) => {
    return slide.blocks.find(block => {
      const position = layout.blockPositions?.[block.id];
      return position && position.row === row && position.column === column;
    });
  };

  // Handle drag start
  const handleDragStart = (e: React.DragEvent, blockId: string) => {
    console.log(`Drag started for block ${blockId}`);
    e.dataTransfer.setData('blockId', blockId);
    setDraggedBlockId(blockId);
  };

  // Handle drag over
  const handleDragOver = (e: React.DragEvent, row: number, column: number) => {
    e.preventDefault();
    // Only update if this is a new cell to avoid excessive re-renders
    if (dragOverCell?.row !== row || dragOverCell?.column !== column) {
      setDragOverCell({ row, column });
    }
  };

  // Handle drop
  const handleDrop = (e: React.DragEvent, row: number, column: number) => {
    e.preventDefault();
    const blockId = e.dataTransfer.getData('blockId') || draggedBlockId;
    
    if (blockId) {
      console.log(`Dropping block ${blockId} at (${row}, ${column})`);
      handleBlockAssigned(blockId, row, column);
    }
    
    setDraggedBlockId(null);
    setDragOverCell(null);
  };

  // Handle drag end
  const handleDragEnd = () => {
    console.log('Drag ended');
    setDraggedBlockId(null);
    setDragOverCell(null);
  };

  // Get the position of a block
  const getBlockPosition = (blockId: string) => {
    return layout.blockPositions?.[blockId] || { row: 0, column: 0 };
  };

  // Get the span of a block
  const getBlockSpan = (blockId: string) => {
    // Get the block span or default to 1x1 if not found
    return layout.blockSpans?.[blockId] || { rowSpan: 1, columnSpan: 1 };
  };

  // Check if a cell is covered by a block's span
  const isCellCoveredBySpan = (row: number, column: number) => {
    // Find any blocks that span over this cell
    return Object.entries(layout.blockPositions || {}).some(([blockId, pos]) => {
      // Skip if this is the origin cell of the block
      if (pos.row === row && pos.column === column) return false;
      
      const span = getBlockSpan(blockId);
      
      // Check if this cell is within the span of the block
      return (
        pos.row <= row && 
        pos.row + (span.rowSpan || 1) > row &&
        pos.column <= column && 
        pos.column + (span.columnSpan || 1) > column
      );
    });
  };

  // Create grid cells
  const renderGridCells = () => {
    const cells = [];
    
    // First, render base cells for the entire grid
    for (let row = 0; row < layout.gridRows!; row++) {
      for (let col = 0; col < layout.gridColumns!; col++) {
        const block = getCellBlock(row, col);
        const isOccupied = !!block;
        const isCovered = isCellCoveredBySpan(row, col);
        
        cells.push(
          <div
            key={`${row}-${col}`}
            className={cn(
              "min-h-[80px] p-2 rounded-md border-2 border-dashed relative",
              dragOverCell?.row === row && dragOverCell?.column === col
                ? "bg-primary/10 border-primary"
                : "border-muted",
              isOccupied ? "bg-muted/40" : "",
              isCovered ? "bg-muted/20 border-muted/50" : ""
            )}
            onDragOver={(e) => handleDragOver(e, row, col)}
            onDragLeave={() => setDragOverCell(null)}
            onDrop={(e) => handleDrop(e, row, col)}
            style={{
              gridRow: `${row + 1} / span 1`,
              gridColumn: `${col + 1} / span 1`,
              opacity: isCovered ? 0.5 : 1,
              pointerEvents: isCovered ? "none" : "auto"
            }}
          >
            <div className="text-xs font-medium text-center mb-2 text-muted-foreground">
              {row + 1},{col + 1}
            </div>
            
            {isCovered && (
              <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground bg-muted/30 rounded-md">
                Covered by another block
              </div>
            )}
            
            {block && !isCovered && (
              <div
                draggable
                onDragStart={(e) => handleDragStart(e, block.id)}
                onDragEnd={handleDragEnd}
                className={cn(
                  "p-2 rounded-md border",
                  draggedBlockId === block.id ? "opacity-50" : "",
                  "bg-card cursor-move flex flex-col gap-2 h-full"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Move className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs truncate">{block.type} Block</span>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">
                      Span: {getBlockSpan(block.id).rowSpan}×{getBlockSpan(block.id).columnSpan}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 mt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 text-xs px-2"
                    onClick={() => {
                      const span = getBlockSpan(block.id);
                      const pos = getBlockPosition(block.id);
                      
                      // Check for potential overlap before expanding
                      handleBlockSpanChange(block.id, span.rowSpan, span.columnSpan + 1);
                    }}
                    disabled={
                      getBlockPosition(block.id).column + getBlockSpan(block.id).columnSpan >= layout.gridColumns!
                    }
                  >
                    +Col
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 text-xs px-2"
                    onClick={() => {
                      const span = getBlockSpan(block.id);
                      
                      // Check for potential overlap before expanding
                      handleBlockSpanChange(block.id, span.rowSpan + 1, span.columnSpan);
                    }}
                    disabled={
                      getBlockPosition(block.id).row + getBlockSpan(block.id).rowSpan >= layout.gridRows!
                    }
                  >
                    +Row
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 text-xs px-2"
                    onClick={() => {
                      const span = getBlockSpan(block.id);
                      if (span.columnSpan > 1) {
                        handleBlockSpanChange(block.id, span.rowSpan, span.columnSpan - 1);
                      }
                    }}
                    disabled={getBlockSpan(block.id).columnSpan <= 1}
                  >
                    -Col
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 text-xs px-2"
                    onClick={() => {
                      const span = getBlockSpan(block.id);
                      if (span.rowSpan > 1) {
                        handleBlockSpanChange(block.id, span.rowSpan - 1, span.columnSpan);
                      }
                    }}
                    disabled={getBlockSpan(block.id).rowSpan <= 1}
                  >
                    -Row
                  </Button>
                </div>
              </div>
            )}
            
            {!isOccupied && !isCovered && (
              <div className="text-xs text-center text-muted-foreground p-2">
                Drag blocks here
              </div>
            )}
          </div>
        );
      }
    }
    
    // Then, render the blocks with correct spans as visual overlays
    slide.blocks.forEach(block => {
      const position = getBlockPosition(block.id);
      const span = getBlockSpan(block.id);
      
      // Only render if the block has a span greater than 1 in any dimension
      if ((span.rowSpan > 1 || span.columnSpan > 1) && position) {
        cells.push(
          <div
            key={`span-${block.id}`}
            className={cn(
              "p-2 rounded-md border border-primary/30 bg-primary/5",
              draggedBlockId === block.id ? "opacity-50" : "",
              "pointer-events-none z-10"
            )}
            style={{
              gridRowStart: position.row + 1,
              gridRowEnd: position.row + 1 + span.rowSpan,
              gridColumnStart: position.column + 1,
              gridColumnEnd: position.column + 1 + span.columnSpan,
              position: "relative"
            }}
          >
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-xs font-medium bg-white/80 px-2 py-1 rounded shadow-sm border">
                {block.type} Block ({span.rowSpan}×{span.columnSpan})
              </div>
            </div>
          </div>
        );
      }
    });
    
    return cells;
  };

  // Unassigned blocks that aren't in the grid yet
  const unassignedBlocks = slide.blocks.filter(block => !layout.blockPositions?.[block.id]);

  return (
    <div className="space-y-6 border rounded-lg p-4 bg-muted/10">
      <Tabs defaultValue="grid">
        <TabsList className="mb-4">
          <TabsTrigger value="grid">Grid Layout</TabsTrigger>
          <TabsTrigger value="presets">Quick Presets</TabsTrigger>
        </TabsList>
        
        <TabsContent value="grid" className="space-y-4">
          <div className="flex flex-wrap gap-2 items-center">
            <div className="flex items-center gap-2">
              <span className="text-sm">Rows:</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  if (layout.gridRows! > 1) {
                    handleGridDimensionsChange(layout.gridRows! - 1, layout.gridColumns!);
                  }
                }}
                disabled={layout.gridRows === 1}
              >
                -
              </Button>
              <span className="text-sm font-medium w-8 text-center">{layout.gridRows}</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleGridDimensionsChange(layout.gridRows! + 1, layout.gridColumns!)}
                disabled={layout.gridRows === 5}
              >
                +
              </Button>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-sm">Columns:</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  if (layout.gridColumns! > 1) {
                    handleGridDimensionsChange(layout.gridRows!, layout.gridColumns! - 1);
                  }
                }}
                disabled={layout.gridColumns === 1}
              >
                -
              </Button>
              <span className="text-sm font-medium w-8 text-center">{layout.gridColumns}</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleGridDimensionsChange(layout.gridRows!, layout.gridColumns! + 1)}
                disabled={layout.gridColumns === 5}
              >
                +
              </Button>
            </div>
          </div>
          
          <div className="mt-4">
            <h4 className="text-sm font-medium mb-2">Layout Grid</h4>
            
            <div 
              className="grid gap-2 border-2 p-2 rounded-md bg-muted/5"
              style={{ 
                gridTemplateRows: `repeat(${layout.gridRows!}, minmax(0, auto))`,
                gridTemplateColumns: `repeat(${layout.gridColumns!}, minmax(0, 1fr))`
              }}
            >
              {renderGridCells()}
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="presets" className="space-y-4">
          <h4 className="text-sm font-medium">Quick Layout Presets</h4>
          
          <div className="grid grid-cols-3 gap-4">
            <Button 
              variant={layout.gridRows === 1 && layout.gridColumns === 1 ? "default" : "outline"}
              onClick={() => handlePresetSelect("1x1")}
              className="h-20 flex flex-col items-center justify-center"
            >
              <AlignVerticalJustifyCenter className="h-8 w-8 mb-1" />
              <span className="text-xs">Single Column</span>
            </Button>
            
            <Button 
              variant={layout.gridRows === 1 && layout.gridColumns === 2 ? "default" : "outline"}
              onClick={() => handlePresetSelect("1x2")}
              className="h-20 flex flex-col items-center justify-center"
            >
              <Columns className="h-8 w-8 mb-1" />
              <span className="text-xs">Two Columns</span>
            </Button>
            
            <Button 
              variant={layout.gridRows === 2 && layout.gridColumns === 1 ? "default" : "outline"}
              onClick={() => handlePresetSelect("2x1")}
              className="h-20 flex flex-col items-center justify-center"
            >
              <LayoutPanelTop className="h-8 w-8 mb-1" />
              <span className="text-xs">Two Rows</span>
            </Button>
            
            <Button 
              variant={layout.gridRows === 2 && layout.gridColumns === 2 ? "default" : "outline"}
              onClick={() => handlePresetSelect("2x2")}
              className="h-20 flex flex-col items-center justify-center"
            >
              <Grid className="h-8 w-8 mb-1" />
              <span className="text-xs">2×2 Grid</span>
            </Button>
            
            <Button 
              variant={layout.gridRows === 3 && layout.gridColumns === 2 ? "default" : "outline"}
              onClick={() => handlePresetSelect("3x2")}
              className="h-20 flex flex-col items-center justify-center"
            >
              <LayoutGrid className="h-8 w-8 mb-1" />
              <span className="text-xs">3×2 Grid</span>
            </Button>
            
            <Button 
              variant={layout.gridRows === 3 && layout.gridColumns === 3 ? "default" : "outline"}
              onClick={() => handlePresetSelect("3x3")}
              className="h-20 flex flex-col items-center justify-center"
            >
              <Maximize className="h-8 w-8 mb-1" />
              <span className="text-xs">3×3 Grid</span>
            </Button>
          </div>
        </TabsContent>
      </Tabs>
      
      {unassignedBlocks.length > 0 && (
        <div className="mt-6">
          <h4 className="text-sm font-medium mb-2">Unassigned Blocks</h4>
          <div className="flex flex-wrap gap-2">
            {unassignedBlocks.map(block => (
              <div
                key={block.id}
                draggable
                onDragStart={(e) => handleDragStart(e, block.id)}
                onDragEnd={handleDragEnd}
                className="p-2 rounded-md border bg-card cursor-move flex items-center gap-2"
              >
                <Move className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs">{block.type} Block</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SlideLayoutManager;