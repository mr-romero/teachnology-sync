import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Trash, MoveVertical, Check, X, Cog } from 'lucide-react';
import { 
  LessonBlock, 
  TextBlock, 
  ImageBlock, 
  QuestionBlock, 
  GraphBlock,
  AIChatBlock,
  FeedbackQuestionBlock,
  QuestionType 
} from '@/types/lesson';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import ImageUploader from './ImageUploader';
import AIChatBlockEditor from './AIChatBlockEditor';
import FeedbackQuestionBlockEditor from './FeedbackQuestionBlockEditor';
import FeedbackBlockSplitter from './FeedbackBlockSplitter';
import { deleteImage } from '@/services/imageService';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { debounce } from 'lodash';
import { v4 as uuidv4 } from 'uuid';
import EquationList from './EquationList';
import GraphRenderer from './GraphRenderer';
import MathDisplay from './MathDisplay';

interface LessonBlockEditorProps {
  block: LessonBlock;
  onUpdate: (updatedBlock: LessonBlock) => void;
  onDelete: () => void;
}

const LessonBlockEditor: React.FC<LessonBlockEditorProps> = ({ 
  block, 
  onUpdate, 
  onDelete 
}) => {
  // Set all settings to collapsed by default
  const [showStyleSettings, setShowStyleSettings] = useState(false);
  const [showQuestionSettings, setShowQuestionSettings] = useState(false);
  const [showFeedbackSettings, setShowFeedbackSettings] = useState(false);
  const [showCalculatorSettings, setShowCalculatorSettings] = useState(false);
  const [showAISettings, setShowAISettings] = useState(false);
  const [showLayoutSettings, setShowLayoutSettings] = useState(false);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

  const [expanded, setExpanded] = useState(true);
  
  // Handler for splitting feedback blocks
  const handleSplitFeedbackBlock = (newBlocks: LessonBlock[]) => {
    // First delete the original block
    onDelete();
    
    // Then notify parent to add the new blocks
    if (window.addSplitBlocks) {
      window.addSplitBlocks(newBlocks);
    }
  };
  
  const renderBlockEditor = () => {
    switch (block.type) {
      case 'text':
        return renderTextBlockEditor(block as TextBlock);
      case 'image':
        return renderImageBlockEditor(block as ImageBlock);
      case 'question':
        return renderQuestionBlockEditor(block as QuestionBlock);
      case 'graph':
        return renderGraphBlockEditor(block as GraphBlock);
      case 'ai-chat':
        return (
          <AIChatBlockEditor 
            block={block as AIChatBlock} 
            onUpdate={onUpdate} 
            onDelete={onDelete}
          />
        );
      case 'feedback-question':
        return (
          <div className="space-y-4">
            <FeedbackQuestionBlockEditor
              block={block as FeedbackQuestionBlock}
              onUpdate={onUpdate}
              onDelete={onDelete}
              previewMode
            />
            <div className="border-t pt-4 mt-4">
              <FeedbackBlockSplitter
                block={block as FeedbackQuestionBlock}
                onSplit={handleSplitFeedbackBlock}
              />
            </div>
          </div>
        );
      default:
        return <p>Unknown block type</p>;
    }
  };
  
  const renderTextBlockEditor = (textBlock: TextBlock) => (
    <div>
      <Textarea
        value={textBlock.content}
        onChange={(e) => onUpdate({ ...textBlock, content: e.target.value })}
        className="min-h-[100px] mt-2"
        placeholder="Enter text content here"
      />
    </div>
  );
  
  const renderImageBlockEditor = (imageBlock: ImageBlock) => {
    const handleImageUploaded = (url: string, path: string) => {
      // If there's an existing image in storage and we're replacing it, clean up the old one
      if (imageBlock.storagePath && path && imageBlock.storagePath !== path) {
        // We don't need to await this, it can happen in the background
        deleteImage(imageBlock.storagePath).catch(err => 
          console.error('Error deleting old image:', err)
        );
      }
      
      onUpdate({ 
        ...imageBlock, 
        url, 
        storagePath: path 
      });
    };
    
    const handleAltTextChange = (alt: string) => {
      onUpdate({ ...imageBlock, alt });
    };
    
    return (
      <div className="space-y-4">
        <ImageUploader 
          existingUrl={imageBlock.url}
          existingAlt={imageBlock.alt}
          onImageUploaded={handleImageUploaded}
          onUpdateAlt={handleAltTextChange}
        />
        
        {/* Show the URL input if you still want to allow direct URL entry */}
        <div className="mt-4 border-t pt-4">
          <Label className="flex items-center gap-2">
            External URL
            <span className="text-xs text-muted-foreground font-normal">(optional)</span>
          </Label>
          <Input
            value={imageBlock.url}
            onChange={(e) => onUpdate({ ...imageBlock, url: e.target.value })}
            placeholder="Enter image URL"
            className="mt-1"
          />
          <p className="text-xs text-muted-foreground mt-1">
            You can use an external image URL instead of uploading an image.
          </p>
        </div>
      </div>
    );
  };
  
  const renderQuestionBlockEditor = (questionBlock: QuestionBlock) => {
    const updateQuestionType = (type: QuestionType) => {
      const updatedBlock = { 
        ...questionBlock, 
        questionType: type 
      };
      
      // Reset properties based on type
      if (type === 'multiple-choice') {
        updatedBlock.options = questionBlock.options || ['Option 1', 'Option 2', 'Option 3'];
      } else if (type === 'true-false') {
        updatedBlock.options = ['True', 'False'];
      } else {
        delete updatedBlock.options;
      }
      
      onUpdate(updatedBlock);
    };
    
    const updateOptions = (options: string[]) => {
      onUpdate({ ...questionBlock, options });
    };
    
    const addOption = () => {
      if (questionBlock.options) {
        updateOptions([...questionBlock.options, `Option ${questionBlock.options.length + 1}`]);
      }
    };
    
    const updateOption = (index: number, value: string) => {
      if (questionBlock.options) {
        const updatedOptions = [...questionBlock.options];
        updatedOptions[index] = value;
        updateOptions(updatedOptions);
      }
    };
    
    const removeOption = (index: number) => {
      if (questionBlock.options && questionBlock.options.length > 2) {
        const updatedOptions = questionBlock.options.filter((_, i) => i !== index);
        updateOptions(updatedOptions);
      }
    };
    
    // Check if a string contains LaTeX
    const containsLatex = (text: string): boolean => {
      return text.includes('\\') || text.includes('$');
    };
    
    // Function to render an option with or without LaTeX
    const renderOptionText = (option: string, index: number) => {
      // Check if the option contains LaTeX markers
      if (containsLatex(option)) {
        return (
          <div className="flex flex-col gap-1">
            <Input
              value={option}
              onChange={(e) => updateOption(index, e.target.value)}
              className="flex-grow"
            />
            <div className="px-2 py-1 border rounded bg-gray-50 min-h-8">
              <MathDisplay latex={option} display={false} />
            </div>
          </div>
        );
      } else {
        return (
          <Input
            value={option}
            onChange={(e) => updateOption(index, e.target.value)}
            className="flex-grow"
          />
        );
      }
    };
    
    return (
      <div className="space-y-4">
        <div>
          <Label>Question Type</Label>
          <Select
            value={questionBlock.questionType}
            onValueChange={(value) => updateQuestionType(value as QuestionType)}
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Select question type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="multiple-choice">Multiple Choice</SelectItem>
              <SelectItem value="free-response">Free Response</SelectItem>
              <SelectItem value="true-false">True/False</SelectContent>
          </Select>
        </div>
        
        <div>
          <Label>Question</Label>
          <Textarea
            value={questionBlock.question}
            onChange={(e) => onUpdate({ ...questionBlock, question: e.target.value })}
            placeholder="Enter your question here"
            className="min-h-[60px] mt-1"
          />
        </div>
        
        {questionBlock.questionType === 'multiple-choice' && (
          <div className="space-y-3">
            <Label>Options</Label>
            {questionBlock.options?.map((option, index) => (
              <div key={index} className="flex items-center space-x-2">
                <div className="flex-grow flex items-center space-x-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 rounded-full"
                    onClick={() => onUpdate({ 
                      ...questionBlock, 
                      correctAnswer: option 
                    })}
                  >
                    {questionBlock.correctAnswer === option ? (
                      <Check className="h-3 w-3 text-primary" />
                    ) : (
                      <div className="h-3 w-3 rounded-full border-2" />
                    )}
                  </Button>
                  {renderOptionText(option, index)}
                </div>
                {questionBlock.options && questionBlock.options.length > 2 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeOption(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addOption}
              className="mt-2"
            >
              Add Option
            </Button>
            
            <div className="pt-2 mt-2 border-t">
              <p className="text-xs text-muted-foreground mb-2">
                <strong>Tip:</strong> You can use LaTeX notation for math formulas. 
                For example, use <code>$x^2$</code> to display x². The formula will render automatically as you type.
              </p>
            </div>
          </div>
        )}
        
        {questionBlock.questionType === 'true-false' && (
          <div className="space-y-3">
            <Label>Correct Answer</Label>
            <div className="flex space-x-4">
              <div className="flex items-center space-x-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 rounded-full"
                  onClick={() => onUpdate({ ...questionBlock, correctAnswer: true })}
                >
                  {questionBlock.correctAnswer === true ? (
                    <Check className="h-3 w-3 text-primary" />
                  ) : (
                    <div className="h-3 w-3 rounded-full border-2" />
                  )}
                </Button>
                <span>True</span>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 rounded-full"
                  onClick={() => onUpdate({ ...questionBlock, correctAnswer: false })}
                >
                  {questionBlock.correctAnswer === false ? (
                    <Check className="h-3 w-3 text-primary" />
                  ) : (
                    <div className="h-3 w-3 rounded-full border-2" />
                  )}
                </Button>
                <span>False</span>
              </div>
            </div>
          </div>
        )}
        
        {questionBlock.questionType === 'free-response' && (
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Label>Use AI for answer validation</Label>
              <Switch />
            </div>
            <div>
              <Label>Sample Answer (for reference)</Label>
              <Textarea
                value={questionBlock.correctAnswer as string || ''}
                onChange={(e) => onUpdate({ ...questionBlock, correctAnswer: e.target.value })}
                placeholder="Enter a sample answer"
                className="min-h-[60px] mt-1"
              />
            </div>
          </div>
        )}
      </div>
    );
  };
  
  const renderGraphBlockEditor = (graphBlock: GraphBlock) => {
    // Set default values for new settings if they're not already defined
    const [localGraphBlock, setLocalGraphBlock] = useState(() => {
      // Create a deep copy to avoid mutating props directly
      const block = JSON.parse(JSON.stringify(graphBlock));
      
      // Set defaults for missing properties
      if (block.settings.showGrid === undefined) block.settings.showGrid = true;
      if (block.settings.showAxes === undefined) block.settings.showAxes = true;
      if (block.settings.polarMode === undefined) block.settings.polarMode = false;
      if (block.settings.allowPanning === undefined) block.settings.allowPanning = true;
      if (block.settings.allowZooming === undefined) block.settings.allowZooming = true;
      if (block.settings.showXAxis === undefined) block.settings.showXAxis = true;
      if (block.settings.showYAxis === undefined) block.settings.showYAxis = true;
      if (block.settings.showCalculator === undefined) block.settings.showCalculator = true;
    
      // Initialize equations array if it doesn't exist (for backward compatibility)
      if (!block.equations) {
        block.equations = [];
        
        // If there's a legacy equation, convert it to the new format
        if (block.equation) {
          block.equations.push({
            id: uuidv4(),
            latex: block.equation,
            isVisible: true,
            color: '#c74440' // Default color
          });
        }
      }
      
      return block;
    });
  
    // Debounced update function to reduce update frequency
    const debouncedUpdate = useCallback(
      debounce((updatedBlock: GraphBlock) => {
        onUpdate(updatedBlock);
      }, 500),
      [onUpdate]
    );
  
    // Update local state immediately but debounce the parent update
    const updateBlock = useCallback((updates: Partial<GraphBlock>) => {
      setLocalGraphBlock(prev => {
        const updated = { ...prev, ...updates };
        debouncedUpdate(updated);
        return updated;
      });
    }, [debouncedUpdate]);
    
    // Setting updater that only updates a specific setting property
    const updateSetting = useCallback((key: string, value: any) => {
      setLocalGraphBlock(prev => {
        const updated = { 
          ...prev, 
          settings: { ...prev.settings, [key]: value } 
        };
        debouncedUpdate(updated);
        return updated;
      });
    }, [debouncedUpdate]);
  
    // Handle equations change with debouncing
    const handleEquationsChange = useCallback((newEquations: Array<{
      id: string;
      latex: string;
      color?: string;
      label?: string;
      isVisible?: boolean;
    }>) => {
      setLocalGraphBlock(prev => {
        const updated = {
          ...prev,
          equations: newEquations,
          // Update legacy equation field for backward compatibility
          equation: newEquations.length > 0 ? newEquations[0].latex : ''
        };
        debouncedUpdate(updated);
        return updated;
      });
    }, [debouncedUpdate]);
  
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
    // Use local state for the editor and renderer to prevent flickering
    return (
      <div className="space-y-4">
        <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="flex items-center gap-2 mb-2">
              <Cog className="h-4 w-4" />
              <span>Graph Settings</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Graph Settings</DialogTitle>
            </DialogHeader>
            
            <Tabs defaultValue="bounds" className="w-full mt-4">
              <TabsList className="grid grid-cols-4 w-full">
                <TabsTrigger value="bounds">Bounds</TabsTrigger>
                <TabsTrigger value="grid">Grid</TabsTrigger>
                <TabsTrigger value="interaction">Interaction</TabsTrigger>
                <TabsTrigger value="appearance">Appearance</TabsTrigger>
              </TabsList>
              
              {/* Bounds Tab */}
              <TabsContent value="bounds" className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>X Min</Label>
                    <Input
                      type="number"
                      value={localGraphBlock.settings.xMin}
                      onChange={(e) => updateSetting('xMin', Number(e.target.value))}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>X Max</Label>
                    <Input
                      type="number"
                      value={localGraphBlock.settings.xMax}
                      onChange={(e) => updateSetting('xMax', Number(e.target.value))}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Y Min</Label>
                    <Input
                      type="number"
                      value={localGraphBlock.settings.yMin}
                      onChange={(e) => updateSetting('yMin', Number(e.target.value))}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Y Max</Label>
                    <Input
                      type="number"
                      value={localGraphBlock.settings.yMax}
                      onChange={(e) => updateSetting('yMax', Number(e.target.value))}
                      className="mt-1"
                    />
                  </div>
                </div>
              </TabsContent>
              
              {/* Grid Tab */}
              <TabsContent value="grid" className="space-y-4 py-4">
                <div className="grid gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center justify-between space-x-2 border p-3 rounded-md">
                      <Label htmlFor="showGrid">Show Grid</Label>
                      <Switch 
                        id="showGrid" 
                        checked={localGraphBlock.settings.showGrid} 
                        onCheckedChange={(checked) => updateSetting('showGrid', checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between space-x-2 border p-3 rounded-md">
                      <Label htmlFor="showAxes">Show Axes Numbers</Label>
                      <Switch 
                        id="showAxes" 
                        checked={localGraphBlock.settings.showAxes} 
                        onCheckedChange={(checked) => updateSetting('showAxes', checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between space-x-2 border p-3 rounded-md">
                      <Label htmlFor="showXAxis">Show X Axis</Label>
                      <Switch 
                        id="showXAxis" 
                        checked={localGraphBlock.settings.showXAxis} 
                        onCheckedChange={(checked) => updateSetting('showXAxis', checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between space-x-2 border p-3 rounded-md">
                      <Label htmlFor="showYAxis">Show Y Axis</Label>
                      <Switch 
                        id="showYAxis" 
                        checked={localGraphBlock.settings.showYAxis} 
                        onCheckedChange={(checked) => updateSetting('showYAxis', checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between space-x-2 border p-3 rounded-md">
                      <Label htmlFor="polarMode">Polar Mode</Label>
                      <Switch 
                        id="polarMode" 
                        checked={localGraphBlock.settings.polarMode} 
                        onCheckedChange={(checked) => updateSetting('polarMode', checked)}
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              {/* Interaction Tab */}
              <TabsContent value="interaction" className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between space-x-2 border p-3 rounded-md">
                    <Label htmlFor="allowPanning">Allow Panning</Label>
                    <Switch 
                      id="allowPanning" 
                      checked={localGraphBlock.settings.allowPanning} 
                      onCheckedChange={(checked) => updateSetting('allowPanning', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between space-x-2 border p-3 rounded-md">
                    <Label htmlFor="allowZooming">Allow Zooming</Label>
                    <Switch 
                      id="allowZooming" 
                      checked={localGraphBlock.settings.allowZooming} 
                      onCheckedChange={(checked) => updateSetting('allowZooming', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between space-x-2 border p-3 rounded-md col-span-2">
                    <div>
                      <Label htmlFor="showCalculator">Show Calculator Button</Label>
                      <p className="text-xs text-muted-foreground">Allow students to open a Desmos calculator</p>
                    </div>
                    <Switch 
                      id="showCalculator" 
                      checked={localGraphBlock.settings.showCalculator !== false} 
                      onCheckedChange={(checked) => updateSetting('showCalculator', checked)}
                    />
                  </div>
                </div>
              </TabsContent>
              
              {/* Appearance Tab */}
              <TabsContent value="appearance" className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="xAxisLabel">X Axis Label</Label>
                    <Input
                      id="xAxisLabel"
                      value={localGraphBlock.settings.xAxisLabel || ''}
                      onChange={(e) => updateSetting('xAxisLabel', e.target.value)}
                      placeholder="e.g., Time (s)"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="yAxisLabel">Y Axis Label</Label>
                    <Input
                      id="yAxisLabel"
                      value={localGraphBlock.settings.yAxisLabel || ''}
                      onChange={(e) => updateSetting('yAxisLabel', e.target.value)}
                      placeholder="e.g., Distance (m)"
                    />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="backgroundColor">Background Color</Label>
                    <div className="flex gap-2">
                      <Input
                        id="backgroundColor"
                        value={localGraphBlock.settings.backgroundColor || '#ffffff'}
                        onChange={(e) => updateSetting('backgroundColor', e.target.value)}
                        placeholder="#ffffff"
                        className="flex-1"
                      />
                      <input 
                        type="color" 
                        value={localGraphBlock.settings.backgroundColor || '#ffffff'} 
                        onChange={(e) => updateSetting('backgroundColor', e.target.value)}
                        className="w-10 h-10 p-1 border rounded"
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
  
            <div className="mt-2 flex justify-end">
              <Button 
                variant="outline" 
                onClick={() => setIsSettingsOpen(false)}
              >
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
  
        {/* Equations editor */}
        <div>
          <EquationList 
            equations={localGraphBlock.equations} 
            onEquationsChange={handleEquationsChange} 
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>X Min</Label>
            <Input
              type="number"
              value={localGraphBlock.settings.xMin}
              onChange={(e) => updateSetting('xMin', Number(e.target.value))}
              className="mt-1"
            />
          </div>
          <div>
            <Label>X Max</Label>
            <Input
              type="number"
              value={localGraphBlock.settings.xMax}
              onChange={(e) => updateSetting('xMax', Number(e.target.value))}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Y Min</Label>
            <Input
              type="number"
              value={localGraphBlock.settings.yMin}
              onChange={(e) => updateSetting('yMin', Number(e.target.value))}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Y Max</Label>
            <Input
              type="number"
              value={localGraphBlock.settings.yMax}
              onChange={(e) => updateSetting('yMax', Number(e.target.value))}
              className="mt-1"
            />
          </div>
        </div>
        
        <div className="mt-4 border rounded-md p-1 bg-gray-50 h-60">
          <GraphRenderer block={localGraphBlock} isEditable={true} />
        </div>
      </div>
    );
  };

  // If we're rendering an AI chat block or feedback question block, return the dedicated editor
  if (block.type === 'ai-chat') {
    return (
      <AIChatBlockEditor 
        block={block as AIChatBlock} 
        onUpdate={onUpdate} 
        onDelete={onDelete}
      />
    );
  } else if (block.type === 'feedback-question') {
    return (
      <FeedbackQuestionBlockEditor
        block={block as FeedbackQuestionBlock}
        onUpdate={onUpdate}
        onDelete={onDelete}
      />
    );
  }

  return (
    <Card className="border shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <MoveVertical className="h-4 w-4 text-muted-foreground cursor-move opacity-50" />
            <span className="font-medium capitalize">{block.type} Block</span>
          </div>
          <div className="flex items-center space-x-2">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setExpanded(!expanded)}
              className="h-8 w-8"
            >
              {expanded ? (
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3.13523 8.84197C3.3241 9.04343 3.64052 9.05363 3.84197 8.86477L7.5 5.43536L11.158 8.86477C11.3595 9.05363 11.6759 9.04343 11.8648 8.84197C12.0536 8.64051 12.0434 8.32409 11.842 8.13523L7.84197 4.38523C7.64964 4.20492 7.35036 4.20492 7.15803 4.38523L3.15803 8.13523C2.95657 8.32409 2.94637 8.64051 3.13523 8.84197Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
                </svg>
              ) : (
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3.13523 6.15803C3.3241 5.95657 3.64052 5.94637 3.84197 6.13523L7.5 9.56464L11.158 6.13523C11.3595 5.94637 11.6759 5.95657 11.8648 6.15803C12.0536 6.35949 12.0434 6.67591 11.842 6.86477L7.84197 10.6148C7.64964 10.7951 7.35036 10.7951 7.15803 10.6148L3.15803 6.86477C2.95657 6.67591 2.94637 6.35949 3.13523 6.15803Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
                </svg>
              )}
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onDelete}
              className="h-8 w-8 text-destructive"
            >
              <Trash className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {expanded && (
          <div className="mt-3 pt-3 border-t">{renderBlockEditor()}</div>
        )}
      </CardContent>
    </Card>
  );
};

export default LessonBlockEditor;
