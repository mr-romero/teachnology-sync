import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/components/ui/use-toast';
import { Upload, X, ImageIcon } from 'lucide-react';
import { uploadImage } from '@/services/imageService';
import { useAuth } from '@/context/AuthContext';

interface ImageUploaderProps {
  onImageUploaded: (url: string, path: string) => void;
  existingUrl?: string;
  existingAlt?: string;
  onUpdateAlt: (alt: string) => void;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({
  onImageUploaded,
  existingUrl,
  existingAlt = '',
  onUpdateAlt
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(existingUrl || null);
  const [altText, setAltText] = useState(existingAlt);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file (JPEG, PNG, GIF, etc.)",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Image file size must be less than 5MB",
        variant: "destructive"
      });
      return;
    }

    // Create a local preview
    const localPreviewUrl = URL.createObjectURL(file);
    setPreviewUrl(localPreviewUrl);

    // Simulate upload progress
    setIsUploading(true);
    setUploadProgress(0);
    
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        const newProgress = prev + 10;
        if (newProgress >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return newProgress;
      });
    }, 200);

    try {
      // Upload to Supabase
      const result = await uploadImage(file, user.id);
      
      if ('error' in result) {
        throw new Error(result.error);
      }

      // Complete the progress bar
      setUploadProgress(100);
      
      // Provide the URL and path back to the parent component
      onImageUploaded(result.url, result.path);
      
      // If there's no alt text yet, use the filename as a suggestion
      if (!altText) {
        const suggestedAlt = file.name.split('.')[0].replace(/[_-]/g, ' ');
        setAltText(suggestedAlt);
        onUpdateAlt(suggestedAlt);
      }

      toast({
        title: "Image uploaded successfully",
        description: "Your image has been uploaded and added to the lesson",
        variant: "default"
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "An error occurred during upload",
        variant: "destructive"
      });
      // If upload failed, keep the local preview
    } finally {
      setIsUploading(false);
      clearInterval(progressInterval);
      
      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleAltTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAltText(e.target.value);
    onUpdateAlt(e.target.value);
  };

  const clearImage = () => {
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    
    // Signal to parent that the image should be removed
    onImageUploaded('', '');
  };

  return (
    <div className="space-y-4">
      {previewUrl ? (
        <div className="relative">
          <div className="relative aspect-video border rounded-md overflow-hidden bg-muted/20">
            <img 
              src={previewUrl} 
              alt={altText} 
              className="w-full h-full object-contain" 
            />
            
            {isUploading && (
              <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white p-4">
                <p className="mb-2">Uploading image...</p>
                <Progress value={uploadProgress} className="w-full h-2" />
              </div>
            )}
          </div>
          
          <Button
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2 h-8 w-8 bg-white text-destructive hover:bg-red-100 rounded-full"
            onClick={clearImage}
            type="button"
            disabled={isUploading}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-muted rounded-md p-6 flex flex-col items-center justify-center gap-2 hover:bg-muted/5 cursor-pointer transition-colors aspect-video"
        >
          <ImageIcon className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground text-center">
            Drag & drop an image here, or click to browse
          </p>
          <Button 
            variant="secondary" 
            size="sm" 
            className="mt-2"
            type="button"
          >
            <Upload className="h-4 w-4 mr-2" />
            Choose Image
          </Button>
        </div>
      )}

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />

      <div>
        <Label htmlFor="alt-text">Alt Text</Label>
        <Input
          id="alt-text"
          value={altText}
          onChange={handleAltTextChange}
          placeholder="Describe the image for accessibility"
          className="mt-1"
        />
        <p className="text-xs text-muted-foreground mt-1">
          A good description helps students who use screen readers understand the image content.
        </p>
      </div>
    </div>
  );
};

export default ImageUploader;