import React, { useState, useRef } from 'react';
import { LessonSlide, LessonBlock } from '@/types/lesson';
import { Resizable } from 're-resizable';
import { useDrag, useDrop, DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { 
  Trash, 
  Move, 
  ChevronsUpDown, 
  ChevronsLeftRight,
  GripVertical,
  Copy
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Define item type for drag and drop
const BLOCK_TYPE = 'BLOCK';

interface BlockItemProps {
  block: LessonBlock;
  index: number;
  moveBlock: (dragIndex: number, hoverIndex: number) => void;
  onResize: (id: string, width: string, height?: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  blockPreview?: React.ReactNode;  // Renamed from preview to blockPreview
  width?: string;
  height?: string;
}

interface DragItem {
  index: number;
  id: string;
  type: string;
}

const BlockItem: React.FC<BlockItemProps> = ({
  block,
  index,
  moveBlock,
  onResize,
  onDuplicate,
  onDelete,
  blockPreview,  // Renamed from preview to blockPreview
  width = '100%',
  height = 'auto'
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [showControls, setShowControls] = useState(false);
  
  // Set up drag handling
  const [{ isDragging }, drag, dragPreview] = useDrag({  // Renamed preview to dragPreview
    type: BLOCK_TYPE,
    item: { index, id: block.id, type: BLOCK_TYPE } as DragItem,
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    })
  });

  // Set up drop handling
  const [, drop] = useDrop({
    accept: BLOCK_TYPE,
    hover(item: DragItem, monitor) {
      if (!ref.current) {
        return;
      }
      
      const dragIndex = item.index;
      const hoverIndex = index;

      // Don't replace items with themselves
      if (dragIndex === hoverIndex) {
        return;
      }

      // Determine rectangle on screen
      const hoverBoundingRect = ref.current.getBoundingClientRect();
      
      // Get vertical middle
      const hoverMiddleY =
        (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
      
      // Determine mouse position
      const clientOffset = monitor.getClientOffset();
      
      // Get pixels to the top
      const hoverClientY = (clientOffset as { y: number }).y - hoverBoundingRect.top;
      
      // Only perform the move when the mouse has crossed half of the items height
      // When dragging downwards, only move when the cursor is below 50%
      // When dragging upwards, only move when the cursor is above 50%
      
      // Dragging downwards
      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
        return;
      }
      
      // Dragging upwards
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
        return;
      }
      
      // Time to actually perform the action
      moveBlock(dragIndex, hoverIndex);
      
      // Note: we're mutating the monitor item here!
      // Generally it's better to avoid mutations,
      // but it's good here for the sake of performance
      // to avoid expensive index searches.
      item.index = hoverIndex;
    }
  });
  
  // Connect the refs as drop target and drag source
  drag(drop(ref));

  return (
    <div 
      ref={ref} 
      className={cn(
        "relative mb-4 group",
        isDragging ? "opacity-50" : "opacity-100"
      )}
      style={{ width, height }}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      <Resizable
        defaultSize={{ width: width, height: height }}
        enable={{ 
          top: false, 
          right: true, 
          bottom: false, 
          left: false, 
          topRight: false, 
          bottomRight: false, 
          bottomLeft: false, 
          topLeft: false 
        }}
        onResizeStop={(e, direction, ref, d) => {
          const newWidth = `${parseInt(width) + d.width}px`;
          onResize(block.id, newWidth);
        }}
        handleComponent={{
          right: <div className="absolute right-0 top-1/2 transform -translate-y-1/2 h-10 w-2 flex items-center justify-center cursor-col-resize opacity-0 group-hover:opacity-100">
            <ChevronsLeftRight className="h-4 w-4 text-muted-foreground" />
          </div>
        }}
        className="block-resizable"
      >
        <div className={cn(
          "border rounded-md overflow-hidden",
          showControls ? "ring-2 ring-primary/20 border-primary" : "border-muted"
        )}>
          {/* Top handle for dragging */}
          <div 
            className={cn(
              "absolute top-0 left-0 right-0 h-6 flex items-center justify-center cursor-move opacity-0 group-hover:opacity-100 bg-primary/5 border-b border-primary/10",
              showControls ? "opacity-100" : "opacity-0"
            )}
          >
            <GripVertical className="h-3 w-3 text-muted-foreground" />
          </div>

          {/* Content area */}
          <div className="p-4 pt-8">
            {blockPreview}
          </div>

          {/* Controls */}
          <div className={cn(
            "absolute top-2 right-2 flex space-x-1 opacity-0 group-hover:opacity-100",
            showControls ? "opacity-100" : "opacity-0"
          )}>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6 bg-background/80 backdrop-blur-sm"
              onClick={() => onDuplicate(block.id)}
            >
              <Copy className="h-3 w-3" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6 bg-background/80 backdrop-blur-sm text-destructive"
              onClick={() => onDelete(block.id)}
            >
              <Trash className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </Resizable>
    </div>
  );
};

// Main component
interface BlockBasedSlideEditorProps {
  slide: LessonSlide;
  onUpdateSlide: (updatedSlide: LessonSlide) => void;
  renderBlockPreview: (block: LessonBlock) => React.ReactNode;
}

const BlockBasedSlideEditor: React.FC<BlockBasedSlideEditorProps> = ({
  slide,
  onUpdateSlide,
  renderBlockPreview
}) => {
  // Function to move a block
  const moveBlock = (dragIndex: number, hoverIndex: number) => {
    const newBlocks = [...slide.blocks];
    const draggedBlock = newBlocks[dragIndex];
    
    // Remove the dragged item
    newBlocks.splice(dragIndex, 1);
    // Insert it at the new position
    newBlocks.splice(hoverIndex, 0, draggedBlock);
    
    onUpdateSlide({
      ...slide,
      blocks: newBlocks
    });
  };
  
  // Function to handle block resizing
  const handleBlockResize = (id: string, width: string, height?: string) => {
    // Store the new dimensions in the block's metadata or in a separate layout property
    // For now we'll create a layout object if it doesn't exist
    const updatedSlide = { ...slide };
    
    if (!updatedSlide.layout) {
      updatedSlide.layout = {
        columnCount: 1,
        columnWidths: [100],
        blockAssignments: {},
        blockSizes: {}
      };
    }
    
    if (!updatedSlide.layout.blockSizes) {
      updatedSlide.layout.blockSizes = {};
    }
    
    updatedSlide.layout.blockSizes[id] = { width, height: height || 'auto' };
    
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
    
    onUpdateSlide({
      ...slide,
      blocks: newBlocks
    });
  };
  
  // Function to delete a block
  const handleDeleteBlock = (id: string) => {
    const newBlocks = slide.blocks.filter(block => block.id !== id);
    
    // Also remove any layout information for this block
    const updatedSlide = { ...slide, blocks: newBlocks };
    if (updatedSlide.layout?.blockSizes) {
      delete updatedSlide.layout.blockSizes[id];
    }
    if (updatedSlide.layout?.blockAssignments) {
      delete updatedSlide.layout.blockAssignments[id];
    }
    
    onUpdateSlide(updatedSlide);
  };
  
  // Get block dimensions
  const getBlockDimensions = (blockId: string) => {
    if (slide.layout?.blockSizes?.[blockId]) {
      return slide.layout.blockSizes[blockId];
    }
    return { width: '100%', height: 'auto' };
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="w-full">
        <div className="min-h-[300px] border-dashed border-2 rounded-lg p-6 bg-background relative">
          {slide.blocks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-12">
              <div className="text-center">
                <p>No content blocks yet</p>
                <p className="text-sm">Add blocks from the panel on the left and drag them to position</p>
              </div>
            </div>
          ) : (
            <div className="space-y-0">
              {slide.blocks.map((block, index) => {
                const { width, height } = getBlockDimensions(block.id);
                return (
                  <BlockItem
                    key={block.id}
                    block={block}
                    index={index}
                    moveBlock={moveBlock}
                    onResize={handleBlockResize}
                    onDuplicate={handleDuplicateBlock}
                    onDelete={handleDeleteBlock}
                    blockPreview={renderBlockPreview(block)}  // Updated to blockPreview
                    width={width}
                    height={height}
                  />
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