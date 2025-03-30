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
    const newSpans = {
      ...layout.blockSpans,
      [blockId]: { rowSpan, columnSpan }
    };
    
    const newLayout = {
      ...layout,
      blockSpans: newSpans
    };
    
    setLayout(newLayout);
    onLayoutChange(slide.id, newLayout);
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
    return layout.blockSpans?.[blockId] || { rowSpan: 1, columnSpan: 1 };
  };

  // Check if a cell is covered by a block's span
  const isCellCoveredBySpan = (row: number, column: number) => {
    return Object.entries(layout.blockPositions || {}).some(([blockId, pos]) => {
      if (pos.row === row && pos.column === column) return false;
      
      const span = getBlockSpan(blockId);
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
    for (let row = 0; row < layout.gridRows!; row++) {
      for (let col = 0; col < layout.gridColumns!; col++) {
        // Skip rendering cells that are covered by another block's span
        if (isCellCoveredBySpan(row, col)) continue;
        
        const block = getCellBlock(row, col);
        const isOccupied = !!block;
        
        cells.push(
          <div
            key={`${row}-${col}`}
            className={cn(
              "min-h-[80px] p-2 rounded-md border-2 border-dashed relative",
              dragOverCell?.row === row && dragOverCell?.column === col
                ? "bg-primary/10 border-primary"
                : "border-muted",
              isOccupied ? "bg-muted/40" : ""
            )}
            onDragOver={(e) => handleDragOver(e, row, col)}
            onDragLeave={() => setDragOverCell(null)}
            onDrop={(e) => handleDrop(e, row, col)}
            style={{
              gridRow: `${row + 1} / span 1`,
              gridColumn: `${col + 1} / span 1`,
            }}
          >
            <div className="text-xs font-medium text-center mb-2 text-muted-foreground">
              {row + 1},{col + 1}
            </div>
            
            {block && (
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
                      
                      // Ensure we don't expand beyond grid boundaries
                      if (pos.column + span.columnSpan < layout.gridColumns!) {
                        handleBlockSpanChange(block.id, span.rowSpan, span.columnSpan + 1);
                      }
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
                      const pos = getBlockPosition(block.id);
                      
                      // Ensure we don't expand beyond grid boundaries
                      if (pos.row + span.rowSpan < layout.gridRows!) {
                        handleBlockSpanChange(block.id, span.rowSpan + 1, span.columnSpan);
                      }
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
            
            {!isOccupied && !isCellCoveredBySpan(row, col) && (
              <div className="text-xs text-center text-muted-foreground p-2">
                Drag blocks here
              </div>
            )}
          </div>
        );
      }
    }
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