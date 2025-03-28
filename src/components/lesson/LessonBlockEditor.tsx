
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Trash, MoveVertical, Check, X } from 'lucide-react';
import { 
  LessonBlock, 
  TextBlock, 
  ImageBlock, 
  QuestionBlock, 
  GraphBlock, 
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
  const [expanded, setExpanded] = useState(true);
  
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
  
  const renderImageBlockEditor = (imageBlock: ImageBlock) => (
    <div className="space-y-4">
      <div>
        <Label>Image URL</Label>
        <Input
          value={imageBlock.url}
          onChange={(e) => onUpdate({ ...imageBlock, url: e.target.value })}
          placeholder="Enter image URL"
          className="mt-1"
        />
      </div>
      <div>
        <Label>Alt Text</Label>
        <Input
          value={imageBlock.alt}
          onChange={(e) => onUpdate({ ...imageBlock, alt: e.target.value })}
          placeholder="Enter alt text for accessibility"
          className="mt-1"
        />
      </div>
      <div className="mt-4">
        <img 
          src={imageBlock.url} 
          alt={imageBlock.alt} 
          className="max-h-60 rounded-md mx-auto border" 
        />
      </div>
    </div>
  );
  
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
              <SelectItem value="true-false">True/False</SelectItem>
            </SelectContent>
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
                  <Input
                    value={option}
                    onChange={(e) => updateOption(index, e.target.value)}
                    className="flex-grow"
                  />
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
  
  const renderGraphBlockEditor = (graphBlock: GraphBlock) => (
    <div className="space-y-4">
      <div>
        <Label>Equation</Label>
        <Input
          value={graphBlock.equation}
          onChange={(e) => onUpdate({ ...graphBlock, equation: e.target.value })}
          placeholder="e.g., y = x^2 + 2x - 3"
          className="mt-1 font-mono"
        />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>X Min</Label>
          <Input
            type="number"
            value={graphBlock.settings.xMin}
            onChange={(e) => onUpdate({ 
              ...graphBlock, 
              settings: { 
                ...graphBlock.settings, 
                xMin: Number(e.target.value) 
              } 
            })}
            className="mt-1"
          />
        </div>
        <div>
          <Label>X Max</Label>
          <Input
            type="number"
            value={graphBlock.settings.xMax}
            onChange={(e) => onUpdate({ 
              ...graphBlock, 
              settings: { 
                ...graphBlock.settings, 
                xMax: Number(e.target.value) 
              } 
            })}
            className="mt-1"
          />
        </div>
        <div>
          <Label>Y Min</Label>
          <Input
            type="number"
            value={graphBlock.settings.yMin}
            onChange={(e) => onUpdate({ 
              ...graphBlock, 
              settings: { 
                ...graphBlock.settings, 
                yMin: Number(e.target.value) 
              } 
            })}
            className="mt-1"
          />
        </div>
        <div>
          <Label>Y Max</Label>
          <Input
            type="number"
            value={graphBlock.settings.yMax}
            onChange={(e) => onUpdate({ 
              ...graphBlock, 
              settings: { 
                ...graphBlock.settings, 
                yMax: Number(e.target.value) 
              } 
            })}
            className="mt-1"
          />
        </div>
      </div>
      
      <div className="mt-4 border rounded-md p-4 bg-gray-50 h-60 flex items-center justify-center">
        <p className="text-muted-foreground text-center">
          Graph preview<br />
          <span className="text-sm">(Will use Desmos API in full implementation)</span>
        </p>
      </div>
    </div>
  );

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
