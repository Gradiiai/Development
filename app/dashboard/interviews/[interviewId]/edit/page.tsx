"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import AddNewInterview from "@/app/dashboard/_components/AddNewInterview";
import { useToast } from "@/shared/hooks/use-toast";

export default function EditInterviewPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [interview, setInterview] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const interviewId = params.interviewId as string;

  useEffect(() => {
    const fetchInterview = async () => {
      try {
        setIsLoading(true);
        
        // Try to fetch from direct interviews API first
        let response = await fetch(`/api/interviews?interviewId=${interviewId}`);
        
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.interviews && data.interviews.length > 0) {
            setInterview(data.interviews[0]);
            return;
          }
        }
        
        // If not found in direct interviews, try campaign interview API
        response = await fetch(`/api/campaigns/interviews?interviewId=${interviewId}`);
        
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.interviews && data.interviews.length > 0) {
            setInterview(data.interviews[0]);
            return;
          }
        }
        
        // If not found in either API
        toast({
          title: "Interview not found",
          description: "The interview you're trying to edit doesn't exist.",
          variant: "destructive",
        });
        router.push("/dashboard/interviews");
        
      } catch (error) {
        console.error("Error fetching interview:", error);
        toast({
          title: "Error",
          description: "Failed to load the interview. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (interviewId) {
      fetchInterview();
    }
  }, [interviewId, router, toast]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
          <p className="text-gray-600">Loading interview data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Edit Interview</h1>
        <p className="text-gray-500 mt-1">
          Update the details for the scheduled interview.
        </p>
      </div>

      {interview && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <AddNewInterview
            existingInterview={interview}
            isEditing={true}
            onInterviewCreated={() => {
              toast({
                title: "Interview updated",
                description: "The interview has been successfully updated.",
              });
              router.push("/dashboard/interviews");
            }}
          />
        </div>
      )}
    </div>
  );
}