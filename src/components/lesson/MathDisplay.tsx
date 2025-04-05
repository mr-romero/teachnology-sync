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

          // Add custom CSS to force inline rendering and proper spacing
          const customStyle = document.createElement('style');
          customStyle.textContent = `
            .mathquill-rendered-math {
              display: inline-block !important;
              vertical-align: middle !important;
              margin: 0 0.1em !important;
            }
            .mathquill-rendered-math.text-mode {
              margin: 0 !important;
            }
            .mathquill-rendered-math sup {
              vertical-align: super !important;
            }
            .mathquill-rendered-math sub {
              vertical-align: sub !important;
            }
          `;
          document.head.appendChild(customStyle);
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

      // Create new static math field
      mathFieldRef.current = MQ.StaticMath(containerRef.current);
      
      // Apply styles based on display mode
      if (display) {
        containerRef.current.style.display = 'block';
        containerRef.current.style.margin = '0.5em 0';
      } else {
        containerRef.current.style.display = 'inline';
        containerRef.current.style.margin = '0';
      }
      
      mathFieldRef.current.latex(latex);
    };

    loadMathQuill();

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [latex, display]);

  return (
    <div 
      ref={containerRef}
      className={cn(
        "inline align-baseline",
        display && "block my-4",
        className
      )}
    />
  );
};

export default MathDisplay;