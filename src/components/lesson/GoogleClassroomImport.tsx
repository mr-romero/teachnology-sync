import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from "@/components/ui/accordion";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip";
import { BookOpen, User, Users, Check, Loader2 } from 'lucide-react';
import { classroomService, GoogleClassroom, GoogleClassroomStudent } from '@/services/classroomService';
import { toast } from 'sonner';

interface GoogleClassroomImportProps {
  lessonId: string;
  onImportComplete?: (classroomId: string, students: GoogleClassroomStudent[]) => void;
}

const GoogleClassroomImport: React.FC<GoogleClassroomImportProps> = ({ 
  lessonId,
  onImportComplete 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [classrooms, setClassrooms] = useState<GoogleClassroom[]>([]);
  const [selectedClassroomId, setSelectedClassroomId] = useState<string | null>(null);
  const [students, setStudents] = useState<Record<string, GoogleClassroomStudent[]>>({});
  const [loadingClassroomId, setLoadingClassroomId] = useState<string | null>(null);
  const [importingClassroomId, setImportingClassroomId] = useState<string | null>(null);

  // Load classrooms when dialog opens
  useEffect(() => {
    if (isOpen && classrooms.length === 0) {
      loadClassrooms();
    }
  }, [isOpen]);

  // Function to load Google Classrooms
  const loadClassrooms = async () => {
    setIsLoading(true);
    try {
      const data = await classroomService.getClassrooms();
      setClassrooms(data);
    } catch (error: any) {
      toast.error(error.message || "Failed to load Google Classrooms");
    } finally {
      setIsLoading(false);
    }
  };

  // Function to load students for a specific classroom
  const loadStudents = async (classroomId: string) => {
    if (students[classroomId]) {
      // Students already loaded
      return;
    }

    setLoadingClassroomId(classroomId);
    try {
      const data = await classroomService.getClassroomStudents(classroomId);
      setStudents(prev => ({ ...prev, [classroomId]: data }));
    } catch (error: any) {
      toast.error(error.message || "Failed to load students");
    } finally {
      setLoadingClassroomId(null);
    }
  };

  // Function to import students from selected classroom
  const importStudents = async (classroomId: string) => {
    setImportingClassroomId(classroomId);
    try {
      // If students aren't loaded yet, load them first
      if (!students[classroomId]) {
        await loadStudents(classroomId);
      }

      // Import students to lesson
      await classroomService.importStudentsToLesson(classroomId, lessonId);
      
      // Call the callback if provided
      if (onImportComplete && students[classroomId]) {
        onImportComplete(classroomId, students[classroomId]);
      }

      toast.success(`Students from "${classrooms.find(c => c.id === classroomId)?.name}" imported successfully`);
      
      // Close the dialog
      setIsOpen(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to import students");
    } finally {
      setImportingClassroomId(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <BookOpen className="h-4 w-4" />
          Import from Google Classroom
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Import Students from Google Classroom</DialogTitle>
          <DialogDescription>
            Select a classroom to import students from. Students will be able to join your lesson.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
              <span className="ml-2 text-sm text-muted-foreground">Loading your classrooms...</span>
            </div>
          ) : classrooms.length === 0 ? (
            <div className="text-center p-8 border border-dashed rounded-lg">
              <BookOpen className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <h3 className="text-lg font-medium">No Classrooms Found</h3>
              <p className="text-sm text-muted-foreground mt-1">
                You don't have any Google Classrooms or we couldn't access them.
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-4"
                onClick={loadClassrooms}
              >
                Refresh Classrooms
              </Button>
            </div>
          ) : (
            <ScrollArea className="h-[400px] pr-4">
              <Accordion type="single" collapsible className="w-full">
                {classrooms.map((classroom) => (
                  <AccordionItem key={classroom.id} value={classroom.id}>
                    <AccordionTrigger className="hover:bg-muted/50 px-3 rounded-md">
                      <div className="flex items-center text-left">
                        <BookOpen className="h-4 w-4 mr-2 text-primary" />
                        <div>
                          <div className="font-medium">{classroom.name}</div>
                          {classroom.section && (
                            <div className="text-xs text-muted-foreground">{classroom.section}</div>
                          )}
                        </div>
                      </div>
                    </AccordionTrigger>
                    
                    <AccordionContent className="px-2">
                      <Card className="border-0 shadow-none">
                        <CardHeader className="p-3 pb-0">
                          <CardTitle className="text-sm flex justify-between items-center">
                            <span>Students</span>
                            <Button
                              size="sm"
                              onClick={() => importStudents(classroom.id)}
                              disabled={importingClassroomId === classroom.id}
                              className="h-8"
                            >
                              {importingClassroomId === classroom.id ? (
                                <>
                                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                  Importing...
                                </>
                              ) : (
                                <>
                                  <Users className="h-3 w-3 mr-1" />
                                  Import Class
                                </>
                              )}
                            </Button>
                          </CardTitle>
                        </CardHeader>
                        
                        <CardContent className="p-3">
                          {loadingClassroomId === classroom.id ? (
                            <div className="flex justify-center items-center h-20">
                              <Loader2 className="h-4 w-4 text-primary animate-spin" />
                              <span className="ml-2 text-xs text-muted-foreground">Loading students...</span>
                            </div>
                          ) : students[classroom.id] ? (
                            <div className="space-y-1">
                              {students[classroom.id].length === 0 ? (
                                <div className="text-center p-4">
                                  <p className="text-sm text-muted-foreground">No students in this class</p>
                                </div>
                              ) : (
                                students[classroom.id].map((student) => (
                                  <div 
                                    key={student.id}
                                    className="flex items-center justify-between p-2 text-sm hover:bg-muted/50 rounded-md"
                                  >
                                    <div className="flex items-center">
                                      <User className="h-3 w-3 mr-2 text-gray-500" />
                                      <span>{student.name}</span>
                                    </div>
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <span className="text-xs text-muted-foreground truncate max-w-[150px] inline-block">
                                            {student.email}
                                          </span>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>{student.email}</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  </div>
                                ))
                              )}
                            </div>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full h-20 border border-dashed"
                              onClick={() => loadStudents(classroom.id)}
                            >
                              <Users className="h-4 w-4 mr-2" />
                              Load Students
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </ScrollArea>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default GoogleClassroomImport;