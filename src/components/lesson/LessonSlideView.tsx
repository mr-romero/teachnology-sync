
import React, { useState } from 'react';
import { LessonSlide, LessonBlock, QuestionBlock } from '@/types/lesson';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

interface LessonSlideViewProps {
  slide: LessonSlide;
  isStudentView?: boolean;
  studentId?: string;
  onResponseSubmit?: (blockId: string, response: string | boolean) => void;
}

const LessonSlideView: React.FC<LessonSlideViewProps> = ({ 
  slide, 
  isStudentView = false,
  studentId,
  onResponseSubmit
}) => {
  const [responses, setResponses] = useState<Record<string, string | boolean>>({});
  
  const handleResponseChange = (blockId: string, value: string | boolean) => {
    setResponses(prev => ({ ...prev, [blockId]: value }));
  };
  
  const handleSubmitResponse = (blockId: string) => {
    if (onResponseSubmit && blockId in responses) {
      onResponseSubmit(blockId, responses[blockId]);
    }
  };
  
  const renderBlock = (block: LessonBlock) => {
    switch (block.type) {
      case 'text':
        return (
          <div className="prose max-w-none">
            {block.content}
          </div>
        );
      case 'image':
        return (
          <div className="my-4 flex justify-center">
            <img 
              src={block.url} 
              alt={block.alt} 
              className="max-h-96 rounded-md"
            />
          </div>
        );
      case 'question':
        return renderQuestionBlock(block as QuestionBlock);
      case 'graph':
        return (
          <div className="my-4 border rounded-md p-4 bg-gray-50 h-60 desmos-container">
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground text-center">
                {block.equation}<br />
                <span className="text-sm">(Will use Desmos API in full implementation)</span>
              </p>
            </div>
          </div>
        );
      default:
        return <p>Unknown block type</p>;
    }
  };
  
  const renderQuestionBlock = (block: QuestionBlock) => {
    const studentCanRespond = isStudentView && studentId;
    
    if (block.questionType === 'multiple-choice') {
      return (
        <div className="my-4 p-4 bg-primary/5 rounded-md">
          <p className="font-medium mb-3">{block.question}</p>
          
          {studentCanRespond ? (
            <div className="space-y-2">
              <RadioGroup 
                value={responses[block.id] as string} 
                onValueChange={(value) => handleResponseChange(block.id, value)}
              >
                {block.options?.map((option, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <RadioGroupItem value={option} id={`${block.id}-option-${index}`} />
                    <Label htmlFor={`${block.id}-option-${index}`}>{option}</Label>
                  </div>
                ))}
              </RadioGroup>
              
              <Button 
                className="mt-3" 
                size="sm" 
                onClick={() => handleSubmitResponse(block.id)}
                disabled={!responses[block.id]}
              >
                Submit
              </Button>
            </div>
          ) : (
            <ul className="space-y-1 list-disc list-inside">
              {block.options?.map((option, index) => (
                <li 
                  key={index}
                  className={option === block.correctAnswer ? "text-green-600 font-medium" : ""}
                >
                  {option}
                  {option === block.correctAnswer && !isStudentView && " (correct)"}
                </li>
              ))}
            </ul>
          )}
        </div>
      );
    }
    
    if (block.questionType === 'true-false') {
      return (
        <div className="my-4 p-4 bg-primary/5 rounded-md">
          <p className="font-medium mb-3">{block.question}</p>
          
          {studentCanRespond ? (
            <div className="space-y-2">
              <RadioGroup 
                value={responses[block.id] === true ? "true" : responses[block.id] === false ? "false" : ""} 
                onValueChange={(value) => handleResponseChange(block.id, value === "true")}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="true" id={`${block.id}-true`} />
                  <Label htmlFor={`${block.id}-true`}>True</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="false" id={`${block.id}-false`} />
                  <Label htmlFor={`${block.id}-false`}>False</Label>
                </div>
              </RadioGroup>
              
              <Button 
                className="mt-3" 
                size="sm" 
                onClick={() => handleSubmitResponse(block.id)}
                disabled={!(block.id in responses)}
              >
                Submit
              </Button>
            </div>
          ) : (
            <div className="flex space-x-8">
              <div className={`flex items-center space-x-2 ${block.correctAnswer === true && !isStudentView ? "text-green-600 font-medium" : ""}`}>
                <div className="h-4 w-4 rounded-full border-2 flex items-center justify-center">
                  {block.correctAnswer === true && !isStudentView && (
                    <div className="h-2 w-2 rounded-full bg-green-600" />
                  )}
                </div>
                <span>True</span>
              </div>
              <div className={`flex items-center space-x-2 ${block.correctAnswer === false && !isStudentView ? "text-green-600 font-medium" : ""}`}>
                <div className="h-4 w-4 rounded-full border-2 flex items-center justify-center">
                  {block.correctAnswer === false && !isStudentView && (
                    <div className="h-2 w-2 rounded-full bg-green-600" />
                  )}
                </div>
                <span>False</span>
              </div>
            </div>
          )}
        </div>
      );
    }
    
    if (block.questionType === 'free-response') {
      return (
        <div className="my-4 p-4 bg-primary/5 rounded-md">
          <p className="font-medium mb-3">{block.question}</p>
          
          {studentCanRespond ? (
            <div className="space-y-3">
              <Textarea
                placeholder="Enter your answer here..."
                value={responses[block.id] as string || ''}
                onChange={(e) => handleResponseChange(block.id, e.target.value)}
              />
              <Button 
                size="sm" 
                onClick={() => handleSubmitResponse(block.id)}
                disabled={!responses[block.id]}
              >
                Submit
              </Button>
            </div>
          ) : (
            <div className="border border-dashed border-muted-foreground/30 rounded-md p-3 bg-muted/30">
              <p className="text-sm text-muted-foreground">Student response area</p>
              {!isStudentView && block.correctAnswer && (
                <div className="mt-2">
                  <p className="text-sm font-medium">Sample answer:</p>
                  <p className="text-sm">{block.correctAnswer as string}</p>
                </div>
              )}
            </div>
          )}
        </div>
      );
    }
    
    return <p>Unknown question type</p>;
  };

  return (
    <div className="space-y-4">
      {slide.blocks.map((block) => (
        <div key={block.id} className="mb-4">
          {renderBlock(block)}
        </div>
      ))}
    </div>
  );
};

export default LessonSlideView;
