import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Loader2, PlusCircle, RefreshCw } from 'lucide-react';
import { getActiveSessionForLesson } from '@/services/lessonService';

interface PresentationDialogProps {
  lessonId: string;
  isOpen: boolean;
  onClose: () => void;
  onCreateNewSession: () => void;
  onJoinExistingSession: (sessionId: string) => void;
}

const PresentationDialog: React.FC<PresentationDialogProps> = ({
  lessonId,
  isOpen,
  onClose,
  onCreateNewSession,
  onJoinExistingSession,
}) => {
  const [activeSession, setActiveSession] = useState<{ id: string; join_code: string; current_slide: number } | null>(null);
  const [loading, setLoading] = useState(true);

  const loadActiveSession = async () => {
    setLoading(true);
    try {
      const session = await getActiveSessionForLesson(lessonId);
      setActiveSession(session);
    } catch (error) {
      console.error('Error loading active session:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && lessonId) {
      loadActiveSession();
    }
  }, [isOpen, lessonId]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Present Lesson</DialogTitle>
          <DialogDescription>
            Choose how you want to present this lesson
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col space-y-4 py-4">
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Checking for active sessions...</span>
            </div>
          ) : (
            <>
              {activeSession ? (
                <div className="border rounded-lg p-4 bg-muted/30">
                  <h3 className="font-medium mb-2">Active Session Found</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    Join Code: <span className="font-mono font-bold">{activeSession.join_code}</span>
                  </p>
                  <Button 
                    onClick={() => onJoinExistingSession(activeSession.id)}
                    className="w-full mt-2"
                  >
                    Continue Existing Session
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No active sessions found for this lesson.</p>
              )}

              <div className="border rounded-lg p-4 mt-4">
                <h3 className="font-medium mb-2">Create New Session</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  Start a new presentation session with a new join code.
                  {activeSession && " This will end any existing active sessions."}
                </p>
                <Button 
                  onClick={onCreateNewSession} 
                  className="w-full mt-2"
                  variant={activeSession ? "outline" : "default"}
                >
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Create New Session
                </Button>
              </div>
            </>
          )}
        </div>
        <DialogFooter className="sm:justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={loadActiveSession}
            disabled={loading}
            className="flex items-center"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            onClick={onClose}
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PresentationDialog;