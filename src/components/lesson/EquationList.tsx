import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Check, Plus, Trash2, Pencil, X, Eye, EyeOff } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface Equation {
  id: string;
  latex: string;
  color?: string;
  label?: string;
  isVisible?: boolean;
}

interface EquationListProps {
  equations: Equation[];
  onEquationsChange: (equations: Equation[]) => void;
}

const EquationList: React.FC<EquationListProps> = ({ equations, onEquationsChange }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Add a new equation
  const addEquation = () => {
    const newEquation: Equation = {
      id: uuidv4(),
      latex: 'y=', // Start with a basic template
      color: getNextColor(equations.length),
      isVisible: true
    };
    
    onEquationsChange([...equations, newEquation]);
    
    // Start editing the new equation immediately
    setEditingId(newEquation.id);
  };
  
  // Delete an equation by id
  const deleteEquation = (id: string) => {
    const newEquations = equations.filter(eq => eq.id !== id);
    onEquationsChange(newEquations);
    
    // If currently editing this equation, clear the editing state
    if (editingId === id) {
      setEditingId(null);
    }
  };
  
  // Update a specific equation
  const updateEquation = (id: string, updates: Partial<Equation>) => {
    const newEquations = equations.map(eq => 
      eq.id === id ? { ...eq, ...updates } : eq
    );
    onEquationsChange(newEquations);
  };
  
  // Toggle equation visibility
  const toggleVisibility = (id: string) => {
    const equation = equations.find(eq => eq.id === id);
    if (equation) {
      updateEquation(id, { isVisible: equation.isVisible === false });
    }
  };
  
  // Generate a color for a new equation based on its index
  const getNextColor = (index: number) => {
    const colors = [
      '#c74440', // Red
      '#2d70b3', // Blue
      '#388c46', // Green
      '#6042a6', // Purple
      '#000000', // Black
      '#fa7e19', // Orange
      '#4d4d4d', // Gray
      '#9d5cbb', // Violet
      '#01a1c1'  // Teal
    ];
    
    return colors[index % colors.length];
  };
  
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>Equations</Label>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={addEquation}
          className="flex items-center gap-1"
        >
          <Plus className="h-4 w-4" />
          <span>Add</span>
        </Button>
      </div>
      
      <div className="space-y-2">
        {equations.length === 0 ? (
          <div className="p-4 border rounded-md text-center text-muted-foreground">
            No equations yet. Add one to start graphing.
          </div>
        ) : (
          equations.map((equation, index) => (
            <div 
              key={equation.id} 
              className="flex items-center p-2 border rounded-md gap-2 group"
              style={{ 
                borderLeftWidth: '4px', 
                borderLeftColor: equation.color || getNextColor(index)
              }}
            >
              {editingId === equation.id ? (
                // Editing mode
                <div className="flex-1 flex items-center gap-2">
                  <div className="w-6 flex justify-center">
                    <div className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: equation.color }}
                    />
                  </div>
                  
                  <div className="flex-1">
                    <Label className="sr-only">Equation in LaTeX</Label>
                    <Input
                      value={equation.latex}
                      onChange={(e) => updateEquation(equation.id, { latex: e.target.value })}
                      placeholder="Enter LaTeX equation (e.g., y=x^2)"
                      className="font-mono text-sm"
                      autoFocus
                    />
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setEditingId(null)}
                      className="size-7"
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                // View mode
                <div className="flex-1 flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => toggleVisibility(equation.id)}
                    className="size-7"
                    title={equation.isVisible === false ? "Show equation" : "Hide equation"}
                  >
                    {equation.isVisible === false ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                  
                  <input 
                    type="color" 
                    value={equation.color || getNextColor(index)} 
                    onChange={(e) => updateEquation(equation.id, { color: e.target.value })}
                    className="w-5 h-5 rounded border"
                    title="Change equation color"
                  />
                  
                  <span 
                    className={`font-mono ${equation.isVisible === false ? 'text-muted-foreground line-through' : ''}`}
                    style={{ maxWidth: "calc(100% - 10rem)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                  >
                    {equation.latex}
                  </span>
                  
                  <div className="ml-auto flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditingId(equation.id)}
                      className="size-7"
                      title="Edit equation"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteEquation(equation.id)}
                      className="size-7 text-destructive"
                      title="Delete equation"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default EquationList;