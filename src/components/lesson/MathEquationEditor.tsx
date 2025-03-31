import React, { useEffect, useRef, useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Trash, GripVertical, Plus, Check, X } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface MathFieldOptions {
  spaceBehavesLikeTab?: boolean;
  leftRightIntoCmdGoes?: string;
  restrictMismatchedBrackets?: boolean;
  sumStartsWithNEquals?: boolean;
  supSubsRequireOperand?: boolean;
  charsThatBreakOutOfSupSub?: string;
  autoSubscriptNumerals?: boolean;
  autoCommands?: string;
  autoOperatorNames?: string;
  maxDepth?: number;
  handlers?: any;
}

interface MathEquationEditorProps {
  initialLatex?: string;
  onChange: (latex: string) => void;
  placeholder?: string;
  className?: string;
  autofocus?: boolean;
  mathFieldOptions?: MathFieldOptions;
}

const MathEquationEditor: React.FC<MathEquationEditorProps> = ({
  initialLatex = '',
  onChange,
  placeholder = 'Enter equation',
  className,
  autofocus = false,
  mathFieldOptions = {}
}) => {
  const [isSetup, setIsSetup] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const mathFieldRef = useRef<any>(null);
  const latexRef = useRef<string>(initialLatex);
  const onChangeRef = useRef<(latex: string) => void>(onChange);

  // Update refs when props change
  useEffect(() => {
    latexRef.current = initialLatex;
    onChangeRef.current = onChange;
  }, [initialLatex, onChange]);

  useEffect(() => {
    const loadMathQuill = async () => {
      if (!window.MathQuill) {
        // Load MathQuill CSS
        if (!document.querySelector('link[href*="mathquill.css"]')) {
          const mathquillCss = document.createElement('link');
          mathquillCss.rel = 'stylesheet';
          mathquillCss.href = 'https://cdnjs.cloudflare.com/ajax/libs/mathquill/0.10.1/mathquill.css';
          document.head.appendChild(mathquillCss);
        }

        // Load jQuery (required by MathQuill)
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
      if (!editorRef.current || !window.MathQuill) return;

      const MQ = window.MathQuill.getInterface(2);
      
      // Merge default options with provided options
      const options = {
        spaceBehavesLikeTab: true,
        leftRightIntoCmdGoes: 'up',
        restrictMismatchedBrackets: true,
        sumStartsWithNEquals: true,
        supSubsRequireOperand: true,
        autoCommands: 'pi theta sqrt sum int',
        autoOperatorNames: 'sin cos tan',
        ...mathFieldOptions,
        handlers: {
          edit: (mathField: any) => {
            const latex = mathField.latex();
            // Use ref to avoid dependency on onChange
            if (latex !== latexRef.current) {
              latexRef.current = latex;
              onChangeRef.current(latex);
            }
          },
          ...(mathFieldOptions.handlers || {})
        }
      };

      // Create the math field
      mathFieldRef.current = MQ.MathField(editorRef.current, options);
      
      // Set initial value
      if (latexRef.current) {
        mathFieldRef.current.latex(latexRef.current);
      }

      // Focus if specified
      if (autofocus) {
        mathFieldRef.current.focus();
      }

      setIsSetup(true);
    };

    loadMathQuill();

    return () => {
      // Clean up if needed
      setIsSetup(false);
    };
  }, []); // Empty dependency array - only run once on mount

  // Update latex when initialLatex prop changes but don't include it as a dependency
  useEffect(() => {
    if (isSetup && mathFieldRef.current && initialLatex !== mathFieldRef.current.latex()) {
      // Only update if different to avoid loops
      mathFieldRef.current.latex(initialLatex);
    }
  }, [initialLatex, isSetup]);

  return (
    <div 
      className={cn(
        "p-2 border rounded-md min-h-[38px] focus-within:ring-1 focus-within:ring-ring",
        className
      )}
      data-testid="math-equation-editor"
    >
      <div 
        ref={editorRef} 
        className="w-full"
        data-placeholder={placeholder}
      />
    </div>
  );
};

interface EquationListProps {
  equations: Array<{
    id: string;
    latex: string;
    color?: string;
    label?: string;
    isVisible?: boolean;
  }>;
  onEquationsChange: (equations: Array<{
    id: string;
    latex: string;
    color?: string;
    label?: string;
    isVisible?: boolean;
  }>) => void;
}

const EquationList: React.FC<EquationListProps> = ({ 
  equations, 
  onEquationsChange 
}) => {
  // Memoize handler functions to prevent unnecessary rerenders
  const addEquation = useCallback(() => {
    const newEquations = [
      ...equations,
      {
        id: uuidv4(),
        latex: '',
        color: '',
        isVisible: true
      }
    ];
    onEquationsChange(newEquations);
  }, [equations, onEquationsChange]);

  const updateEquation = useCallback((index: number, field: string, value: any) => {
    const updatedEquations = [...equations];
    updatedEquations[index] = {
      ...updatedEquations[index],
      [field]: value
    };
    onEquationsChange(updatedEquations);
  }, [equations, onEquationsChange]);

  const removeEquation = useCallback((index: number) => {
    const updatedEquations = equations.filter((_, i) => i !== index);
    onEquationsChange(updatedEquations);
  }, [equations, onEquationsChange]);

  // Default colors for equations
  const defaultColors = [
    "#c74440", "#2d70b3", "#388c46", "#6042a6", "#000000",
    "#fa7e19", "#cf5288", "#45818e", "#d64554", "#8e5d34"
  ];

  return (
    <div className="space-y-4">
      <div className="mb-2 flex justify-between items-center">
        <Label>Equations</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addEquation}
          className="flex items-center gap-1"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Equation
        </Button>
      </div>

      {equations.length === 0 ? (
        <div className="border border-dashed rounded-md p-4 text-center text-muted-foreground">
          <p>No equations added yet. Click "Add Equation" to start.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {equations.map((equation, index) => (
            <div key={equation.id} className="border rounded-md p-3 bg-card">
              <div className="flex items-center gap-2 mb-2">
                <GripVertical className="h-4 w-4 text-muted-foreground opacity-50 cursor-move" />
                <Switch
                  checked={equation.isVisible !== false}
                  onCheckedChange={(checked) => updateEquation(index, 'isVisible', checked)}
                  aria-label="Toggle equation visibility"
                />
                <span className="flex-grow text-sm font-medium">
                  Equation {index + 1}
                </span>
                <Select
                  value={equation.color || defaultColors[index % defaultColors.length]}
                  onValueChange={(value) => updateEquation(index, 'color', value)}
                >
                  <SelectTrigger className="w-20 h-7">
                    <SelectValue placeholder="Color" />
                  </SelectTrigger>
                  <SelectContent>
                    {defaultColors.map((color) => (
                      <SelectItem key={color} value={color}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: color }}
                          />
                          <span style={{ color }}>{color}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeEquation(index)}
                  className="h-7 w-7 text-destructive"
                >
                  <Trash className="h-3.5 w-3.5" />
                </Button>
              </div>
              
              <div className="space-y-2">
                <MathEquationEditor
                  key={`eq-${equation.id}`}
                  initialLatex={equation.latex}
                  onChange={(latex) => updateEquation(index, 'latex', latex)}
                  placeholder="Enter equation (e.g., y = x^2 + 2)"
                  className="bg-background"
                  mathFieldOptions={{
                    autoCommands: 'pi theta phi sqrt sum prod int',
                    autoOperatorNames: 'sin cos tan csc sec cot ln log'
                  }}
                />
                
                <div className="flex gap-2">
                  <div className="flex-grow">
                    <Input
                      value={equation.label || ''}
                      onChange={(e) => updateEquation(index, 'label', e.target.value)}
                      placeholder="Label (optional)"
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Add this declaration to fix TypeScript errors
declare global {
  interface Window {
    jQuery: any;
    MathQuill: {
      getInterface: (version: number) => any;
    };
  }
}

export { MathEquationEditor, EquationList };