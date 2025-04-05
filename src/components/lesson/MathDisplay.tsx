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

          // Add custom CSS to force inline rendering
          const customStyle = document.createElement('style');
          customStyle.textContent = `
            .mathquill-rendered-math {
              display: inline !important;
              vertical-align: baseline !important;
              padding: 0 !important;
              margin: 0 !important;
            }
            .mathquill-rendered-math.text-mode {
              margin: 0 !important;
            }
            /* Remove any built-in margins that might cause wrapping */
            .mathquill-rendered-math span {
              margin: 0 !important;
            }
            /* Ensure operators don't force line breaks */
            .mathquill-rendered-math .mq-binary-operator {
              display: inline !important;
              margin: 0 0.125em !important;
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
      mathFieldRef.current.latex(latex);
      
      // Force inline display mode
      if (containerRef.current.firstChild) {
        (containerRef.current.firstChild as HTMLElement).style.display = 'inline';
        (containerRef.current.firstChild as HTMLElement).style.margin = '0';
        (containerRef.current.firstChild as HTMLElement).style.verticalAlign = 'baseline';
      }
    };

    loadMathQuill();

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [latex, display]);

  return (
    <span 
      ref={containerRef}
      className={cn(
        "inline align-baseline",
        className
      )}
    />
  );
};

export default MathDisplay;