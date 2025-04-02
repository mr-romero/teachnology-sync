import React, { useEffect, useRef, useState } from 'react';
import { LessonSlide, GridPosition } from '@/types/lesson';

export interface BlockConnection {
  from: string;
  to: string;
  type: 'span' | 'group';
  color?: string;
}

interface BlockConnectionManagerProps {
  slide: LessonSlide;
  onUpdateConnections?: (slideId: string, connections: BlockConnection[]) => void;
}

const BlockConnectionManager: React.FC<BlockConnectionManagerProps> = ({ 
  slide,
  onUpdateConnections
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [connections, setConnections] = useState<BlockConnection[]>(slide.connections || []);
  const [blockElements, setBlockElements] = useState<Map<string, DOMRect>>(new Map());
  
  // Function to get block position from DOM
  const updateBlockElements = () => {
    const blocks = new Map<string, DOMRect>();
    slide.blocks.forEach(block => {
      const element = document.getElementById(block.id);
      if (element) {
        blocks.set(block.id, element.getBoundingClientRect());
      }
    });
    setBlockElements(blocks);
  };
  
  // Update block positions when slide changes
  useEffect(() => {
    updateBlockElements();
    
    // Add resize observer to handle changes in block positions
    const observer = new ResizeObserver(() => {
      updateBlockElements();
    });
    
    slide.blocks.forEach(block => {
      const element = document.getElementById(block.id);
      if (element) {
        observer.observe(element);
      }
    });
    
    return () => observer.disconnect();
  }, [slide.blocks]);
  
  // Function to find block groups
  const findBlockGroups = () => {
    const groups = new Map<string, string[]>();
    
    slide.blocks.forEach(block => {
      if ('groupId' in block && block.groupId) {
        const group = groups.get(block.groupId) || [];
        group.push(block.id);
        groups.set(block.groupId, group);
      }
    });
    
    return groups;
  };
  
  // Function to create connections from block groups
  const createGroupConnections = () => {
    const groups = findBlockGroups();
    const newConnections: BlockConnection[] = [];
    
    groups.forEach((blockIds) => {
      // Sort blocks by position in the grid
      const sortedBlocks = blockIds
        .map(id => ({
          id,
          position: slide.layout?.blockPositions?.[id] || { row: 0, column: 0 }
        }))
        .sort((a, b) => {
          if (a.position.row !== b.position.row) {
            return a.position.row - b.position.row;
          }
          return a.position.column - b.position.column;
        });
      
      // Connect blocks in sequence
      for (let i = 0; i < sortedBlocks.length - 1; i++) {
        newConnections.push({
          from: sortedBlocks[i].id,
          to: sortedBlocks[i + 1].id,
          type: 'group',
          color: '#9333ea' // Purple color for group connections
        });
      }
    });
    
    return newConnections;
  };
  
  // Update connections when layout changes
  useEffect(() => {
    const spanConnections = (slide.blocks || []).map(block => {
      const span = slide.layout?.blockSpans?.[block.id];
      if (span?.columnSpan && span.columnSpan > 1) {
        return {
          from: block.id,
          to: block.id,
          type: 'span' as const,
          color: '#9333ea'
        } as BlockConnection;
      }
      return null;
    }).filter((c): c is BlockConnection => c !== null);
    
    const groupConnections = createGroupConnections();
    const newConnections = [...spanConnections, ...groupConnections];
    
    setConnections(newConnections);
    if (onUpdateConnections) {
      onUpdateConnections(slide.id, newConnections);
    }
  }, [slide.layout?.blockSpans, slide.layout?.blockPositions, slide.blocks]);
  
  // Render connection lines
  const renderConnections = () => {
    if (!svgRef.current) return null;
    
    const svgRect = svgRef.current.getBoundingClientRect();
    
    return connections.map((connection, index) => {
      const fromRect = blockElements.get(connection.from);
      const toRect = blockElements.get(connection.to);
      
      if (!fromRect || !toRect) return null;
      
      // Calculate line coordinates
      const fromX = fromRect.left + fromRect.width / 2 - svgRect.left;
      const fromY = fromRect.top + fromRect.height / 2 - svgRect.top;
      const toX = toRect.left + toRect.width / 2 - svgRect.left;
      const toY = toRect.top + toRect.height / 2 - svgRect.top;
      
      // For span connections, draw a background highlight
      if (connection.type === 'span') {
        return (
          <rect
            key={`span-${index}`}
            x={fromRect.left - svgRect.left}
            y={fromRect.top - svgRect.top}
            width={fromRect.width}
            height={fromRect.height}
            rx="8"
            fill={connection.color || '#9333ea'}
            fillOpacity="0.1"
            stroke={connection.color || '#9333ea'}
            strokeWidth="2"
            strokeDasharray="4 2"
          />
        );
      }
      
      // For group connections, draw connecting lines
      return (
        <g key={`group-${index}`}>
          <line
            x1={fromX}
            y1={fromY}
            x2={toX}
            y2={toY}
            stroke={connection.color || '#9333ea'}
            strokeWidth="2"
            strokeDasharray="4 2"
          />
          <circle
            cx={fromX}
            cy={fromY}
            r="4"
            fill={connection.color || '#9333ea'}
          />
          <circle
            cx={toX}
            cy={toY}
            r="4"
            fill={connection.color || '#9333ea'}
          />
        </g>
      );
    });
  };
  
  return (
    <svg
      ref={svgRef}
      className="absolute inset-0 pointer-events-none z-10"
      style={{ 
        width: '100%', 
        height: '100%',
        overflow: 'visible'
      }}
    >
      {renderConnections()}
    </svg>
  );
};

export default BlockConnectionManager;