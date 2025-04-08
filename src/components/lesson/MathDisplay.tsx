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
            /* Base container styles */
            .mathquill-rendered-math {
              display: inline-block !important;
              vertical-align: middle !important;
              padding: 0 !important;
              margin: 0 !important;
              position: relative;
              transform: translateY(-0.6em) !important;
              line-height: normal !important;
            }
            
            /* Root block alignment */
            .mathquill-rendered-math .mq-root-block {
              display: inline-block !important;
              vertical-align: middle !important;
              line-height: normal !important;
              transform: translateY(0) !important;
            }

            /* Math elements alignment */
            .mathquill-rendered-math span {
              margin: 0 !important;
              vertical-align: baseline !important;
              line-height: normal !important;
            }

            /* Operators alignment */
            .mathquill-rendered-math .mq-binary-operator {
              display: inline-block !important;
              margin: 0 0.125em !important;
              vertical-align: baseline !important;
              transform: translateY(-0.6em) !important;
            }

            /* Superscripts and subscripts */
            .mathquill-rendered-math .mq-sup-only {
              vertical-align: super !important;
              position: relative;
              font-size: 0.85em;
              top: -0.6em !important;
            }
            .mathquill-rendered-math .mq-sub-only {
              vertical-align: sub !important;
              position: relative;
              font-size: 0.85em;
              bottom: -0.1em !important;
            }

            /* Fraction alignment */
            .mathquill-rendered-math .mq-fraction {
              display: inline-block !important;
              vertical-align: middle !important;
              transform: translateY(-0.6em) !important;
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
        "inline-block",
        className
      )}
      style={{ 
        display: 'inline-block',
        verticalAlign: 'baseline',
        transform: 'translateY(-0.6em)'
      }}
    />
  );
};

export default MathDisplay;