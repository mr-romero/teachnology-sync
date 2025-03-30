import React, { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ZoomIn, X } from 'lucide-react';

interface ImageViewerProps {
  src: string;
  alt: string;
  className?: string;
}

const ImageViewer: React.FC<ImageViewerProps> = ({ src, alt, className }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleClose = () => {
    setIsOpen(false);
  };

  if (!src) {
    return null; // Return nothing if no image URL
  }

  return (
    <>
      <div className="relative group">
        <img 
          src={src} 
          alt={alt} 
          className={`${className || 'max-w-full'} cursor-pointer transition-all duration-150 group-hover:opacity-95`}
          onClick={() => setIsOpen(true)}
        />
        <Button
          variant="default"
          size="icon"
          className="absolute right-2 top-2 h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
          onClick={() => setIsOpen(true)}
        >
          <ZoomIn className="h-4 w-4 text-white" />
        </Button>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-screen-lg w-[95vw] p-1 max-h-[95vh] overflow-hidden">
          <div className="relative w-full h-full p-0">
            <div className="absolute top-2 right-2 z-10">
              <Button
                variant="destructive"
                size="icon"
                className="h-8 w-8 rounded-full shadow-md"
                onClick={handleClose}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="w-full h-full flex items-center justify-center bg-black/5 rounded-lg p-2 overflow-auto">
              <img 
                src={src} 
                alt={alt} 
                className="max-w-full max-h-[calc(95vh-2rem)] object-contain cursor-pointer"
                onClick={handleClose}
                title="Click to close"
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ImageViewer;