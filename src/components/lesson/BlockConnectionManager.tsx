import React, { useState, useEffect } from 'react';
import { LessonSlide, GridPosition, GridSpan } from '@/types/lesson';

// Define connection type to store relationship between blocks
export interface BlockConnection {
  sourceId: string;
  targetId: string;
  type: 'visual' | 'logical' | 'data';
}

interface BlockConnectionManagerProps {
  slide: LessonSlide;
  onUpdateConnections: (slideId: string, connections: BlockConnection[]) => void;
}

const BlockConnectionManager: React.FC<BlockConnectionManagerProps> = ({
  slide,
  onUpdateConnections
}) => {
  // Track connections in state
  const [connections, setConnections] = useState<BlockConnection[]>(
    slide.connections || []
  );

  // Update connections when slide changes
  useEffect(() => {
    setConnections(slide.connections || []);
  }, [slide.id]);

  // Add a connection between blocks
  const addConnection = (sourceId: string, targetId: string, type: 'visual' | 'logical' | 'data' = 'visual') => {
    // Check if connection already exists
    const existingConnection = connections.find(
      conn => conn.sourceId === sourceId && conn.targetId === targetId
    );

    if (existingConnection) return;

    const newConnections = [
      ...connections,
      { sourceId, targetId, type }
    ];
    
    setConnections(newConnections);
    onUpdateConnections(slide.id, newConnections);
  };

  // Remove a connection
  const removeConnection = (sourceId: string, targetId: string) => {
    const newConnections = connections.filter(
      conn => !(conn.sourceId === sourceId && conn.targetId === targetId)
    );
    
    setConnections(newConnections);
    onUpdateConnections(slide.id, newConnections);
  };

  // Get all connections for a block
  const getConnectionsForBlock = (blockId: string) => {
    return connections.filter(
      conn => conn.sourceId === blockId || conn.targetId === blockId
    );
  };

  // Infer connections based on layout spans
  const inferConnectionsFromLayout = () => {
    const inferredConnections: BlockConnection[] = [];
    
    // Check blocks that span multiple columns
    if (slide.layout?.blockSpans) {
      Object.entries(slide.layout.blockSpans).forEach(([blockId, span]) => {
        if (span.columnSpan && span.columnSpan > 1) {
          // This block spans multiple columns, so it may connect other blocks
          const position = slide.layout?.blockPositions?.[blockId];
          
          if (position) {
            // Look for other blocks in the spanned area
            slide.blocks.forEach(otherBlock => {
              if (otherBlock.id === blockId) return; // Skip self
              
              const otherPosition = slide.layout?.blockPositions?.[otherBlock.id];
              
              if (otherPosition) {
                // Check if the other block is within the span
                if (
                  otherPosition.row >= position.row && 
                  otherPosition.row < position.row + (span.rowSpan || 1) &&
                  otherPosition.column > position.column && 
                  otherPosition.column < position.column + span.columnSpan
                ) {
                  // This block is contained within the span
                  inferredConnections.push({
                    sourceId: blockId,
                    targetId: otherBlock.id,
                    type: 'visual'
                  });
                }
              }
            });
          }
        }
      });
    }
    
    return inferredConnections;
  };

  // Update connections from layout changes
  const updateConnectionsFromLayout = () => {
    const layoutConnections = inferConnectionsFromLayout();
    
    // Merge with existing connections (keeping any logical/data connections)
    const existingNonVisual = connections.filter(conn => conn.type !== 'visual');
    const newConnections = [...existingNonVisual, ...layoutConnections];
    
    setConnections(newConnections);
    onUpdateConnections(slide.id, newConnections);
  };

  // Provide a context value that can be used by other components
  const connectionContext = {
    connections,
    addConnection,
    removeConnection,
    getConnectionsForBlock,
    updateConnectionsFromLayout
  };

  return null; // This is a logic component, no UI rendering
};

export default BlockConnectionManager;