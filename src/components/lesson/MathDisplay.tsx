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

          // Add custom CSS to force inline rendering and precise vertical alignment
          const customStyle = document.createElement('style');
          customStyle.textContent = `
            .mathquill-rendered-math {
              display: inline !important;
              vertical-align: -0.1em !important;
              padding: 0 !important;
              margin: 0 !important;
              position: relative;
              top: -0.05em;
            }
            /* Base container styles */
            .mathquill-rendered-math.mq-editable-field {
              transform: translateY(0.05em);
            }
            /* Adjust specific math elements */
            .mathquill-rendered-math .mq-root-block {
              vertical-align: baseline !important;
              line-height: 1 !important;
            }
            /* Remove any built-in margins that might affect alignment */
            .mathquill-rendered-math span {
              margin: 0 !important;
              vertical-align: baseline !important;
            }
            /* Ensure operators align properly */
            .mathquill-rendered-math .mq-binary-operator {
              display: inline !important;
              margin: 0 0.125em !important;
              vertical-align: baseline !important;
            }
            /* Adjust superscripts and subscripts */
            .mathquill-rendered-math .mq-sup-only {
              vertical-align: baseline !important;
              position: relative;
              top: -0.5em;
            }
            .mathquill-rendered-math .mq-sub-only {
              vertical-align: baseline !important;
              position: relative;
              top: 0.2em;
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
      
      // Force inline display mode and adjust vertical position
      if (containerRef.current.firstChild) {
        const mathElement = containerRef.current.firstChild as HTMLElement;
        mathElement.style.display = 'inline';
        mathElement.style.margin = '0';
        mathElement.style.verticalAlign = 'baseline';
        mathElement.style.position = 'relative';
        mathElement.style.top = '-0.05em';
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
        "inline align-baseline relative",
        className
      )}
      style={{ 
        display: 'inline-flex',
        alignItems: 'baseline',
        verticalAlign: 'baseline'
      }}
    />
  );
};

export default MathDisplay;