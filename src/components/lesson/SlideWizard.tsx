import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import ImageUploader from './ImageUploader';
import { ImageAnalysisResult, analyzeQuestionImage } from '@/services/aiService';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface SlideWizardProps {
  onComplete: (result: {
    questionText: string;
    options?: string[];
    correctAnswer?: string;
    optionStyle?: 'A-D' | 'F-J' | 'text';
    imageUrl: string;
    imageAlt: string;
  }) => void;
  onCancel: () => void;
}

const SlideWizard: React.FC<SlideWizardProps> = ({ onComplete, onCancel }) => {
  const [imageUrl, setImageUrl] = useState('');
  const [imageAlt, setImageAlt] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { toast } = useToast();

  const handleImageUploaded = async (url: string, path: string, alt: string) => {
    setImageUrl(url);
    setImageAlt(alt);
    setIsAnalyzing(true);

    try {
      const result = await analyzeQuestionImage(url);
      
      onComplete({
        ...result,
        imageUrl: url,
        imageAlt: alt
      });
    } catch (error) {
      console.error('Error analyzing image:', error);
      toast({
        title: "Error Analyzing Image",
        description: "Failed to analyze the image. Please try again or create the question manually.",
        variant: "destructive"
      });
      setIsAnalyzing(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardContent className="p-6">
        <div className="space-y-6">
          <div className="text-center">
            <h3 className="text-lg font-medium">Create Question from Image</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Upload an image of a math problem and we'll automatically create a feedback question block.
            </p>
          </div>

          <ImageUploader
            onImageUploaded={handleImageUploaded}
            existingUrl={imageUrl}
            existingAlt={imageAlt}
            onUpdateAlt={(alt) => setImageAlt(alt)}
          />

          {isAnalyzing && (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Analyzing image...
            </div>
          )}

          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={onCancel}
              disabled={isAnalyzing}
            >
              Cancel
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};