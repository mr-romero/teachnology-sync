import React, { useEffect, useRef, useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Trash, GripVertical, Plus } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { addStyles, EditableMathField } from 'react-mathquill';
import { ScrollArea } from '@/components/ui/scroll-area';

// Initialize MathQuill styles
addStyles();

interface MathEquationEditorProps {
  initialValue?: string;
  onChange?: (latex: string) => void;
  className?: string;
  label?: string;
  placeholder?: string;
}

const MathEquationEditor: React.FC<MathEquationEditorProps> = ({
  initialValue = '',
  onChange,
  className,
  label,
  placeholder = 'Click here to edit equation...'
}) => {
  const [latex, setLatex] = useState(initialValue);
  const mathFieldRef = useRef(null);

  const handleChange = (mathField: any) => {
    const newLatex = mathField.latex();
    setLatex(newLatex);
    onChange?.(newLatex);
  };

  const insertSymbol = (symbol: string) => {
    if (mathFieldRef.current) {
      const mathField = mathFieldRef.current as any;
      mathField.cmd(symbol);
      mathField.focus();
    }
  };

  const commonSymbols = [
    { label: '+', cmd: 'plus' },
    { label: '−', cmd: 'minus' },
    { label: '×', cmd: 'times' },
    { label: '÷', cmd: 'div' },
    { label: '=', cmd: '=' },
    { label: '≠', cmd: 'neq' },
    { label: '<', cmd: 'lt' },
    { label: '>', cmd: 'gt' },
    { label: '≤', cmd: 'le' },
    { label: '≥', cmd: 'ge' },
    { label: '±', cmd: 'pm' },
    { label: '∞', cmd: 'infinity' },
  ];

  const functions = [
    { label: 'sin', cmd: 'sin' },
    { label: 'cos', cmd: 'cos' },
    { label: 'tan', cmd: 'tan' },
    { label: 'log', cmd: 'log' },
    { label: 'ln', cmd: 'ln' },
    { label: '√', cmd: 'sqrt' },
    { label: 'π', cmd: 'pi' },
    { label: 'θ', cmd: 'theta' },
  ];

  const structures = [
    { label: 'x²', cmd: '^2' },
    { label: 'x³', cmd: '^3' },
    { label: 'xⁿ', cmd: '^n' },
    { label: '∫', cmd: 'int' },
    { label: '∑', cmd: 'sum' },
    { label: '∏', cmd: 'prod' },
    { label: 'ⁿ√', cmd: 'nthroot' },
    { label: 'ᵤ∫ᵥ', cmd: 'defint' },
  ];

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          {label}
        </label>
      )}
      
      <div className="flex flex-col space-y-4">
        {/* Main editor field */}
        <div className="border rounded-md p-3 bg-white">
          <EditableMathField
            mathquillDidMount={field => mathFieldRef.current = field}
            latex={latex}
            onChange={handleChange}
            config={{
              spaceBehavesLikeTab: true,
              leftRightIntoCmdGoes: 'up',
              restrictMismatchedBrackets: true,
              sumStartsWithNEquals: true,
              supSubsRequireOperand: true,
              autoSubscriptNumerals: true,
              autoCommands: 'pi theta sqrt sum prod int',
              maxDepth: 10,
            }}
            className="w-full min-h-[60px] focus:outline-none"
          />
        </div>

        {/* Symbols toolbar */}
        <ScrollArea className="h-[200px] border rounded-md p-2">
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium mb-2">Common Symbols</h3>
              <div className="grid grid-cols-6 gap-1">
                {commonSymbols.map((symbol, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => insertSymbol(symbol.cmd)}
                    className="h-8"
                  >
                    {symbol.label}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium mb-2">Functions</h3>
              <div className="grid grid-cols-6 gap-1">
                {functions.map((func, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => insertSymbol(func.cmd)}
                    className="h-8"
                  >
                    {func.label}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium mb-2">Structures</h3>
              <div className="grid grid-cols-6 gap-1">
                {structures.map((structure, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => insertSymbol(structure.cmd)}
                    className="h-8"
                  >
                    {structure.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* LaTeX preview */}
        <div className="space-y-2">
          <label className="text-sm font-medium">LaTeX Output</label>
          <Input
            value={latex}
            onChange={(e) => {
              setLatex(e.target.value);
              if (mathFieldRef.current) {
                (mathFieldRef.current as any).latex(e.target.value);
              }
            }}
            placeholder="LaTeX code will appear here"
            className="font-mono text-sm"
          />
        </div>
      </div>
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
                  initialValue={equation.latex}
                  onChange={(latex) => updateEquation(index, 'latex', latex)}
                  placeholder="Enter equation (e.g., y = x^2 + 2)"
                  className="bg-background"
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