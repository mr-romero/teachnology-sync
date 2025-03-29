
import React from 'react';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { 
  UserX, 
  Users, 
  FastForward, 
  Lock, 
  Unlock, 
  Pause, 
  Play,
  ArrowLeftCircle,
  Copy,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from '@/components/ui/sonner';

interface LessonControlsProps {
  joinCode: string;
  activeStudents: number;
  anonymousMode: boolean;
  syncEnabled: boolean;
  studentPacingEnabled: boolean;
  isPaused: boolean;
  onToggleAnonymous: () => void;
  onToggleSync: () => void;
  onTogglePacing: () => void;
  onTogglePause: () => void;
  onEndSession: () => void;
}

const LessonControls: React.FC<LessonControlsProps> = ({
  joinCode,
  activeStudents,
  anonymousMode,
  syncEnabled,
  studentPacingEnabled,
  isPaused,
  onToggleAnonymous,
  onToggleSync,
  onTogglePacing,
  onTogglePause,
  onEndSession
}) => {
  const copyJoinCode = () => {
    navigator.clipboard.writeText(joinCode);
    toast.success("Join code copied to clipboard");
  };

  return (
    <div className="bg-card p-4 rounded-lg shadow-sm border">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">Session Controls</h2>
          <Badge variant="outline" className="ml-2">
            {activeStudents} {activeStudents === 1 ? 'student' : 'students'} online
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onEndSession}
            className="text-destructive hover:text-destructive"
          >
            End Session
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <div className="font-medium">Join Code</div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={copyJoinCode}
                className="flex gap-1 items-center"
              >
                <span className="font-mono text-primary font-bold">{joinCode}</span>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 flex items-center justify-center">
            <div className="flex items-center space-x-2">
              <Button
                variant={isPaused ? "default" : "outline"}
                size="sm"
                onClick={onTogglePause}
                className={isPaused ? "bg-amber-500 hover:bg-amber-600" : ""}
              >
                {isPaused ? (
                  <>
                    <Pause className="h-4 w-4 mr-1" />
                    Paused
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-1" />
                    Active
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4">
        <div className="text-sm font-medium mb-2">Quick Controls</div>
        <div className="flex gap-3 flex-wrap">
          <Button
            variant={anonymousMode ? "default" : "outline"}
            size="sm"
            onClick={onToggleAnonymous}
            className="gap-2 items-center flex"
          >
            {anonymousMode ? <UserX size={16} /> : <Users size={16} />}
            {anonymousMode ? "Anonymous" : "Named"}
          </Button>

          <Button
            variant={syncEnabled ? "default" : "outline"}
            size="sm"
            onClick={onToggleSync}
            className={syncEnabled ? "bg-green-600 hover:bg-green-700 gap-2 items-center flex" : "gap-2 items-center flex"}
          >
            {syncEnabled ? <Lock size={16} /> : <Unlock size={16} />}
            {syncEnabled ? "Teacher Sync" : "Free Scroll"}
          </Button>

          <Button
            variant={studentPacingEnabled ? "default" : "outline"}
            size="sm"
            onClick={onTogglePacing}
            className="gap-2 items-center flex"
          >
            <FastForward size={16} />
            {studentPacingEnabled ? "Multi-Slide" : "Single Slide"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default LessonControls;
