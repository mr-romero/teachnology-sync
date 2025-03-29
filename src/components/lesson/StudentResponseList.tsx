
import React, { useEffect, useState } from 'react';
import { StudentProgress, StudentResponse } from '@/types/lesson';
import { CheckCircle, XCircle, HelpCircle, UserCheck } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

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
  const [activeStudentCount, setActiveStudentCount] = useState(0);
  
  useEffect(() => {
    // Count active students (those who are in the student progress array)
    setActiveStudentCount(studentProgress.length);
  }, [studentProgress]);
  
  // If there are no students yet, show a message
  if (studentProgress.length === 0) {
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
          <div className="text-xs font-medium">Active Students: {activeStudentCount}</div>
        </div>
        <div className="space-y-1">
          {studentProgress.map((student, index) => (
            <div 
              key={student.studentId}
              className="flex items-center justify-between p-1.5 bg-muted/30 rounded-md text-xs"
            >
              <span>
                {anonymousMode ? `Student ${index + 1}` : student.studentName}
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
        <div className="text-xs font-medium">Active Students: {activeStudentCount}</div>
      </div>
      
      {Object.entries(responsesByBlock).map(([blockId, responses]) => (
        <div key={blockId} className="border rounded-md p-2">
          <h4 className="text-xs font-medium mb-1">Question {blockId.split('-')[1] || blockId}</h4>
          <div className="space-y-1">
            {responses.map((response, index) => (
              <div 
                key={`${response.studentId}-${index}`}
                className="flex items-center justify-between text-xs"
              >
                <span className="truncate max-w-[120px]">
                  {anonymousMode 
                    ? `Student ${index + 1}` 
                    : response.studentName}
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
            ))}
          </div>
        </div>
      ))}
      
      {/* Show students who haven't responded to this slide */}
      {studentProgress.filter(student => 
        !currentSlideResponses.some(response => response.studentId === student.studentId)
      ).length > 0 && (
        <div className="border rounded-md p-2 bg-muted/10">
          <h4 className="text-xs font-medium mb-1">Waiting for responses</h4>
          <div className="space-y-1">
            {studentProgress
              .filter(student => 
                !currentSlideResponses.some(response => response.studentId === student.studentId)
              )
              .map((student, index) => (
                <div 
                  key={student.studentId}
                  className="flex items-center justify-between text-xs"
                >
                  <span className="truncate max-w-[120px] text-muted-foreground">
                    {anonymousMode 
                      ? `Student ${index + 1}` 
                      : student.studentName}
                  </span>
                  <HelpCircle className="h-3 w-3 text-muted-foreground/50" />
                </div>
              ))
            }
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentResponseList;
