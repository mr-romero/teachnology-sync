import React, { useState } from 'react';
import { Calculator } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CalculatorButtonProps {
  disabled?: boolean;
}

const CalculatorButton: React.FC<CalculatorButtonProps> = ({ disabled = false }) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleCalculator = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  };

  return (
    <>
      <button
        className={cn(
          "flex items-center justify-center w-12 h-12 rounded-full shadow-lg transition-all z-50",
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

      {/* Sidebar Calculator */}
      <div 
        className={cn(
          "fixed top-0 right-0 z-50 h-full bg-white shadow-xl transition-all duration-300 ease-in-out",
          isOpen ? "w-[500px]" : "w-0 opacity-0"
        )}
        style={{ maxWidth: '100vw' }}
      >
        <div className="h-full w-full flex flex-col">
          {isOpen && (
            <>
              <div className="p-4 border-b flex justify-between items-center">
                <h3 className="font-medium">Desmos Calculator</h3>
                <button 
                  onClick={toggleCalculator}
                  className="rounded-full h-8 w-8 flex items-center justify-center hover:bg-gray-100"
                >
                  ✕
                </button>
              </div>
              <iframe 
                src="https://www.desmos.com/calculator" 
                title="Desmos Calculator"
                className="w-full h-full border-none" 
                allow="fullscreen clipboard-write"
              />
            </>
          )}
        </div>
      </div>
      
      {/* Overlay to catch clicks outside the sidebar when open */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-40"
          onClick={toggleCalculator}
          aria-hidden="true"
        />
      )}
    </>
  );
};

export default CalculatorButton;