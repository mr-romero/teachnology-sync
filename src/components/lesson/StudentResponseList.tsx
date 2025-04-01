import React, { useEffect, useState } from 'react';
import { StudentProgress, StudentResponse } from '@/types/lesson';
import { CheckCircle, XCircle, HelpCircle, UserCheck, BookOpen } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface StudentResponseListProps {
  studentProgress: StudentProgress[];
  currentSlideId: string;
  anonymousMode: boolean;
}

const StudentResponseList: React.FC<StudentResponseListProps> = ({ 
  studentProgress, 
  currentSlideId,
  anonymousMode 
}) => {
  // Calculate student counts - move to top of component
  const activeStudentCount = studentProgress.filter(student => student.is_active).length;
  const totalStudentCount = studentProgress.length;
  
  // If there are no students yet, show a message
  if (totalStudentCount === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground text-sm">
        <p>No students have joined yet</p>
        <p className="text-xs mt-1">Students will appear here when they join</p>
      </div>
    );
  }
  
  // Filter responses for the current slide
  const currentSlideResponses = studentProgress.flatMap(student => 
    student.responses.filter(response => response.slideId === currentSlideId)
  );
  
  // Show active students even if they haven't responded yet
  if (currentSlideResponses.length === 0) {
    return (
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-medium">Active: {activeStudentCount} / Total: {totalStudentCount}</div>
        </div>
        <div className="space-y-1">
          {studentProgress.map((student, index) => (
            <div 
              key={student.studentId}
              className={cn(
                "flex items-center justify-between p-1.5 bg-muted/30 rounded-md text-xs",
                !student.is_active && "opacity-50 italic text-muted-foreground"
              )}
            >
              <span className="flex items-center gap-1">
                {anonymousMode ? `Student ${index + 1}` : (
                  <>
                    <span>{student.studentName}</span>
                    {student.studentClass && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge variant="outline" className="px-1 h-4 text-[9px] ml-1">
                              <BookOpen className="h-2 w-2 mr-0.5" />
                              {student.studentClass}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs">Class: {student.studentClass}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </>
                )}
              </span>
              <UserCheck className="h-3 w-3 text-muted-foreground" />
            </div>
          ))}
        </div>
        <div className="mt-3 text-center text-xs text-muted-foreground">
          <p>No responses for this slide yet</p>
        </div>
      </div>
    );
  }

  // Group responses by block ID
  const responsesByBlock: Record<string, StudentResponse[]> = {};
  
  currentSlideResponses.forEach(response => {
    if (!responsesByBlock[response.blockId]) {
      responsesByBlock[response.blockId] = [];
    }
    responsesByBlock[response.blockId].push(response);
  });
  
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-1">
        <div className="text-xs font-medium">
          Active: {activeStudentCount} / Total: {totalStudentCount}
        </div>
      </div>
      
      {Object.entries(responsesByBlock).map(([blockId, responses]) => (
        <div key={blockId} className="border rounded-md p-2">
          <h4 className="text-xs font-medium mb-1">Question {blockId.split('-')[1] || blockId}</h4>
          <div className="space-y-1">
            {responses.map((response, index) => {
              // Find the student's info from the studentProgress array
              const studentInfo = studentProgress.find(student => student.studentId === response.studentId);
              
              if (!studentInfo) return null;
              
              return (
                <div 
                  key={`${response.studentId}-${index}`}
                  className={cn(
                    "flex items-center justify-between text-xs",
                    !studentInfo.is_active && "opacity-50 italic"
                  )}
                >
                  <span className="truncate max-w-[120px] flex items-center gap-1">
                    {anonymousMode ? `Student ${index + 1}` : (
                      <>
                        <span>{response.studentName}</span>
                        {studentInfo.studentClass && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge variant="outline" className="px-1 h-4 text-[9px] ml-1">
                                  <BookOpen className="h-2 w-2 mr-0.5" />
                                  {studentInfo.studentClass}
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-xs">Class: {studentInfo.studentClass}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </>
                    )}
                  </span>
                  <div className="flex items-center">
                    <span className="truncate max-w-[80px] mr-1 text-[10px]">
                      {typeof response.response === 'boolean' 
                        ? response.response ? 'True' : 'False'
                        : response.response}
                    </span>
                    {response.isCorrect === true ? (
                      <CheckCircle className="h-3 w-3 text-green-600" />
                    ) : response.isCorrect === false ? (
                      <XCircle className="h-3 w-3 text-red-500" />
                    ) : (
                      <HelpCircle className="h-3 w-3 text-muted-foreground" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
      
      {/* Show students who haven't responded */}
      <div className="border rounded-md p-2 bg-muted/10">
        <h4 className="text-xs font-medium mb-1">Waiting for responses</h4>
        <div className="space-y-1">
          {studentProgress
            .filter(student => !currentSlideResponses.some(response => response.studentId === student.studentId))
            .map((student, index) => (
              <div 
                key={student.studentId}
                className={cn(
                  "flex items-center justify-between p-1.5 text-xs",
                  !student.is_active && "opacity-50 italic text-muted-foreground"
                )}
              >
                <span className="truncate max-w-[120px] flex items-center gap-1">
                  {anonymousMode ? `Student ${index + 1}` : (
                    <>
                      <span>{student.studentName}</span>
                      {student.studentClass && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge 
                                variant="outline" 
                                className={cn(
                                  "px-1 h-4 text-[9px] ml-1",
                                  !student.is_active && "opacity-60"
                                )}
                              >
                                <BookOpen className="h-2 w-2 mr-0.5" />
                                {student.studentClass}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">Class: {student.studentClass}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </>
                  )}
                </span>
                <UserCheck className="h-3 w-3 text-muted-foreground" />
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default StudentResponseList;
