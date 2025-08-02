import { db, isInterviewLinkExpired } from "@/lib/database/connection";
import { Interview } from "@/lib/database/schema";
import { eq } from "drizzle-orm";
import InterviewClient from "./InterviewClient";
import { Button } from "@/components/ui/shared/button";
import Link from "next/link";
import { Clock, Calendar, AlertTriangle } from "lucide-react";

type Props = {
  params: Promise<{ interviewId: string }>;
};

async function getInterviewDetails(interviewId: string) {
  try {
    const result = await db
      .select()
      .from(Interview)
      .where(eq(Interview.interviewId, interviewId));
    return result[0];
  } catch (error) {
    console.error("Error fetching interview details:", error);
    return null;
  }
}

export default async function InterviewPage(props: Props) {
  const params = await props.params;
  const { interviewId } = params;
  console.log("Interview page loaded", interviewId);

  const interviewDetails = await getInterviewDetails(interviewId);

  if (!interviewDetails) {
    return (
      <div className="text-center text-red-500 text-xl mt-10">
        Interview not found or error occurred.
      </div>
    );
  }

  // Combine interview date and time for expiration check
  const interviewDateTime = interviewDetails.interviewDate && interviewDetails.interviewTime
    ? new Date(`${interviewDetails.interviewDate}T${interviewDetails.interviewTime}`)
    : null;

  // Check if the interview link has expired
  const isExpired = isInterviewLinkExpired(interviewDateTime);

  if (isExpired) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <div className="bg-white p-8 rounded-xl shadow-lg border border-red-200">
          <div className="flex items-center justify-center mb-6">
            <div className="bg-red-100 p-3 rounded-full">
              <AlertTriangle className="h-10 w-10 text-red-600" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-red-600 mb-4 text-center">Interview Link Expired</h2>
          <div className="bg-red-50 p-4 rounded-lg mb-6">
            <p className="text-gray-700 mb-2">
              This interview link has expired. The link was valid for 3 hours after the scheduled interview time.
            </p>
            {interviewDateTime && (
              <div className="flex flex-col gap-2 mt-4">
                <div className="flex items-center gap-2 text-gray-600">
                  <Calendar className="h-4 w-4" />
                  <span>Scheduled Date: {interviewDetails.interviewDate}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Clock className="h-4 w-4" />
                  <span>Scheduled Time: {interviewDetails.interviewTime}</span>
                </div>
              </div>
            )}
          </div>
          <div className="flex justify-center">
            <Link href="/dashboard" legacyBehavior>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                Return to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <InterviewClient interviewDetails={interviewDetails} />;
}
