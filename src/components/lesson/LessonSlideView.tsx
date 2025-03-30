import React, { useState } from 'react';
import { LessonSlide, LessonBlock, QuestionBlock, GridSpan } from '@/types/lesson';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Pause } from 'lucide-react';
import ImageViewer from './ImageViewer';
import { cn } from '@/lib/utils';

// Define a grid position type to match the editor
interface GridPosition {
  row: number;
  column: number;
}

interface LessonSlideViewProps {
  slide: LessonSlide;
  isStudentView?: boolean;
  studentId?: string;
  onResponseSubmit?: (blockId: string, response: string | boolean) => void;
  onAnswerSubmit?: (blockId: string, answer: string | number | boolean) => void;
  answeredBlocks?: string[];
  isPaused?: boolean;
}

const LessonSlideView: React.FC<LessonSlideViewProps> = ({ 
  slide, 
  isStudentView = false,
  studentId,
  onResponseSubmit,
  onAnswerSubmit,
  answeredBlocks = [],
  isPaused = false
}) => {
  const [responses, setResponses] = useState<Record<string, string | boolean>>({});
  
  // Helper functions for handling block dimensions
  const getBlockDimensions = (blockId: string) => {
    // Default values
    return {
      width: undefined,
      height: undefined
    };
  };
  
  // Determine if we should use grid layout
  const useGridLayout = slide.layout?.gridRows && slide.layout?.gridColumns && 
    (slide.layout.gridRows > 1 || slide.layout.gridColumns > 1);
  
  // For grid layout, get grid dimensions
  const gridSize = {
    rows: slide.layout?.gridRows || 2, // Default to 2 rows if not specified
    columns: slide.layout?.gridColumns || 2 // Default to 2 columns if not specified
  };

  const handleResponseChange = (blockId: string, value: string | boolean) => {
    setResponses(prev => ({ ...prev, [blockId]: value }));
  };
  
  const handleSubmitResponse = (blockId: string) => {
    if (onAnswerSubmit && blockId in responses) {
      onAnswerSubmit(blockId, responses[blockId]);
    } else if (onResponseSubmit && blockId in responses) {
      onResponseSubmit(blockId, responses[blockId]);
    }
  };
  
  const renderBlock = (block: LessonBlock) => {
    switch (block.type) {
      case 'text':
        return (
          <div className="prose max-w-none">
            {block.content}
          </div>
        );
      case 'image':
        return (
          <div className="my-4 flex justify-center">
            <ImageViewer 
              src={block.url} 
              alt={block.alt} 
              className="max-h-96 rounded-md"
            />
          </div>
        );
      case 'question':
        return renderQuestionBlock(block as QuestionBlock);
      case 'graph':
        return (
          <div className="my-4 border rounded-md p-4 bg-gray-50 h-60 desmos-container">
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground text-center">
                {block.equation}<br />
                <span className="text-sm">(Will use Desmos API in full implementation)</span>
              </p>
            </div>
          </div>
        );
      default:
        return <p>Unknown block type</p>;
    }
  };
  
  // Get block position from layout (enhanced for better default handling)
  const getBlockPosition = (blockId: string): GridPosition => {
    // If we have grid positions for this block, use them
    if (slide.layout?.blockPositions?.[blockId]) {
      return slide.layout.blockPositions[blockId];
    }
    
    // If we have column-based layout (legacy), convert to grid position
    if (slide.layout?.blockAssignments?.[blockId] !== undefined) {
      const colIndex = slide.layout.blockAssignments[blockId];
      
      // Calculate row based on blocks already in this column
      // Get all blocks that are in the same column and have already been positioned
      const blocksInSameColumn = Object.entries(slide.layout?.blockPositions || {})
        .filter(([id, pos]) => id !== blockId && pos.column === colIndex)
        .map(([id, pos]) => ({
          id,
          position: pos,
          span: getBlockSpan(id)
        }));
      
      // Find the first available row that doesn't overlap with any existing block
      let row = 0;
      let foundPosition = false;
      
      while (!foundPosition) {
        const overlapping = blocksInSameColumn.some(b => {
          const endRow = b.position.row + (b.span.rowSpan || 1);
          return row >= b.position.row && row < endRow;
        });
        
        if (!overlapping) {
          foundPosition = true;
        } else {
          row++;
        }
      }
      
      return { column: colIndex, row };
    }
    
    // Default position - first column, first available row
    return { row: 0, column: 0 };
  };
  
  // Get block span from layout
  const getBlockSpan = (blockId: string): GridSpan => {
    // If we have grid spans for this block, use them
    if (slide.layout?.blockSpans?.[blockId]) {
      return slide.layout.blockSpans[blockId];
    }
    
    // Default span - one cell
    return { columnSpan: 1, rowSpan: 1 };
  };
  
  // Check if a cell is covered by another block's span
  const isCellCoveredBySpan = (row: number, column: number, excludeBlockId?: string) => {
    return Object.entries(slide.layout?.blockPositions || {}).some(([blockId, pos]) => {
      if (excludeBlockId && blockId === excludeBlockId) return false;
      
      const blockSpan = getBlockSpan(blockId);
      
      // Check if this cell is within the span of another block
      return (
        pos.row <= row && 
        pos.row + (blockSpan.rowSpan || 1) > row &&
        pos.column <= column && 
        pos.column + (blockSpan.columnSpan || 1) > column
      );
    });
  };
  
  // Rendering for question blocks
  const renderQuestionBlock = (block: QuestionBlock) => {
    // ... existing code for rendering questions remains unchanged
    const studentCanRespond = isStudentView && studentId;
    const isAnswered = answeredBlocks.includes(block.id);
    
    if (block.questionType === 'multiple-choice') {
      return (
        <div className="my-4 p-4 bg-primary/5 rounded-md relative">
          <p className="font-medium mb-3">{block.question}</p>
          
          {studentCanRespond ? (
            <div className="space-y-2">
              <RadioGroup 
                value={responses[block.id] as string} 
                onValueChange={(value) => handleResponseChange(block.id, value)}
                disabled={isPaused || isAnswered}
              >
                {block.options?.map((option, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <RadioGroupItem 
                      value={option} 
                      id={`${block.id}-option-${index}`}
                      disabled={isPaused || isAnswered}
                    />
                    <Label 
                      htmlFor={`${block.id}-option-${index}`}
                    >
                      {option}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
              
              <Button 
                className="mt-3" 
                size="sm" 
                onClick={() => handleSubmitResponse(block.id)}
                disabled={!responses[block.id] || isPaused || isAnswered}
              >
                {isAnswered ? "Submitted" : "Submit"}
              </Button>
            </div>
          ) : (
            <ul className="space-y-1 list-disc list-inside">
              {block.options?.map((option, index) => (
                <li 
                  key={index}
                  className={option === block.correctAnswer ? "text-green-600 font-medium" : ""}
                >
                  {option}
                  {option === block.correctAnswer && !isStudentView && " (correct)"}
                </li>
              ))}
            </ul>
          )}
        </div>
      );
    }
    
    if (block.questionType === 'true-false') {
      return (
        <div className="my-4 p-4 bg-primary/5 rounded-md relative">
          <p className="font-medium mb-3">{block.question}</p>
          
          {studentCanRespond ? (
            <div className="space-y-2">
              <RadioGroup 
                value={responses[block.id] === true ? "true" : responses[block.id] === false ? "false" : ""} 
                onValueChange={(value) => handleResponseChange(block.id, value === "true")}
                disabled={isPaused || isAnswered}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem 
                    value="true" 
                    id={`${block.id}-true`}
                    disabled={isPaused || isAnswered}
                  />
                  <Label 
                    htmlFor={`${block.id}-true`}
                  >
                    True
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem 
                    value="false" 
                    id={`${block.id}-false`}
                    disabled={isPaused || isAnswered}
                  />
                  <Label 
                    htmlFor={`${block.id}-false`}
                  >
                    False
                  </Label>
                </div>
              </RadioGroup>
              
              <Button 
                className="mt-3" 
                size="sm" 
                onClick={() => handleSubmitResponse(block.id)}
                disabled={!(block.id in responses) || isPaused || isAnswered}
              >
                {isAnswered ? "Submitted" : "Submit"}
              </Button>
            </div>
          ) : (
            <div className="flex space-x-8">
              <div className={`flex items-center space-x-2 ${block.correctAnswer === true && !isStudentView ? "text-green-600 font-medium" : ""}`}>
                <div className="h-4 w-4 rounded-full border-2 flex items-center justify-center">
                  {block.correctAnswer === true && !isStudentView && (
                    <div className="h-2 w-2 rounded-full bg-green-600" />
                  )}
                </div>
                <span>True</span>
              </div>
              <div className={`flex items-center space-x-2 ${block.correctAnswer === false && !isStudentView ? "text-green-600 font-medium" : ""}`}>
                <div className="h-4 w-4 rounded-full border-2 flex items-center justify-center">
                  {block.correctAnswer === false && !isStudentView && (
                    <div className="h-2 w-2 rounded-full bg-green-600" />
                  )}
                </div>
                <span>False</span>
              </div>
            </div>
          )}
        </div>
      );
    }
    
    if (block.questionType === 'free-response') {
      return (
        <div className="my-4 p-4 bg-primary/5 rounded-md relative">
          <p className="font-medium mb-3">{block.question}</p>
          
          {studentCanRespond ? (
            <div className="space-y-3">
              <Textarea
                placeholder="Enter your answer here..."
                value={responses[block.id] as string || ''}
                onChange={(e) => handleResponseChange(block.id, e.target.value)}
                disabled={isPaused || isAnswered}
              />
              <Button 
                size="sm" 
                onClick={() => handleSubmitResponse(block.id)}
                disabled={!responses[block.id] || isPaused || isAnswered}
              >
                {isAnswered ? "Submitted" : "Submit"}
              </Button>
            </div>
          ) : (
            <div className="border border-dashed border-muted-foreground/30 rounded-md p-3 bg-muted/30">
              <p className="text-sm text-muted-foreground">Student response area</p>
              {!isStudentView && block.correctAnswer && (
                <div className="mt-2">
                  <p className="text-sm font-medium">Sample answer:</p>
                  <p className="text-sm">{block.correctAnswer as string}</p>
                </div>
              )}
            </div>
          )}
        </div>
      );
    }
    
    return <p>Unknown question type</p>;
  };
  
  // Determine if we should use grid layout
  const determineLayoutType = () => {
    // If we have grid dimensions specified, use grid layout
    if (slide.layout?.gridRows && slide.layout?.gridColumns) {
      return 'grid';
    }
    
    // If we have column-based layout, use columns
    if (slide.layout?.columnCount && slide.layout?.columnWidths) {
      return 'columns';
    }
    
    // Default to simple linear layout
    return 'linear';
  };
  
  const layoutType = determineLayoutType();
  
  // For column layout, get column widths
  const columnWidths = slide.layout?.columnWidths || [100];
  
  // Group blocks by grid cell for grid-based layout
  const getBlocksForGrid = () => {
    // Initialize a 2D array to represent the grid and track occupied cells
    const gridCells: Array<Array<boolean>> = Array(gridSize.rows)
      .fill(null)
      .map(() => Array(gridSize.columns).fill(false));
    
    // Sort blocks to ensure consistent layout (by position and id)
    const sortedBlocks = [...slide.blocks].sort((a, b) => {
      const posA = getBlockPosition(a.id);
      const posB = getBlockPosition(b.id);
      
      // Sort by row first, then by column
      if (posA.row !== posB.row) {
        return posA.row - posB.row;
      }
      if (posA.column !== posB.column) {
        return posA.column - posB.column;
      }
      // If positions are identical, sort by ID for consistency
      return a.id.localeCompare(b.id);
    });
    
    // Map blocks to their grid positions with spans
    return sortedBlocks.map(block => {
      let position = getBlockPosition(block.id);
      const span = getBlockSpan(block.id);
      
      // Ensure position is within grid bounds
      position = {
        row: Math.min(position.row, gridSize.rows - 1),
        column: Math.min(position.column, gridSize.columns - 1)
      };
      
      // Check if position is already occupied by another block's span
      if (isCellCoveredBySpan(position.row, position.column, block.id)) {
        // Find the next available position
        let foundPosition = false;
        const originalRow = position.row;
        const originalCol = position.column;
        
        // Try to find a new position within the same row first
        for (let c = originalCol; c < gridSize.columns && !foundPosition; c++) {
          if (!isCellCoveredBySpan(originalRow, c, block.id)) {
            position = { row: originalRow, column: c };
            foundPosition = true;
          }
        }
        
        // If still occupied, try next rows
        if (!foundPosition) {
          for (let r = originalRow + 1; r < gridSize.rows && !foundPosition; r++) {
            for (let c = 0; c < gridSize.columns && !foundPosition; c++) {
              if (!isCellCoveredBySpan(r, c, block.id)) {
                position = { row: r, column: c };
                foundPosition = true;
              }
            }
          }
        }
        
        // If we still couldn't find a free cell, use the original position
        // (this should be handled better in a production version)
        if (!foundPosition) {
          position = { row: originalRow, column: originalCol };
        }
      }
      
      // Adjust span to not exceed grid boundaries
      const adjustedSpan = {
        rowSpan: Math.min(span.rowSpan || 1, gridSize.rows - position.row),
        columnSpan: Math.min(span.columnSpan || 1, gridSize.columns - position.column)
      };
      
      // Mark cells as occupied
      for (let r = position.row; r < position.row + adjustedSpan.rowSpan; r++) {
        for (let c = position.column; c < position.column + adjustedSpan.columnSpan; c++) {
          if (r < gridSize.rows && c < gridSize.columns) {
            gridCells[r][c] = true;
          }
        }
      }
      
      return {
        block,
        position,
        span: adjustedSpan
      };
    });
  };
  
  // Group blocks by column for column-based layout
  const getBlocksByColumn = () => {
    const result: LessonBlock[][] = Array(slide.layout?.columnCount || 1).fill(null).map(() => []);
    
    slide.blocks.forEach(block => {
      const colIndex = slide.layout?.blockAssignments?.[block.id] || 0;
      if (colIndex < result.length) {
        result[colIndex].push(block);
      } else {
        // If column doesn't exist, put in first column
        result[0].push(block);
      }
    });
    
    return result;
  };
  
  return (
    <div className="relative">
      {/* Semi-transparent overlay when paused - only show for student view */}
      {isStudentView && isPaused && (
        <div className="absolute inset-0 bg-amber-50/70 backdrop-blur-[0px] z-10 flex items-center justify-center rounded-lg">
          <div className="bg-white/90 p-4 rounded-md shadow-md text-center border border-amber-200">
            <Pause className="h-8 w-8 mx-auto text-amber-500 mb-2" />
            <h3 className="text-lg font-semibold text-amber-700">Session Paused</h3>
            <p className="text-amber-600">The teacher has paused this session</p>
          </div>
        </div>
      )}
      {useGridLayout ? (
        // Render using grid layout
        <div 
          className="grid gap-4" 
          style={{ 
            gridTemplateRows: `repeat(${gridSize.rows}, minmax(0, auto))`,
            gridTemplateColumns: `repeat(${gridSize.columns}, minmax(0, 1fr))`
          }}
        >
          {slide.blocks.map((block) => {
            const position = getBlockPosition(block.id);
            const blockSpan = getBlockSpan(block.id);
            
            // Skip blocks without valid position data
            if (position.row === undefined || position.column === undefined) return null;
            
            return (
              <div 
                key={block.id} 
                className="bg-card p-4 border rounded-md shadow-sm"
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
        // Use the original linear layout
        <div className="space-y-4">
          {slide.blocks.map((block) => {
            const { width, height } = getBlockDimensions(block.id);
            return (
              <div 
                key={block.id} 
                className="relative"
                style={{ 
                  width: width || '100%', 
                  height: height || 'auto',
                  margin: '0 auto 1rem auto'
                }}
              >
                <div className="h-full">
                  {renderBlock(block)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default LessonSlideView;
