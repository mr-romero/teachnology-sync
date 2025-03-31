import React, { useEffect, useRef } from 'react';
import { GraphBlock } from '@/types/lesson';

interface GraphRendererProps {
  block: GraphBlock;
  isEditable?: boolean;
}

const GraphRenderer: React.FC<GraphRendererProps> = ({ 
  block,
  isEditable = false
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const calculatorRef = useRef<any>(null);

  useEffect(() => {
    // Only run if we're in the browser and the container exists
    if (typeof window !== 'undefined' && containerRef.current) {
      // Clean up any previous calculator instance
      if (calculatorRef.current) {
        calculatorRef.current.destroy();
      }

      // Load Desmos calculator when the component mounts
      const loadDesmos = async () => {
        // Check if Desmos is already loaded
        if (window.Desmos) {
          initializeCalculator();
        } else {
          // Load Desmos script if it's not already loaded
          const script = document.createElement('script');
          script.src = 'https://www.desmos.com/api/v1.7/calculator.js?apiKey=dcb31709b452b1cf9dc26972add0fda6';
          script.async = true;
          script.onload = initializeCalculator;
          document.body.appendChild(script);
        }
      };

      const initializeCalculator = () => {
        try {
          // Initialize the calculator
          calculatorRef.current = window.Desmos.GraphingCalculator(containerRef.current, {
            expressions: !isEditable,
            settingsMenu: isEditable,
            expressionsCollapsed: true,
            zoomButtons: true,
            lockViewport: !isEditable,
            border: false
          });

          // Set the graph bounds
          const { xMin, xMax, yMin, yMax } = block.settings;
          calculatorRef.current.setMathBounds({
            left: xMin,
            right: xMax,
            bottom: yMin,
            top: yMax
          });

          // Add the equation expression
          calculatorRef.current.setExpression({ id: 'graph1', latex: block.equation });
        } catch (error) {
          console.error('Error initializing Desmos calculator:', error);
        }
      };

      loadDesmos();
    }

    // Clean up on unmount
    return () => {
      if (calculatorRef.current) {
        calculatorRef.current.destroy();
      }
    };
  }, [block.equation, block.settings, isEditable]);

  // Update the calculator when the equation or settings change
  useEffect(() => {
    if (calculatorRef.current) {
      // Update bounds if they've changed
      const { xMin, xMax, yMin, yMax } = block.settings;
      calculatorRef.current.setMathBounds({
        left: xMin,
        right: xMax,
        bottom: yMin,
        top: yMax
      });

      // Update the equation
      calculatorRef.current.setExpression({ id: 'graph1', latex: block.equation });
    }
  }, [block.equation, block.settings]);

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full min-h-[240px]"
      data-testid="graph-renderer"
    />
  );
};

// Add this declaration to fix TypeScript errors
declare global {
  interface Window {
    Desmos: {
      GraphingCalculator: (
        container: HTMLElement,
        options?: any
      ) => any;
    };
  }
}

export default GraphRenderer;