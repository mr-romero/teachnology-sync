
import React from 'react';
import { Button } from '@/components/ui/button';
import { 
  UserX, 
  Users, 
  FastForward, 
  Lock, 
  Unlock, 
  Pause, 
  Play,
  Copy,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from 'sonner';

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
  onSortChange?: (sortBy: string) => void;
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
  onEndSession,
  onSortChange
}) => {
  const copyJoinCode = () => {
    navigator.clipboard.writeText(joinCode);
    toast.success("Join code copied to clipboard");
  };

  return (
    <div className="flex flex-col space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="font-medium text-sm">Session Code:</div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={copyJoinCode}
            className="flex gap-1 items-center h-7 px-2"
          >
            <span className="font-mono text-primary font-bold">{joinCode}</span>
            <Copy className="h-3 w-3" />
          </Button>
          <Badge variant="outline" className="text-xs">
            {activeStudents} {activeStudents === 1 ? 'student' : 'students'} online
          </Badge>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onEndSession}
          className="text-destructive hover:text-destructive h-7 px-2 text-xs"
        >
          End Session
        </Button>
      </div>
      
      <div className="flex gap-2 items-center justify-between">
        <div className="flex gap-3">
          <div className="flex flex-col items-center gap-1">
            <Button
              variant={anonymousMode ? "default" : "outline"}
              size="sm"
              onClick={onToggleAnonymous}
              className="h-8 w-8 rounded-full p-0"
            >
              {anonymousMode ? <UserX size={14} /> : <Users size={14} />}
            </Button>
            <span className="text-[10px]">Incognito</span>
          </div>

          <div className="flex flex-col items-center gap-1">
            <Button
              variant={studentPacingEnabled ? "default" : "outline"}
              size="sm"
              onClick={onTogglePacing}
              className="h-8 w-8 rounded-full p-0"
            >
              <FastForward size={14} />
            </Button>
            <span className="text-[10px]">Pace</span>
          </div>

          <div className="flex flex-col items-center gap-1">
            <Button
              variant={syncEnabled ? "default" : "outline"}
              size="sm"
              onClick={onToggleSync}
              className={`h-8 w-8 rounded-full p-0 ${syncEnabled ? "bg-green-600 hover:bg-green-700" : ""}`}
            >
              {syncEnabled ? <Lock size={14} /> : <Unlock size={14} />}
            </Button>
            <span className="text-[10px]">Synced</span>
          </div>

          <div className="flex flex-col items-center gap-1">
            <Button
              variant={isPaused ? "default" : "outline"}
              size="sm"
              onClick={onTogglePause}
              className={`h-8 w-8 rounded-full p-0 ${isPaused ? "bg-amber-500 hover:bg-amber-600" : ""}`}
            >
              {isPaused ? <Pause size={14} /> : <Play size={14} />}
            </Button>
            <span className="text-[10px]">Pause</span>
          </div>
        </div>
        
        <div className="flex items-center">
          <span className="text-xs mr-2">SORT BY</span>
          <Select onValueChange={onSortChange} defaultValue="lastName">
            <SelectTrigger className="h-7 w-[120px] text-xs">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="lastName">Last Name</SelectItem>
              <SelectItem value="firstName">First Name</SelectItem>
              <SelectItem value="joinTime">Join Time</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};

export default LessonControls;
