import { db } from "@/lib/database/connection";
import { CodingInterview } from "@/lib/database/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import DirectInterviewFlow from "@/app/dashboard/_components/DirectInterviewFlow";

type Props = {
  params: Promise<{ InterviewId: string }>;
};

async function getInterviewDetails(interviewId: string) {
  try {
    const result = await db
      .select()
      .from(CodingInterview)
      .where(eq(CodingInterview.interviewId, interviewId))
      .limit(1);

    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error("Error fetching interview details:", error);
    return null;
  }
}

export default async function EditCodingInterviewPage(props: Props) {
  const params = await props.params;
  const { InterviewId } = params;

  const interview = await getInterviewDetails(InterviewId);

  if (!interview) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-teal-100 rounded-xl">
                <svg className="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-teal-600 to-blue-600 bg-clip-text text-transparent">
                  Edit Coding Interview
                </h1>
                <p className="text-slate-600 mt-1">
                  Update your coding interview details and settings
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="bg-gradient-to-r from-teal-50 to-blue-50 px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-800">Interview Configuration</h2>
              <p className="text-sm text-slate-600 mt-1">Modify the interview parameters and candidate information</p>
            </div>
            
            <div className="p-6">
              <DirectInterviewFlow 
                existingInterview={interview} 
                isEditing={true} 
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}