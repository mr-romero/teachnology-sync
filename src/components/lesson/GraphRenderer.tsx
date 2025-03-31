import React, { useEffect, useRef, memo, useMemo, useState } from 'react';
import { GraphBlock } from '@/types/lesson';
import CalculatorButton from './CalculatorButton';
import { v4 as uuidv4 } from 'uuid';

declare global {
  interface Window {
    Desmos?: {
      GraphingCalculator: new (element: HTMLElement, options?: any) => any;
    };
  }
}

interface GraphRendererProps {
  block: GraphBlock;
  height?: string;
  className?: string;
  isEditable?: boolean;
}

const GraphRenderer: React.FC<GraphRendererProps> = ({ 
  block, 
  height = '300px',
  className = '',
  isEditable = false
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const calculatorRef = useRef<any>(null);
  const instanceId = useRef(uuidv4()).current;
  const [containerHeight, setContainerHeight] = useState(height);
  const [isDesmosLoaded, setIsDesmosLoaded] = useState(Boolean(window.Desmos));
  
  // Memoize the settings to avoid unnecessary re-renders
  const settings = useMemo(() => ({
    ...block.settings,
    showGrid: block.settings.showGrid !== false,
    showAxes: block.settings.showAxes !== false,
    showXAxis: block.settings.showXAxis !== false,
    showYAxis: block.settings.showYAxis !== false,
    polarMode: block.settings.polarMode === true,
    xMin: block.settings.xMin ?? -10,
    xMax: block.settings.xMax ?? 10,
    yMin: block.settings.yMin ?? -10,
    yMax: block.settings.yMax ?? 10,
    showCalculator: block.settings.showCalculator !== false, // Default to true unless explicitly set to false
    allowPanning: block.settings.allowPanning !== false,
    allowZooming: block.settings.allowZooming !== false,
    backgroundColor: block.settings.backgroundColor || '#ffffff',
    xAxisLabel: block.settings.xAxisLabel || '',
    yAxisLabel: block.settings.yAxisLabel || '',
  }), [
    block.settings.xMin,
    block.settings.xMax,
    block.settings.yMin,
    block.settings.yMax,
    block.settings.showGrid,
    block.settings.showAxes,
    block.settings.showXAxis,
    block.settings.showYAxis,
    block.settings.polarMode,
    block.settings.allowPanning,
    block.settings.allowZooming,
    block.settings.backgroundColor,
    block.settings.xAxisLabel,
    block.settings.yAxisLabel,
    block.settings.showCalculator,
  ]);

  // Memoize the equations
  const equations = useMemo(() => {
    // If we have equations array, use it
    if (block.equations && block.equations.length > 0) {
      return block.equations;
    }
    
    // Otherwise, create one from the legacy equation field
    if (block.equation) {
      return [{
        id: 'legacy',
        latex: block.equation,
        color: block.color || '#2d70b3',
        label: '',
        showLabel: false,
        pointStyle: 'POINT',
        lineStyle: 'SOLID',
        points: [],
        visible: true,
      }];
    }
    
    return [];
  }, [block.equations, block.equation, block.color]);

  // Check if Desmos is loaded
  useEffect(() => {
    // If Desmos is not available, set up a listener for when it loads
    if (!window.Desmos) {
      const checkDesmosLoaded = setInterval(() => {
        if (window.Desmos) {
          setIsDesmosLoaded(true);
          clearInterval(checkDesmosLoaded);
          initializeCalculator();
        }
      }, 500);
      
      return () => clearInterval(checkDesmosLoaded);
    } else {
      setIsDesmosLoaded(true);
    }
  }, []);

  // Initialize the calculator once
  useEffect(() => {
    if (!window.Desmos) {
      console.warn('Desmos library not loaded');
      return;
    }
    
    // Initialize once the component is mounted
    initializeCalculator();
    
    // Clean up when the component is unmounted
    return () => {
      if (calculatorRef.current) {
        try {
          calculatorRef.current.destroy();
        } catch (e) {
          console.error('Failed to destroy calculator', e);
        }
      }
    };
  }, [isDesmosLoaded]);

  // Handle container resize
  useEffect(() => {
    const handleResize = () => {
      if (calculatorRef.current) {
        calculatorRef.current.resize();
      }
    };
    window.addEventListener('resize', handleResize);
    
    // Create a ResizeObserver to detect container size changes
    if (containerRef.current && typeof ResizeObserver !== 'undefined') {
      const resizeObserver = new ResizeObserver((entries) => {
        if (calculatorRef.current) {
          // Get the actual height of the container
          const entry = entries[0];
          if (entry) {
            const actualHeight = entry.contentRect.height;
            setContainerHeight(`${actualHeight}px`);
          }
          
          // Delay resize to ensure DOM has been updated
          setTimeout(() => {
            calculatorRef.current.resize();
          }, 200); // Increased delay for better reliability
        }
      });
      
      resizeObserver.observe(containerRef.current);
      
      return () => {
        resizeObserver.disconnect();
        window.removeEventListener('resize', handleResize);
      };
    }
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Initialize the calculator
  const initializeCalculator = () => {
    if (!containerRef.current || !window.Desmos) return;
    
    // Create a new calculator instance with a unique ID to prevent conflicts
    const containerId = `desmos-container-${instanceId}`;
    containerRef.current.id = containerId;
    
    // Clear any existing content
    containerRef.current.innerHTML = '';
    
    try {
      // Set up calculator options based on settings
      const calculatorOptions = {
        expressions: false,
        settingsMenu: false,
        zoomButtons: settings.allowZooming,
        lockViewport: !settings.allowPanning,
        border: false,
        labels: true,
        backgroundColor: settings.backgroundColor,
        containerBounds: true, // Force calculator to fit container
        autosize: true, // Enable autosizing
      };
      
      // Create the calculator
      calculatorRef.current = window.Desmos.GraphingCalculator(
        containerRef.current, 
        calculatorOptions
      );
      
      updateCalculator();
      
      // Force resize after a brief delay to ensure proper rendering
      setTimeout(() => {
        if (calculatorRef.current) {
          calculatorRef.current.resize();
        }
      }, 300); // Increased delay for more reliable sizing
    } catch (error) {
      console.error('Failed to initialize calculator', error);
    }
  };

  // Update calculator settings
  const updateCalculator = () => {
    const calculator = calculatorRef.current;
    if (!calculator) return;
    
    try {
      // Set the viewport (bounds)
      calculator.setMathBounds({
        left: Number(settings.xMin),
        right: Number(settings.xMax),
        bottom: Number(settings.yMin),
        top: Number(settings.yMax)
      });
      
      // Configure grid settings
      calculator.updateSettings({
        showGrid: settings.showGrid,
        showXAxis: settings.showXAxis && settings.showAxes,
        showYAxis: settings.showYAxis && settings.showAxes,
        polarMode: settings.polarMode
      });
      
      // Set axis labels if provided
      if (settings.xAxisLabel) {
        calculator.setExpression({ id: 'xAxisLabel', latex: `\\text{${settings.xAxisLabel}}` });
      }
      
      if (settings.yAxisLabel) {
        calculator.setExpression({ id: 'yAxisLabel', latex: `\\text{${settings.yAxisLabel}}` });
      }
      
      // Clear all equations first
      calculator.removeExpressions(calculator.getExpressions());
      
      // Add all equations
      equations.forEach(eq => {
        if (eq.visible !== false) {
          calculator.setExpression({
            id: eq.id,
            latex: eq.latex,
            color: eq.color,
            label: eq.showLabel ? eq.label : '',
            lineStyle: eq.lineStyle?.toLowerCase(),
            pointStyle: eq.pointStyle?.toLowerCase(),
          });
        }
      });
      
      // Force a resize to ensure proper rendering
      calculator.resize();
    } catch (err) {
      console.error('Error updating calculator:', err);
    }
  };

  // Update the calculator when relevant props change
  useEffect(() => {
    if (calculatorRef.current) {
      updateCalculator();
    }
  }, [equations, settings]);

  return (
    <div className="graph-renderer-container w-full h-full" style={{ 
      height: '100%', 
      position: 'relative',
      overflow: 'hidden',
      minHeight: '200px',
    }}>
      {/* We're removing the calculator button from here since it's now handled by LessonSlideView */}
      
      {!isDesmosLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-80 z-10">
          <p className="text-sm font-medium text-gray-600">Loading Desmos calculator...</p>
        </div>
      )}
      
      <div 
        ref={containerRef}
        className={`desmos-container ${className}`}
        style={{ 
          width: '100%',
          height: '100%',
          position: 'relative',
          borderRadius: '0.375rem',
          overflow: 'hidden',
        }}
      ></div>
    </div>
  );
};

// Memoize the component to prevent unnecessary re-renders
export default memo(GraphRenderer);