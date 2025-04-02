import React from 'react';
import { SplitSquareVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FeedbackQuestionBlock } from '@/types/lesson';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface FeedbackBlockSplitterProps {
  block: FeedbackQuestionBlock;
  onSplit: (newBlocks: FeedbackQuestionBlock[]) => void;
}

const FeedbackBlockSplitter: React.FC<FeedbackBlockSplitterProps> = ({
  block,
  onSplit
}) => {
  const handleSplit = () => {
    const baseId = block.id.replace('-split', '');
    const groupId = `group-${Date.now()}`;
    
    // Create the split blocks
    const questionBlock: FeedbackQuestionBlock = {
      ...block,
      id: `${baseId}-question`,
      displayMode: 'question',
      isGrouped: true,
      groupId
    };
    
    const imageBlock: FeedbackQuestionBlock = {
      ...block,
      id: `${baseId}-image`,
      displayMode: 'image',
      isGrouped: true,
      groupId
    };
    
    const feedbackBlock: FeedbackQuestionBlock = {
      ...block,
      id: `${baseId}-feedback`,
      displayMode: 'feedback',
      isGrouped: true,
      groupId
    };
    
    onSplit([questionBlock, imageBlock, feedbackBlock]);
  };
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleSplit}
            className="h-8 w-8"
          >
            <SplitSquareVertical className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Split into separate components</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default FeedbackBlockSplitter;