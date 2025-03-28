
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { StudentProgress, StudentResponse } from '@/types/lesson';
import { CheckCircle, XCircle, HelpCircle } from 'lucide-react';

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
  // Filter responses for the current slide
  const currentSlideResponses = studentProgress.flatMap(student => 
    student.responses.filter(response => response.slideId === currentSlideId)
  );
  
  if (currentSlideResponses.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        <p>No responses yet</p>
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
    <div className="space-y-4">
      {Object.entries(responsesByBlock).map(([blockId, responses]) => (
        <div key={blockId} className="border rounded-md p-3">
          <h4 className="text-sm font-medium mb-2">Question {blockId.split('-')[1]}</h4>
          <div className="space-y-2">
            {responses.map((response, index) => (
              <div 
                key={`${response.studentId}-${index}`}
                className="flex items-center justify-between text-sm"
              >
                <span className="truncate max-w-[150px]">
                  {anonymousMode 
                    ? `Student ${index + 1}` 
                    : response.studentName}
                </span>
                <div className="flex items-center">
                  <span className="truncate max-w-[100px] mr-2 text-xs">
                    {typeof response.response === 'boolean' 
                      ? response.response ? 'True' : 'False'
                      : response.response}
                  </span>
                  {response.isCorrect === true ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : response.isCorrect === false ? (
                    <XCircle className="h-4 w-4 text-red-500" />
                  ) : (
                    <HelpCircle className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default StudentResponseList;
