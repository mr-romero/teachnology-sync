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
import { 
  Loader2, 
  PlusCircle, 
  RefreshCw, 
  Users, 
  BookOpen,
  Check,
  Clock,
  School
} from 'lucide-react';
import { getActiveSessionForLesson } from '@/services/lessonService';
import GoogleClassroomImport from './GoogleClassroomImport';
import { Separator } from '@/components/ui/separator';
import { classroomService, GoogleClassroomStudent, ImportedClassroom } from '@/services/classroomService';
import { toast } from 'sonner';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectGroup, 
  SelectItem, 
  SelectLabel, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface PresentationDialogProps {
  lessonId: string;
  lessonTitle?: string;
  isOpen: boolean;
  onClose: () => void;
  onCreateNewSession: (params?: { classroomId?: string }) => Promise<{ sessionId: string, joinCode: string }>;
  onJoinExistingSession: (sessionId: string) => void;
}

const PresentationDialog: React.FC<PresentationDialogProps> = ({
  lessonId,
  lessonTitle = 'Lesson',
  isOpen,
  onClose,
  onCreateNewSession,
  onJoinExistingSession,
}) => {
  const [activeSession, setActiveSession] = useState<{ id: string; join_code: string; current_slide: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [importedStudents, setImportedStudents] = useState<GoogleClassroomStudent[]>([]);
  const [importedClassroomId, setImportedClassroomId] = useState<string>('');
  const [importedClassName, setImportedClassName] = useState<string>('');
  const [createAssignment, setCreateAssignment] = useState(true);
  const [creatingAssignment, setCreatingAssignment] = useState(false);
  const [classroomTab, setClassroomTab] = useState<string>("previous");
  const [previousClassrooms, setPreviousClassrooms] = useState<ImportedClassroom[]>([]);
  const [loadingClassrooms, setLoadingClassrooms] = useState(false);
  const [selectedClassroomId, setSelectedClassroomId] = useState<string>("");

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

  // Load previously imported classrooms
  const loadPreviousClassrooms = async () => {
    setLoadingClassrooms(true);
    try {
      const classrooms = await classroomService.getImportedClassrooms();
      setPreviousClassrooms(classrooms);
    } catch (error) {
      console.error('Error loading imported classrooms:', error);
    } finally {
      setLoadingClassrooms(false);
    }
  };

  const handleImportComplete = (classroomId: string, students: GoogleClassroomStudent[]) => {
    // Store imported students info to show summary
    setImportedStudents(students);
    setImportedClassroomId(classroomId);
    setSelectedClassroomId(classroomId);
    
    // Find the classroom name for display
    setImportedClassName(students[0]?.name.split(' ')[0] + "'s Class" || "Classroom");
    
    toast.success(`${students.length} students from Google Classroom are ready to join`);
    
    // Refresh the list of imported classrooms
    loadPreviousClassrooms();
  };

  const handleCreateSession = async () => {
    try {
      // Get the classroom ID - either from newly imported or selected previous classroom
      const classroomId = classroomTab === "previous" ? selectedClassroomId : importedClassroomId;
      
      // Check if a classroom was selected
      if (!classroomId) {
        toast.error('Please select a Google Classroom first');
        return;
      }
      
      // Debug logs
      console.log("Creating session with classroom:", classroomId);
      console.log("Create assignment setting:", createAssignment);
      
      // Indicate that assignment creation is in progress
      if (classroomId && createAssignment) {
        setCreatingAssignment(true);
      }
      
      // Create the presentation session
      const { sessionId, joinCode } = await onCreateNewSession({ 
        classroomId: classroomId 
      });
      
      console.log("Session created:", sessionId, joinCode);
      
      // If a Google Classroom was selected and assignment creation is enabled
      if (classroomId && createAssignment) {
        try {
          // Generate the join URL
          const baseUrl = window.location.origin;
          const joinUrl = `${baseUrl}/join?code=${joinCode}`;
          
          console.log("Creating assignment with URL:", joinUrl);
          
          // Create the assignment in Google Classroom
          await classroomService.createAssignment(
            classroomId,
            `${lessonTitle} - Interactive Session`,
            `Join our interactive lesson session using the link below or with join code: ${joinCode}`,
            joinUrl
          );
          
          toast.success('Google Classroom assignment created successfully');
        } catch (error) {
          console.error('Error creating Google Classroom assignment:', error);
          toast.error('Failed to create Google Classroom assignment');
        }
      }
    } catch (error) {
      console.error('Error starting presentation session:', error);
      toast.error('Failed to start presentation session');
    } finally {
      setCreatingAssignment(false);
    }
  };
  
  // When a classroom is selected from the dropdown
  const handleClassroomSelect = (classroomId: string) => {
    setSelectedClassroomId(classroomId);
  };

  useEffect(() => {
    if (isOpen && lessonId) {
      loadActiveSession();
      loadPreviousClassrooms();
    }
  }, [isOpen, lessonId]);

  // Format date to be more readable
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Never";
    
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit', 
      minute: '2-digit'
    });
  };

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
              
              {/* Google Classroom Selection Section */}
              <div className="border rounded-lg p-4">
                <h3 className="font-medium mb-2">Select Google Classroom</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Choose a Google Classroom to create an assignment for your students.
                </p>
                
                <Tabs defaultValue="previous" value={classroomTab} onValueChange={setClassroomTab}>
                  <TabsList className="grid w-full grid-cols-2 mb-4">
                    <TabsTrigger value="previous">Previous Classrooms</TabsTrigger>
                    <TabsTrigger value="import">Import New</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="previous">
                    {loadingClassrooms ? (
                      <div className="flex justify-center items-center py-4">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        <span className="ml-2 text-xs text-muted-foreground">Loading classrooms...</span>
                      </div>
                    ) : previousClassrooms.length === 0 ? (
                      <div className="text-center py-4">
                        <p className="text-sm text-muted-foreground">No classrooms imported yet</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Switch to the "Import New" tab to import a classroom.
                        </p>
                      </div>
                    ) : (
                      <>
                        <Select value={selectedClassroomId} onValueChange={handleClassroomSelect}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a classroom" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              <SelectLabel>Your Classrooms</SelectLabel>
                              {previousClassrooms.map((classroom) => (
                                <SelectItem 
                                  key={classroom.classroom_id} 
                                  value={classroom.classroom_id}
                                >
                                  {classroom.classroom_name} ({classroom.student_count} students)
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                        
                        {selectedClassroomId && (
                          <div className="mt-4 bg-muted/30 rounded-lg p-3">
                            {previousClassrooms.filter(c => c.classroom_id === selectedClassroomId).map(classroom => (
                              <div key={classroom.id}>
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center">
                                    <School className="h-4 w-4 mr-2 text-primary" />
                                    <span className="text-sm font-medium">{classroom.classroom_name}</span>
                                  </div>
                                  <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                                    {classroom.student_count} students
                                  </span>
                                </div>
                                <div className="mt-2 flex items-center text-xs text-muted-foreground">
                                  <Clock className="h-3 w-3 mr-1" />
                                  <span>Last used: {formatDate(classroom.last_used_at)}</span>
                                </div>
                                
                                {/* Google Classroom Assignment Option */}
                                <div className="mt-3 flex items-center space-x-2">
                                  <Checkbox 
                                    id="createAssignment" 
                                    checked={createAssignment}
                                    onCheckedChange={(checked) => setCreateAssignment(checked as boolean)}
                                  />
                                  <Label htmlFor="createAssignment" className="text-sm flex items-center">
                                    <BookOpen className="h-3 w-3 mr-1 text-primary/70" />
                                    Create assignment in Google Classroom
                                  </Label>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="import">
                    {importedStudents.length > 0 ? (
                      <div className="bg-muted/30 rounded-lg p-3 mb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <Users className="h-4 w-4 mr-2 text-primary" />
                            <span className="text-sm font-medium">{importedClassName}</span>
                          </div>
                          <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                            {importedStudents.length} students
                          </span>
                        </div>
                        
                        {/* Google Classroom Assignment Option */}
                        <div className="mt-3 flex items-center space-x-2">
                          <Checkbox 
                            id="createAssignment" 
                            checked={createAssignment}
                            onCheckedChange={(checked) => setCreateAssignment(checked as boolean)}
                          />
                          <Label htmlFor="createAssignment" className="text-sm flex items-center">
                            <BookOpen className="h-3 w-3 mr-1 text-primary/70" />
                            Create assignment in Google Classroom
                          </Label>
                        </div>
                      </div>
                    ) : null}
                    
                    <GoogleClassroomImport 
                      lessonId={lessonId}
                      onImportComplete={handleImportComplete}
                    />
                  </TabsContent>
                </Tabs>
              </div>
              
              {/* Create Session Button */}
              <div className="border rounded-lg p-4">
                <h3 className="font-medium mb-2">Create New Session</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  Start a new presentation session with the selected classroom.
                  {activeSession && " This will end any existing active sessions."}
                </p>
                <Button 
                  onClick={handleCreateSession} 
                  className="w-full mt-2"
                  variant={activeSession ? "outline" : "default"}
                  disabled={creatingAssignment || (classroomTab === "previous" && !selectedClassroomId)}
                >
                  {creatingAssignment ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating Session...
                    </>
                  ) : (
                    <>
                      <PlusCircle className="h-4 w-4 mr-2" />
                      Create New Session
                    </>
                  )}
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