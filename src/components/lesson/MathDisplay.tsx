import React, { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface MathDisplayProps {
  latex: string;
  className?: string;
  display?: boolean;
}

declare global {
  interface Window {
    jQuery: any;
    MathQuill: {
      getInterface: (version: number) => any;
    };
  }
}

const MathDisplay: React.FC<MathDisplayProps> = ({
  latex,
  className,
  display = false
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mathFieldRef = useRef<any>(null);

  useEffect(() => {
    const loadMathQuill = async () => {
      if (!window.MathQuill) {
        // Load MathQuill CSS if not already loaded
        if (!document.querySelector('link[href*="mathquill.css"]')) {
          const mathquillCss = document.createElement('link');
          mathquillCss.rel = 'stylesheet';
          mathquillCss.href = 'https://cdnjs.cloudflare.com/ajax/libs/mathquill/0.10.1/mathquill.css';
          document.head.appendChild(mathquillCss);
        }

        // Load jQuery if not already loaded
        if (!window.jQuery) {
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jquery/3.6.0/jquery.min.js';
          script.async = true;
          await new Promise((resolve) => {
            script.onload = resolve;
            document.body.appendChild(script);
          });
        }

        // Load MathQuill
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/mathquill/0.10.1/mathquill.min.js';
        script.async = true;
        await new Promise((resolve) => {
          script.onload = resolve;
          document.body.appendChild(script);
        });
      }

      setupMathField();
    };

    const setupMathField = () => {
      if (!containerRef.current || !window.MathQuill) return;

      const MQ = window.MathQuill.getInterface(2);
      
      // Clear previous instance if it exists
      if (mathFieldRef.current) {
        containerRef.current.innerHTML = '';
      }

      // Create new static math field with display mode based on prop
      mathFieldRef.current = MQ.StaticMath(containerRef.current);
      
      // Handle display mode with proper styling
      if (display) {
        containerRef.current.style.display = 'block';
        containerRef.current.style.margin = '0.5em 0';
        containerRef.current.style.fontSize = '1.2em';
      } else {
        containerRef.current.style.display = 'inline-block';
        containerRef.current.style.margin = '0';
        containerRef.current.style.verticalAlign = 'middle';
      }
      
      mathFieldRef.current.latex(latex);
    };

    loadMathQuill();

    return () => {
      // Cleanup if needed
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [latex, display]);

  return (
    <div 
      ref={containerRef}
      className={cn(
        "overflow-x-auto",
        display && "my-4 text-lg",
        className
      )}
      style={{ 
        lineHeight: display ? '1.4' : 'inherit',
        minHeight: display ? '1.4em' : 'auto'
      }}
    />
  );
};

export default MathDisplay;