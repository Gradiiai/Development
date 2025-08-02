"use client";

import type React from "react";
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/shared/dialog";
import { Button } from "../../../components/ui/shared/button";
import { Input } from "../../../components/ui/shared/input";
import { Textarea } from "../../../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";
import { Plus, Upload, X, FileText, Calendar, Clock, Loader2, User, Briefcase, CheckCircle, AlertCircle, Settings } from "lucide-react";
import { Alert, AlertDescription } from "../../../components/ui/alert";
import { motion, AnimatePresence } from "framer-motion";
import PDFToText from "react-pdftotext";

import { useSession } from "next-auth/react";
// Removed client-side JWT generation - now using server-side API
import { useRouter } from "next/navigation";
import { useToast } from "@/shared/hooks/use-toast";

interface FormData {
  jobPosition: string;
  jobDescription: string;
  yearsOfExperience: number;
  resume: File | null;
  candidateName: string;
  candidateEmail: string;
  interviewDate: string;
  interviewTime: string;
  interviewType: string;
}

interface AddNewInterviewProps {
  existingInterview?: any;
  isEditing?: boolean;
  isModal?: boolean;
  onInterviewCreated?: () => void;
}

const AddNewInterview = ({ existingInterview, isEditing = false, isModal = false, onInterviewCreated }: AddNewInterviewProps) => {
  const [openDialog, setOpenDialog] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    jobPosition: "",
    jobDescription: "",
    yearsOfExperience: 0,
    resume: null,
    candidateName: "",
    candidateEmail: "",
    interviewDate: "",
    interviewTime: "",
    interviewType: "behavioral",
  });
  const [fileError, setFileError] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [jsonResponse, setJsonResponse] = useState<string>("");
  const { data: session } = useSession();
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (isEditing && existingInterview) {
      setFormData({
        jobPosition: existingInterview.jobPosition || "",
        jobDescription: existingInterview.jobDescription || "",
        yearsOfExperience: parseInt(existingInterview.jobExperience) || 0,
        resume: null,
        candidateName: existingInterview.candidateName || "",
        candidateEmail: existingInterview.candidateEmail || "",
        interviewDate: existingInterview.interviewDate || "",
        interviewTime: existingInterview.interviewTime || "",
        interviewType: existingInterview.interviewType || "behavioral",
      });
    }
  }, [isEditing, existingInterview]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === "yearsOfExperience" ? parseInt(value) || 0 : value
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== "application/pdf") {
        setFileError("Please upload a PDF file only.");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setFileError("File size should be less than 5MB.");
        return;
      }
      setFileError("");
      setFormData(prev => ({ ...prev, resume: file }));
    }
  };

  const removeFile = () => {
    setFormData(prev => ({ ...prev, resume: null }));
    setFileError("");
  };

  const generateInterviewLink = async (interviewId: string, candidateEmail: string): Promise<string> => {
    // Generate simple direct interview link with email only - no tokens needed
    const baseUrl = window.location.origin;
    return `${baseUrl}/candidate/interview/${interviewId}/lobby?email=${encodeURIComponent(candidateEmail)}`;
  };

  const extractTextFromPDF = async (file: File): Promise<string> => {
    try {
      const text = await PDFToText(file);
      return text || '';
    } catch (error) {
      console.error('Error extracting text from PDF:', error);
      return '';
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if session is loaded
    if (!session) {
      toast({
        title: "Authentication Error",
        description: "Please wait for authentication to complete or refresh the page.",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);

    try {
      const apiFormData = new FormData();
      apiFormData.append("jobPosition", formData.jobPosition);
      apiFormData.append("jobDescription", formData.jobDescription);
      apiFormData.append(
        "yearsOfExperience",
        formData.yearsOfExperience.toString()
      );

      if (isEditing && existingInterview) {
        try {
          // Determine which API to use based on interview type or source
          let updateResponse;
          
          if (existingInterview.interviewType === 'behavioral' || existingInterview.source === 'behavioral') {
            // Update behavioral interview
            updateResponse = await fetch(`/api/interviews`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                interviewId: existingInterview.interviewId,
                jobPosition: formData.jobPosition,
                jobDescription: formData.jobDescription,
                jobExperience: formData.yearsOfExperience.toString(),
                candidateName: formData.candidateName,
                candidateEmail: formData.candidateEmail,
                interviewDate: formData.interviewDate,
                interviewTime: formData.interviewTime,
                interviewType: formData.interviewType,
              }),
            });
          } else {
            // Update campaign interview
            updateResponse = await fetch(`/api/campaigns/interviews`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                interviewId: existingInterview.interviewId,
                jobPosition: formData.jobPosition,
                jobDescription: formData.jobDescription,
                jobExperience: formData.yearsOfExperience.toString(),
                candidateName: formData.candidateName,
                candidateEmail: formData.candidateEmail,
                interviewDate: formData.interviewDate,
                interviewTime: formData.interviewTime,
                interviewType: formData.interviewType,
              }),
            });
          }

          if (!updateResponse.ok) {
            const errorData = await updateResponse.json();
            throw new Error(errorData.error || 'Failed to update interview');
          }

          setOpenDialog(false);
          toast({
            title: "Interview updated",
            description: "The interview has been successfully updated.",
          });
          
          if (onInterviewCreated) {
            onInterviewCreated();
          }
          
          return;
        } catch (error) {
          console.error('Error updating interview:', error);
          toast({
            title: "Error",
            description: error instanceof Error ? error.message : "Failed to update interview. Please try again.",
            variant: "destructive",
          });
          return;
        }
      }

      // Create interview using appropriate API endpoint
      const createData = {
        jobPosition: formData.jobPosition,
        jobDescription: formData.jobDescription,
        yearsOfExperience: formData.yearsOfExperience,
        candidateName: formData.candidateName,
        candidateEmail: formData.candidateEmail,
        interviewDate: formData.interviewDate,
        interviewTime: formData.interviewTime,
        resumeText: formData.resume ? await extractTextFromPDF(formData.resume) : undefined,
      };
      
      let apiEndpoint;
      if (formData.interviewType === 'combo') {
        apiEndpoint = '/api/interviews/combo';
        // Add combo-specific fields
        Object.assign(createData, {
          codingQuestions: 2,
          behavioralQuestions: 2,
          mcqQuestions: 2,
        });
      } else {
        // Default to behavioral
        apiEndpoint = '/api/interviews';
        Object.assign(createData, {
          totalQuestions: 5,
        });
      }
      
      const response = await fetch(apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(createData),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to create ${formData.interviewType} interview`);
      }

      const result = await response.json();
      setJsonResponse(JSON.stringify(result.interview?.interviewQuestions || {}, null, 2));
      
      toast({
        title: "Interview scheduled",
        description: "Interview scheduled successfully and invitation email sent to candidate.",
      });

      setOpenDialog(false);
      
      // Reset form data
      setFormData({
        jobPosition: "",
        jobDescription: "",
        yearsOfExperience: 0,
        resume: null,
        candidateName: "",
        candidateEmail: "",
        interviewDate: "",
        interviewTime: "",
        interviewType: "behavioral",
      });
      
      // If used in a modal, call the callback function
      if (isModal && onInterviewCreated) {
        onInterviewCreated();
      } else {
        // Otherwise navigate to the interview page
        router.push(`/dashboard/interviews/${result.interview.id}`);
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      toast({
        title: "Error",
        description: "There was an error scheduling the interview. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Create a form content component to avoid duplication
  const FormContent = () => (
    <motion.div 
      className="space-y-6 py-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Candidate Information */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="space-y-4 border-b border-gray-100 pb-6"
      >
        <div className="flex items-center gap-2 mb-4">
          <motion.div
            whileHover={{ scale: 1.1 }}
            transition={{ duration: 0.2 }}
          >
            <User className="h-5 w-5 text-teal-600" />
          </motion.div>
          <h3 className="font-semibold text-gray-900">Candidate Information</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label htmlFor="candidateName" className="text-sm font-medium text-gray-700">
              Candidate Name
            </label>
            <Input
              id="candidateName"
              name="candidateName"
              value={formData.candidateName}
              onChange={handleInputChange}
              placeholder="Enter candidate's full name"
              required
              className="glass-card border-gray-300 focus:border-teal-500 transition-all duration-300"
            />
          </div>
          
          <div className="space-y-2">
            <label htmlFor="candidateEmail" className="text-sm font-medium text-gray-700">
              Candidate Email
            </label>
            <Input
              id="candidateEmail"
              name="candidateEmail"
              type="email"
              value={formData.candidateEmail}
              onChange={handleInputChange}
              placeholder="Enter candidate's email address"
              required
              className="glass-card border-gray-300 focus:border-teal-500 transition-all duration-300"
            />
          </div>
        </div>
      </motion.div>

      {/* Interview Schedule */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="space-y-4 border-b border-gray-100 pb-6"
      >
        <div className="flex items-center gap-2 mb-4">
          <motion.div
            whileHover={{ scale: 1.1 }}
            transition={{ duration: 0.2 }}
          >
            <Calendar className="h-5 w-5 text-teal-600" />
          </motion.div>
          <h3 className="font-semibold text-gray-900">Interview Schedule</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label htmlFor="interviewDate" className="text-sm font-medium text-gray-700">
              Interview Date
            </label>
            <Input
              id="interviewDate"
              name="interviewDate"
              type="date"
              value={formData.interviewDate}
              onChange={handleInputChange}
              required
              className="glass-card border-gray-300 focus:border-teal-500 transition-all duration-300"
            />
          </div>
          
          <div className="space-y-2">
            <label htmlFor="interviewTime" className="text-sm font-medium text-gray-700">
              Interview Time
            </label>
            <Input
              id="interviewTime"
              name="interviewTime"
              type="time"
              value={formData.interviewTime}
              onChange={handleInputChange}
              required
              className="glass-card border-gray-300 focus:border-teal-500 transition-all duration-300"
            />
          </div>
        </div>
      </motion.div>

      {/* Job Information */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="space-y-4 border-b border-gray-100 pb-6"
      >
        <div className="flex items-center gap-2 mb-4">
          <motion.div
            whileHover={{ scale: 1.1 }}
            transition={{ duration: 0.2 }}
          >
            <Briefcase className="h-5 w-5 text-teal-600" />
          </motion.div>
          <h3 className="font-semibold text-gray-900">Job Information</h3>
        </div>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="jobPosition" className="text-sm font-medium text-gray-700">
              Job Position/Role
            </label>
            <Input
              id="jobPosition"
              name="jobPosition"
              value={formData.jobPosition}
              onChange={handleInputChange}
              placeholder="e.g., Senior Software Engineer, Product Manager"
              required
              className="glass-card border-gray-300 focus:border-teal-500 transition-all duration-300"
            />
          </div>
          
          <div className="space-y-2">
            <label htmlFor="yearsOfExperience" className="text-sm font-medium text-gray-700">
              Years of Experience Required
            </label>
            <Input
              id="yearsOfExperience"
              name="yearsOfExperience"
              type="number"
              min="0"
              max="50"
              value={formData.yearsOfExperience}
              onChange={handleInputChange}
              placeholder="Enter required years of experience"
              required
              className="glass-card border-gray-300 focus:border-teal-500 transition-all duration-300"
            />
          </div>
          
          <div className="space-y-2">
            <label htmlFor="jobDescription" className="text-sm font-medium text-gray-700">
              Job/Role Description
            </label>
            <Textarea
              id="jobDescription"
              name="jobDescription"
              value={formData.jobDescription}
              onChange={handleInputChange}
              placeholder="Describe the job role, responsibilities, and requirements..."
              required
              rows={4}
              className="min-h-28 resize-y glass-card border-gray-300 focus:border-teal-500 transition-all duration-300"
            />
          </div>
        </div>
      </motion.div>

      {/* Interview Type Selection */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="space-y-4 border-b border-gray-100 pb-6"
      >
        <div className="flex items-center gap-2 mb-4">
          <motion.div
            whileHover={{ scale: 1.1 }}
            transition={{ duration: 0.2 }}
          >
            <Settings className="h-5 w-5 text-teal-600" />
          </motion.div>
          <h3 className="font-semibold text-gray-900">Interview Configuration</h3>
        </div>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="interviewType" className="text-sm font-medium text-gray-700">
              Interview Type
            </label>
            <Select
              value={formData.interviewType}
              onValueChange={(value) => handleSelectChange('interviewType', value)}
            >
              <SelectTrigger className="glass-card border-gray-300 focus:border-teal-500 transition-all duration-300">
                <SelectValue placeholder="Select interview type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="behavioral">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span>Behavioral Interview</span>
                  </div>
                </SelectItem>
                <SelectItem value="combo">
                  <div className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    <span>Combo Interview (Behavioral + MCQ + Coding)</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">
              {formData.interviewType === 'combo' 
                ? 'Mixed interview with behavioral questions, multiple choice questions, and coding challenges'
                : 'Traditional behavioral interview with open-ended questions'
              }
            </p>
          </div>
        </div>
      </motion.div>

      {/* Resume Upload */}
      {!isEditing && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-4"
        >
          <div className="flex items-center gap-2 mb-4">
            <motion.div
              whileHover={{ scale: 1.1 }}
              transition={{ duration: 0.2 }}
            >
              <Upload className="h-5 w-5 text-teal-600" />
            </motion.div>
            <h3 className="font-semibold text-gray-900">Resume Upload (Optional)</h3>
          </div>
          
          <div className="space-y-4">
            {!formData.resume ? (
              <motion.div
                whileHover={{ scale: 1.01 }}
                className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-teal-400 transition-all duration-300 glass-card"
              >
                <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">
                    Upload candidate's resume (PDF only, max 5MB)
                  </p>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileChange}
                    className="hidden"
                    id="resume-upload"
                  />
                  <label
                    htmlFor="resume-upload"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-teal-600 hover:bg-teal-700 cursor-pointer transition-all duration-300"
                  >
                    Choose File
                  </label>
                </div>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg glass-card"
              >
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <FileText className="h-8 w-8 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-green-900">
                      {formData.resume.name}
                    </p>
                    <p className="text-xs text-green-700">
                      {(formData.resume.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <Button
                    type="button"
                    onClick={removeFile}
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </motion.div>
              </motion.div>
            )}
          </div>
          <AnimatePresence>
            {fileError && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                <Alert variant="destructive" className="mt-2 glass-card border-red-200">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{fileError}</AlertDescription>
                </Alert>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </motion.div>
  );

  // If used within a modal, don't show the dialog wrapper
  if (isModal) {
    return (
      <form onSubmit={onSubmit} className="space-y-4">
        <FormContent />
        
        <div className="flex justify-end space-x-3 mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={onInterviewCreated}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isLoading}
            className="bg-teal-600 hover:bg-teal-700 text-white"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isEditing ? "Updating..." : "Scheduling..."}
              </>
            ) : (
              <>
                {isEditing ? <CheckCircle className="mr-2 h-4 w-4" /> : <Calendar className="mr-2 h-4 w-4" />}
                {isEditing ? "Update Interview" : "Schedule Interview"}
              </>
            )}
          </Button>
        </div>
      </form>
    );
  }

  return (
    <Dialog open={openDialog} onOpenChange={setOpenDialog}>
      <DialogTrigger asChild>
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Button className="gap-2 bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white shadow-lg hover:shadow-xl transition-all duration-300">
            <motion.div
              whileHover={{ rotate: 90 }}
              transition={{ duration: 0.2 }}
            >
              <Plus className="h-5 w-5" />
            </motion.div>
            {isEditing ? "Edit Interview" : "Schedule Interview"}
          </Button>
        </motion.div>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md md:max-w-2xl lg:max-w-4xl max-h-[90vh] overflow-y-auto fixed left-[50%] top-[50%] z-[100] translate-x-[-50%] translate-y-[-50%]">
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
              {isEditing ? <FileText className="h-6 w-6" /> : <Calendar className="h-6 w-6" />}
              {isEditing ? "Edit Interview" : "Schedule a New Interview"}
            </DialogTitle>
            <DialogDescription className="text-gray-500">
              Gather details about the candidate, job position, and schedule the interview
            </DialogDescription>
          </DialogHeader>

          <FormContent />

          <div className="flex justify-end space-x-3 mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpenDialog(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !session}
              className="bg-teal-600 hover:bg-teal-700 text-white"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isEditing ? "Updating..." : "Scheduling..."}
                </>
              ) : !session ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Authenticating...
                </>
              ) : (
                <>
                  {isEditing ? <CheckCircle className="mr-2 h-4 w-4" /> : <Calendar className="mr-2 h-4 w-4" />}
                  {isEditing ? "Update Interview" : "Schedule Interview"}
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddNewInterview;
