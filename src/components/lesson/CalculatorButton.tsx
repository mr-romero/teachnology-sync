import React, { useState, useEffect } from 'react';
import { Calculator } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CalculatorButtonProps {
  disabled?: boolean;
}

const CalculatorButton: React.FC<CalculatorButtonProps> = ({ disabled = false }) => {
  const [isOpen, setIsOpen] = useState(false);

  // Add effect to handle body padding when calculator opens
  useEffect(() => {
    if (isOpen) {
      document.body.style.paddingRight = '25%'; // Make main content take 75% width
    } else {
      document.body.style.paddingRight = '0';
    }
    
    // Cleanup
    return () => {
      document.body.style.paddingRight = '0';
    };
  }, [isOpen]);

  const toggleCalculator = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  };

  return (
    <>
      <button
        className={cn(
          "fixed bottom-4 right-4 flex items-center justify-center w-12 h-12 rounded-full shadow-lg transition-all z-50",
          disabled 
            ? "bg-gray-300 cursor-not-allowed text-gray-500" 
            : "bg-blue-600 hover:bg-blue-700 text-white active:scale-95"
        )}
        disabled={disabled}
        onClick={toggleCalculator}
        aria-label={isOpen ? "Close Calculator" : "Open Calculator"}
        title={disabled ? "Calculator disabled" : (isOpen ? "Close Calculator" : "Open Calculator")}
      >
        <Calculator className="h-6 w-6" />
      </button>

      {/* Fixed Calculator Sidebar */}
      <div 
        className={cn(
          "fixed top-0 right-0 h-full bg-white shadow-xl transition-all duration-300 ease-in-out z-50",
          isOpen ? "w-1/4" : "w-0 opacity-0"
        )}
      >
        <div className="h-full w-full flex flex-col">
          {isOpen && (
            <>
              <div className="p-4 border-b flex justify-between items-center">
                <h3 className="font-medium">Calculator</h3>
                <button 
                  onClick={toggleCalculator}
                  className="rounded-full h-8 w-8 flex items-center justify-center hover:bg-gray-100"
                >
                  ✕
                </button>
              </div>
              <iframe 
                src="https://www.desmos.com/testing/texas/graphing"
                className="w-full h-full border-none" 
                allow="fullscreen clipboard-write"
              />
            </>
          )}
        </div>
      </div>
      
      {/* Semi-transparent overlay only behind calculator */}
      {isOpen && (
        <div 
          className="fixed inset-y-0 right-0 w-1/4 bg-black/5 -z-10"
          aria-hidden="true"
        />
      )}
    </>
  );
};

export default CalculatorButton;