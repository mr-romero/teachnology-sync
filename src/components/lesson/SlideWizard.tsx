import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Alert } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import ImageUploader from './ImageUploader';
import { ImageAnalysisResult, analyzeQuestionImage, fetchAvailableModels } from '@/services/aiService';
import { Loader2, RefreshCw } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

// Add type for ImageUploader props
interface ImageUploaderProps {
  onImageUploaded: (url: string, path: string) => void;
  onUpdateAlt: (alt: string) => void;
  defaultUrl?: string;
  defaultAlt?: string;
  allowedTypes?: string[];
  maxSizeInMB?: number;
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

interface ModelOption {
  id: string;
  name: string;
  context_length?: number;
  pricing?: any;
}

const SlideWizard: React.FC<SlideWizardProps> = ({ 
  onComplete, 
  onCancel,
  model: initialModel = 'mistralai/mistral-small-3.1-24b-instruct:free' // Default to free Mistral model
}) => {
  const [imageUrl, setImageUrl] = useState('');
  const [imageAlt, setImageAlt] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  
  // Model selection state
  const [model, setModel] = useState<string>('mistralai/mistral-small-3.1-24b-instruct:free');
  const [modelSearch, setModelSearch] = useState('');
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [modelsFetched, setModelsFetched] = useState(false);
  const [availableModels, setAvailableModels] = useState<ModelOption[]>([
    {
      id: 'mistralai/mistral-small-3.1-24b-instruct:free',
      name: 'Mistral Small (Free)',
      context_length: 32000
    }
  ]);

  // Load available models when component mounts
  useEffect(() => {
    loadAvailableModels();
  }, []);

  const loadAvailableModels = async () => {
    setIsLoadingModels(true);
    try {
      const models = await fetchAvailableModels();
      if (models && models.length > 0) {
        setAvailableModels(models);
        setModelsFetched(true);
      }
    } catch (error) {
      console.error('Error loading models:', error);
      toast({
        title: "Error Loading Models",
        description: "Could not fetch available models. Please check your API key.",
        variant: "destructive"
      });
    } finally {
      setIsLoadingModels(false);
    }
  };

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

          <div className="space-y-4">
            <div>
              <Label>AI Model</Label>
              {availableModels.length > 0 ? (
                <div className="space-y-2">
                  <Input
                    placeholder="Search models..."
                    value={modelSearch}
                    onChange={(e) => setModelSearch(e.target.value)}
                    className="mb-2"
                  />
                  <Select value={model} onValueChange={setModel}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a model" />
                    </SelectTrigger>
                    <SelectContent className="max-h-80">
                      {availableModels
                        .filter(model => 
                          model.name.toLowerCase().includes(modelSearch.toLowerCase()) ||
                          model.id.toLowerCase().includes(modelSearch.toLowerCase())
                        )
                        .map((model) => (
                          <SelectItem key={model.id} value={model.id}>
                            <div className="flex items-center gap-2">
                              <span>{model.name}</span>
                              {model.context_length && (
                                <span className="text-xs text-muted-foreground">
                                  ({Math.round(model.context_length / 1000)}k ctx)
                                </span>
                              )}
                            </div>
                          </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <Button 
                  variant="outline" 
                  className="w-full mt-2" 
                  onClick={loadAvailableModels}
                  disabled={isLoadingModels}
                >
                  {isLoadingModels ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Loading models...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Load Available Models
                    </>
                  )}
                </Button>
              )}
            </div>

            <ImageUploader
              onImageUploaded={handleImageUploaded}
              existingUrl={imageUrl}
              existingAlt={imageAlt}
              onUpdateAlt={(alt) => setImageAlt(alt)}
            />
          </div>

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
