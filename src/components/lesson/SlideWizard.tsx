import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import ImageUploader from './ImageUploader';
import { ImageAnalysisResult, analyzeQuestionImage } from '@/services/aiService';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

// Add type for ImageUploader props
interface ImageUploaderProps {
  onImageUploaded: (url: string, path: string) => void;
  existingUrl?: string;
  existingAlt?: string;
  onUpdateAlt: (alt: string) => void;
}

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
  model?: string; // Make model configurable
}

const SlideWizard: React.FC<SlideWizardProps> = ({ 
  onComplete, 
  onCancel,
  model = 'openai/gpt-4o-mini' // Default to gpt-4o-mini but allow override
}) => {
  const [imageUrl, setImageUrl] = useState('');
  const [imageAlt, setImageAlt] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleImageUploaded = async (url: string, path: string) => {
    setImageUrl(url);
    setImageAlt(''); // Reset alt text when new image uploaded
    setIsAnalyzing(true);
    setError(null);

    try {
      const result = await analyzeQuestionImage(url, model); // Pass model to analyzeQuestionImage
      
      // Validate the result
      if (!result.questionText) {
        throw new Error('Failed to extract question text from image');
      }
      
      onComplete({
        ...result,
        imageUrl: url,
        imageAlt: imageAlt || 'Math problem image' // Provide default alt text
      });
    } catch (error) {
      console.error('Error analyzing image:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setError(errorMessage);
      toast({
        title: "Error Analyzing Image",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
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

          {error && (
            <div className="text-sm text-red-500 bg-red-50 p-3 rounded-md">
              {error}
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

export default SlideWizard; // Add default export