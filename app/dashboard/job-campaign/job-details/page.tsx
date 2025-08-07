"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/shared/card";
import { Input } from "@/components/ui/shared/input";
import { Label } from "@/components/ui/shared/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/shared/button";
import { Switch } from "@/components/ui/shared/switch";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/shared/tabs";
import { Badge } from "@/components/ui/shared/badge";
import { Separator } from "@/components/ui/shared/separator";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Briefcase,
  MapPin,
  DollarSign,
  Users,
  Clock,
  FileText,
  Sparkles,
  Save,
  ArrowRight,
  X,
  Loader2,
  AlertCircle,
  CalendarIcon,
  Target,
  Download,
  CheckCircle,
  Info,
  Settings,
  GraduationCap,
  CircleDollarSign,
} from "lucide-react";
import { motion } from "framer-motion";
import { useSession } from "next-auth/react";
import { useJobCampaignStore } from "@/shared/store/jobCampaignStore";
import { JobCampaignNavigation } from "@/components/job-campaign/JobCampaignNavigation";
import {
  JobDetailsForm,
  JobDescriptionTemplate,
} from "@/shared/types/job-campaign";
import { CURRENCIES } from "@/lib/campaign-constants";
import { toast } from "sonner";
import { z } from "zod";

// Validation schema for job details
const jobDetailsSchema = z
  .object({
    campaignName: z
      .string()
      .min(3, "Campaign name must be at least 3 characters")
      .max(100, "Campaign name too long"),
    jobTitle: z
      .string()
      .min(2, "Job title must be at least 2 characters")
      .max(100, "Job title too long"),
    department: z.string().min(2, "Department is required"),
    location: z.string().min(2, "Location is required"),
    experienceLevel: z.string().min(1, "Experience level is required"),
    employeeType: z.string().min(1, "Employment type is required"),
    numberOfOpenings: z
      .number()
      .min(1, "At least 1 opening required")
      .max(100, "Too many openings"),
    salaryMin: z.number().optional(),
    salaryMax: z.number().optional(),
    jobDescription: z
      .string()
      .min(50, "Job description must be at least 50 characters")
      .max(5000, "Job description too long"),
    jobDuties: z.string().optional(),
    requirements: z.string().optional(),
    benefits: z.string().optional(),
    skills: z.string().optional(),
    campaignType: z.enum(["permanent", "specific"], {
      message: "Campaign type is required",
    }),
    applicationDeadline: z.string().optional(),
    targetHireDate: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.salaryMin && data.salaryMax && data.salaryMin > data.salaryMax) {
        return false;
      }
      return true;
    },
    {
      message: "Minimum salary cannot be greater than maximum salary",
      path: ["salaryMax"],
    }
  )
  .refine(
    (data) => {
      // For specific campaigns, require application deadline
      if (
        data.campaignType === "specific" &&
        (!data.applicationDeadline ||
          data.applicationDeadline.trim() === "" ||
          data.applicationDeadline === "0000-00-00")
      ) {
        return false;
      }
      return true;
    },
    {
      message: "Application deadline is required for specific campaigns",
      path: ["applicationDeadline"],
    }
  )
  .refine(
    (data) => {
      // For specific campaigns, require target hire date
      if (
        data.campaignType === "specific" &&
        (!data.targetHireDate ||
          data.targetHireDate.trim() === "" ||
          data.targetHireDate === "0000-00-00" ||
          data.targetHireDate.startsWith("0001-"))
      ) {
        return false;
      }
      return true;
    },
    {
      message: "Target hire date is required for specific campaigns",
      path: ["targetHireDate"],
    }
  )
  .refine(
    (data) => {
      // Only validate date order if both dates are provided and valid
      if (
        data.applicationDeadline &&
        data.targetHireDate &&
        data.applicationDeadline.trim() !== "" &&
        data.targetHireDate.trim() !== ""
      ) {
        const appDate = new Date(data.applicationDeadline);
        const targetDate = new Date(data.targetHireDate);
        if (
          appDate.toString() !== "Invalid Date" &&
          targetDate.toString() !== "Invalid Date"
        ) {
          return targetDate >= appDate;
        }
      }
      return true;
    },
    {
      message: "Target hire date must be after Application deadline",
      path: ["targetHireDate"],
    }
  );

const employeeTypes = ["Full-time", "Part-time", "Contract", "Internship"];

const experienceLevels = [
  "Entry Level (0-2 years)",
  "Mid Level (3-5 years)",
  "Senior Level (6-10 years)",
  "Lead/Principal (10+ years)",
  "Executive/Director (15+ years)",
];

const departments = [
  "Engineering",
  "Product",
  "Design",
  "Marketing",
  "Sales",
  "Operations",
  "Human Resources",
  "Finance",
  "Customer Success",
  "Data Science",
  "DevOps",
  "Quality Assurance",
  "Business Development",
  "Legal",
  "Other",
];

export default function JobDetailsStep() {
  const router = useRouter();
  const { data: session } = useSession();
  const {
    state,
    updateJobDetails,
    setCampaignId,
    setCurrentStep,
    setLoading,
    setError,
    resetCampaign,
    saveToStorage,
    isFormValid,
  } = useJobCampaignStore();

  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [showTemplatePreview, setShowTemplatePreview] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [jobDescriptionTemplates, setJobDescriptionTemplates] = useState<
    JobDescriptionTemplate[]
  >([]);
  const [companyName, setCompanyName] = useState("");
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [loadingCompany, setLoadingCompany] = useState(false);
  const [skillTemplates, setSkillTemplates] = useState<any[]>([]);
  const [selectedSkillTemplate, setSelectedSkillTemplate] = useState("");
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState(0);
  const [isEditMode, setIsEditMode] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  function formatDateInput(dateString: string | null): string {
    if (!dateString) return "";

    const date = new Date(dateString);
    if (isNaN(date.getTime())) return ""; // Invalid date fallback

    return date.toISOString().split("T")[0]; // Returns YYYY-MM-DD
  }

  const handleInputChange = (field: keyof JobDetailsForm, value: any) => {
    updateJobDetails({ [field]: value });
    setHasUnsavedChanges(true);

    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
    if (field === "applicationDeadline" || field === "targetHireDate") {
      validateForm();
    }
  };

  // Validate form data (for saving)
  const validateForm = () => {
    try {
      const formData = {
        campaignName: (state.jobDetails.campaignName || "").trim(),
        jobTitle: (state.jobDetails.jobTitle || "").trim(),
        department: (state.jobDetails.department || "").trim(),
        location: (state.jobDetails.location || "").trim(),
        experienceLevel: (state.jobDetails.experienceLevel || "").trim(),
        employeeType: (state.jobDetails.employeeType || "").trim(),
        numberOfOpenings: parseInt(
          state.jobDetails.numberOfOpenings?.toString() || "1"
        ),
        salaryMin: state.jobDetails.salaryMin
          ? parseInt(state.jobDetails.salaryMin.toString())
          : undefined,
        salaryMax: state.jobDetails.salaryMax
          ? parseInt(state.jobDetails.salaryMax.toString())
          : undefined,
        jobDescription: (state.jobDetails.jobDescription || "").trim(),
        jobDuties: state.jobDetails.jobDuties
          ? Array.isArray(state.jobDetails.jobDuties)
            ? state.jobDetails.jobDuties.join("\n").trim()
            : (state.jobDetails.jobDuties as string).trim()
          : undefined,
        requirements: state.jobDetails.requirements
          ? Array.isArray(state.jobDetails.requirements)
            ? state.jobDetails.requirements.join("\n").trim()
            : (state.jobDetails.requirements as string).trim()
          : undefined,
        campaignType: state.jobDetails.campaignType || "specific",
        applicationDeadline: (
          state.jobDetails.applicationDeadline || ""
        ).trim(),
        targetHireDate: (state.jobDetails.targetHireDate || "").trim(),
      };

      console.log("Validating form data:", formData);
      jobDetailsSchema.parse(formData);
      setValidationErrors({});
      return true;
    } catch (error) {
      console.log("Validation error:", error);
      if (error instanceof z.ZodError) {
        const errors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            errors[err.path[0] as string] = err.message;
          }
        });
        console.log("Parsed validation errors:", errors);
        setValidationErrors(errors);
      }
      return false;
    }
  };

  // Check if form is valid (for UI state, doesn't trigger state updates)
  const isFormValidMemo = useMemo(() => {
    try {
      const formData = {
        campaignName: (state.jobDetails.campaignName || "").trim(),
        jobTitle: (state.jobDetails.jobTitle || "").trim(),
        department: (state.jobDetails.department || "").trim(),
        location: (state.jobDetails.location || "").trim(),
        experienceLevel: (state.jobDetails.experienceLevel || "").trim(),
        employeeType: (state.jobDetails.employeeType || "").trim(),
        numberOfOpenings: parseInt(
          state.jobDetails.numberOfOpenings?.toString() || "1"
        ),
        salaryMin: state.jobDetails.salaryMin
          ? parseInt(state.jobDetails.salaryMin.toString())
          : undefined,
        salaryMax: state.jobDetails.salaryMax
          ? parseInt(state.jobDetails.salaryMax.toString())
          : undefined,
        jobDescription: (state.jobDetails.jobDescription || "").trim(),
        jobDuties: state.jobDetails.jobDuties
          ? Array.isArray(state.jobDetails.jobDuties)
            ? state.jobDetails.jobDuties.join("\n").trim()
            : (state.jobDetails.jobDuties as string).trim()
          : undefined,
        requirements: state.jobDetails.requirements
          ? Array.isArray(state.jobDetails.requirements)
            ? state.jobDetails.requirements.join("\n").trim()
            : (state.jobDetails.requirements as string).trim()
          : undefined,
        campaignType: state.jobDetails.campaignType || "specific",
        applicationDeadline: (
          state.jobDetails.applicationDeadline || ""
        ).trim(),
        targetHireDate: (state.jobDetails.targetHireDate || "").trim(),
      };

      jobDetailsSchema.parse(formData);
      return true;
    } catch (error) {
      return false;
    }
  }, [state.jobDetails]);

  // Clear validation errors when form becomes valid
  useEffect(() => {
    if (isFormValidMemo && Object.keys(validationErrors).length > 0) {
      setValidationErrors({});
    }
  }, [isFormValidMemo, validationErrors]);

  // Save job campaign
  const saveJobCampaign = async () => {
    if (!validateForm()) {
      toast.error("Please fix validation errors before saving");
      return false;
    }

    if (!session?.user?.companyId) {
      toast.error("Company information not found");
      return false;
    }

    setIsSaving(true);
    setSaveProgress(0);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setSaveProgress((prev) => Math.min(prev + 20, 90));
      }, 200);

      const payload = {
        campaignName: state.jobDetails.campaignName,
        jobTitle: state.jobDetails.jobTitle,
        department: state.jobDetails.department,
        location: state.jobDetails.location,
        experienceLevel: state.jobDetails.experienceLevel,
        employeeType: state.jobDetails.employeeType,
        numberOfOpenings: parseInt(
          state.jobDetails.numberOfOpenings?.toString() || "1"
        ),
        salaryMin: state.jobDetails.salaryMin,
        salaryMax: state.jobDetails.salaryMax,
        jobDescription: state.jobDetails.jobDescription,
        jobDuties: state.jobDetails.jobDuties,
        requirements: state.jobDetails.requirements,
        benefits: state.jobDetails.benefits,
        applicationDeadline: state.jobDetails.applicationDeadline,
        targetHireDate: state.jobDetails.targetHireDate,
        skills: state.jobDetails.skills,
        companyId: session.user.companyId,
      };

      console.log("Sending payload:", payload);
      console.log("Job details state:", state.jobDetails);

      const url =
        isEditMode && state.campaignId
          ? `/api/campaigns/jobs/${state.campaignId}`
          : "/api/campaigns/jobs";

      const method = isEditMode && state.campaignId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      clearInterval(progressInterval);
      setSaveProgress(100);

      if (!response.ok) {
        const errorData = await response.json();
        console.error("API Error:", errorData);
        if (errorData.validationErrors) {
          console.error("Validation Errors:", errorData.validationErrors);
          const errorMessages = Object.entries(errorData.validationErrors)
            .map(([field, message]) => `${field}: ${message}`)
            .join(", ");
          throw new Error(`Validation failed: ${errorMessages}`);
        }
        throw new Error(errorData.error || "Failed to save job campaign");
      }

      const result = await response.json();

      if (result.success && result.data) {
        setCampaignId(result.data.id);
        setHasUnsavedChanges(false);
        toast.success(
          isEditMode
            ? "Job campaign updated successfully!"
            : "Job campaign created successfully!"
        );
        return true;
      } else {
        throw new Error(result.error || "Failed to save job campaign");
      }
    } catch (error) {
      console.error("Error saving job campaign:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to save job campaign"
      );
      return false;
    } finally {
      setIsSaving(false);
      setSaveProgress(0);
    }
  };

  // Handle continue to next step
  const handleContinue = async () => {
    const saved = await saveJobCampaign();
    if (saved) {
      router.push("/dashboard/job-campaign/interview-setup");
    }
  };

  // Save as draft function
  const saveDraftAsync = async () => {
    const saved = await saveJobCampaign();
    if (saved) {
      toast.success("Draft saved successfully!");
    }
  };

  // Auto-save functionality
  useEffect(() => {
    if (hasUnsavedChanges && state.campaignId) {
      const autoSaveTimer = setTimeout(() => {
        saveJobCampaign();
      }, 30000); // Auto-save after 30 seconds of inactivity

      return () => clearTimeout(autoSaveTimer);
    }
  }, [hasUnsavedChanges, state.campaignId]);

  // Warn user about unsaved changes before leaving
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Fetch job description templates
  const fetchJobDescriptionTemplates = async () => {
    try {
      setLoadingTemplates(true);
      const response = await fetch("/api/content/job-templates");
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setJobDescriptionTemplates(data.data);
        }
      }
    } catch (error) {
      console.error("Error fetching job description templates:", error);
      toast.error("Failed to load job description templates");
    } finally {
      setLoadingTemplates(false);
    }
  };

  // Fetch skill templates
  const fetchSkillTemplates = async () => {
    try {
      const response = await fetch("/api/content/templates?type=skill");
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setSkillTemplates(data.data || []);
        }
      }
    } catch (error) {
      console.error("Error fetching skill templates:", error);
      toast.error("Failed to load skill templates");
    }
  };

  // Fetch company information
  const fetchCompanyInfo = async () => {
    if (!session?.user?.companyId) return;

    try {
      setLoadingCompany(true);
      const response = await fetch(`/api/companies/${session.user.companyId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setCompanyName(data.data.name || "");
        }
      }
    } catch (error) {
      console.error("Error fetching company info:", error);
    } finally {
      setLoadingCompany(false);
    }
  };

  // Load existing campaign data if editing
  useEffect(() => {
    const loadCampaignData = async () => {
      // Campaign data is now loaded automatically via Redis in the job campaign store
      const campaignId = state.campaignId;

      if (!campaignId) {
        // No campaign ID means we're creating a new campaign
        // Reset the store to initial state
        if (state.campaignId) {
          setCampaignId("");
          updateJobDetails({
            campaignName: "",
            jobTitle: "",
            department: "",
            location: "",
            experienceLevel: "",
            employeeType: "",
            numberOfOpenings: 1,
            salaryMin: 0,
            salaryMax: 0,
            currency: "INR",
            jobDescription: "",
            jobDuties: "",
            requirements: [],
            benefits: [],
            skills: [],
            applicationDeadline: "",
            targetHireDate: "",
            isRemote: false,
            isHybrid: false,
          });
          setIsEditMode(false);
        }
        return;
      }

      if (campaignId && campaignId !== state.campaignId) {
        try {
          setLoading(true);
          const response = await fetch(`/api/campaigns/jobs/${campaignId}`);
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.data) {
              const campaign = data.data;

              // Update the store with the loaded campaign data
              setCampaignId(campaignId);
              updateJobDetails({
                campaignName: campaign.campaignName || "",
                jobTitle: campaign.jobTitle || "",
                department: campaign.department || "",
                location: campaign.location || "",
                experienceLevel: campaign.experienceLevel || "",
                employeeType: campaign.employeeType || "",
                numberOfOpenings: campaign.numberOfOpenings || 1,
                salaryMin: campaign.salaryMin || 0,
                salaryMax: campaign.salaryMax || 0,
                currency: campaign.currency || "INR",
                jobDescription: campaign.jobDescription || "",
                jobDuties: campaign.jobDuties || "",
                requirements: (campaign as any).jobRequirements
                  ? typeof (campaign as any).jobRequirements === "string"
                    ? (campaign as any).jobRequirements
                        .split(",")
                        .map((r: string) => r.trim())
                        .filter(Boolean)
                    : (campaign as any).jobRequirements
                  : [],
                benefits: (campaign as any).jobBenefits
                  ? typeof (campaign as any).jobBenefits === "string"
                    ? (campaign as any).jobBenefits
                        .split(",")
                        .map((b: string) => b.trim())
                        .filter(Boolean)
                    : (campaign as any).jobBenefits
                  : [],
                skills: (campaign as any).requiredSkills
                  ? typeof (campaign as any).requiredSkills === "string"
                    ? (campaign as any).requiredSkills
                        .split(",")
                        .map((s: string) => s.trim())
                        .filter(Boolean)
                    : (campaign as any).requiredSkills
                  : [],
                applicationDeadline: campaign.applicationDeadline || "",
                targetHireDate: campaign.targetHireDate || "",
                isRemote: campaign.isRemote || false,
                isHybrid: campaign.isHybrid || false,
              });

              setIsEditMode(true);
              toast.success("Campaign data loaded successfully");
            }
          } else {
            console.error("Failed to load campaign data");
            toast.error("Failed to load campaign data");
            // Clear invalid campaign ID - handled by Redis store
            resetCampaign();
          }
        } catch (error) {
          console.error("Error loading campaign data:", error);
          toast.error("Error loading campaign data");
          resetCampaign(); // Clear campaign data via Redis store
        } finally {
          setLoading(false);
        }
      }
    };

    loadCampaignData();
  }, [session?.user?.companyId]);

  // Load templates and company info on mount
  useEffect(() => {
    fetchJobDescriptionTemplates();
    fetchSkillTemplates();
    fetchCompanyInfo();
  }, [session?.user?.companyId]);

  const generateWithAI = async () => {
    if (!state.jobDetails.jobTitle.trim()) {
      toast.error("Please enter a job title first");
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch("/api/ai/generate-job-duties", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jobTitle: state.jobDetails.jobTitle,
          department: state.jobDetails.department,
          experienceLevel: `${state.jobDetails.experienceMin || 0}-${state.jobDetails.experienceMax || 0} years`,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate job duties");
      }

      const data = await response.json();

      if (data.success && data.jobDuties) {
        // Convert array of job duties to formatted string
        const formattedJobDescription = Array.isArray(data.jobDuties)
          ? data.jobDuties
              .map((duty: string, index: number) => `${index + 1}. ${duty}`)
              .join("\n")
          : data.jobDuties;

        updateJobDetails({ jobDescription: formattedJobDescription });
        toast.success(
          `Job duties generated successfully! (${data.generated === "ai" ? "AI-powered" : "Template-based"})`
        );
      } else {
        throw new Error(data.message || "Failed to generate job duties");
      }
    } catch (error) {
      console.error("Error generating job duties:", error);
      toast.error("Failed to generate job duties. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadJobDescriptionPDF = async () => {
    if (!state.campaignId) {
      toast.error("Please save the job campaign first");
      return;
    }

    try {
      const response = await fetch("/api/job-description-pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          campaignId: state.campaignId,
          download: true,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate PDF");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = `${state.jobDetails.jobTitle.replace(/\s+/g, "_")}_JD.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("Job description PDF downloaded successfully!");
    } catch (error) {
      console.error("Error downloading PDF:", error);
      toast.error("Failed to download PDF. Please try again.");
    }
  };

  const handleSubmit = async () => {
    if (!session?.user?.companyId) {
      setError("User session not found");
      return;
    }

    if (!isFormValid) {
      setError("Please fill in all required fields");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Create job campaign via API
      const campaignData = {
        campaignName: state.jobDetails.campaignName,
        jobTitle: state.jobDetails.jobTitle,
        department: state.jobDetails.department,
        location: state.jobDetails.location,
        experienceLevel: `${state.jobDetails.experienceMin || 0}-${state.jobDetails.experienceMax || 0} years`,
        employeeType: state.jobDetails.employeeType,
        salaryMin: state.jobDetails.salaryMin || undefined,
        salaryMax: state.jobDetails.salaryMax || undefined,
        currency: state.jobDetails.currency,
        numberOfOpenings: state.jobDetails.numberOfOpenings,
        jobDescription: state.jobDetails.jobDescription || "",
        jobDuties: [
          (state.jobDetails.requirements || []).join(", "),
          (state.jobDetails.benefits || []).join(", "),
          (state.jobDetails.skills || []).join(", "),
        ]
          .filter(Boolean)
          .join("\n\n"),
        jobRequirements: state.jobDetails.jobRequirements,
        jobBenefits: state.jobDetails.jobBenefits,
        jobDescriptionTemplateId:
          state.jobDetails.jobDescriptionTemplateId || null,
        skillTemplateId: state.jobDetails.skillTemplateId || null,
        applicationDeadline: state.jobDetails.applicationDeadline
          ? new Date(state.jobDetails.applicationDeadline)
          : null,
        targetHireDate: state.jobDetails.targetHireDate
          ? new Date(state.jobDetails.targetHireDate)
          : null,
        isRemote: state.jobDetails.isRemote,
        isHybrid: state.jobDetails.isHybrid,
        companyId: session.user.companyId || "",
      };

      const response = await fetch("/api/campaigns/jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(campaignData),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // Update store with campaign ID and move to next step
        setCampaignId(result.data.id);
        setCurrentStep(2);

        toast.success("Job campaign created successfully!");

        // Navigate to next step with a small delay to ensure state is updated
        setTimeout(() => {
          router.push("/dashboard/job-campaign/interview-setup");
        }, 100);
      } else {
        setError(result.message || "Failed to create job campaign");
        toast.error(result.message || "Failed to create job campaign");
      }
    } catch (error) {
      console.error("Error creating job campaign:", error);
      const errorMessage = "An error occurred while creating the job campaign";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const saveDraft = () => {
    // Draft is automatically saved via Redis storage in the job campaign store
    saveToStorage();
    toast.success("Draft saved successfully!");
  };

  // Draft data is now automatically loaded via Redis in the job campaign store
  // No need for manual draft loading as it's handled by the JobCampaignProvider

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          {/* 1. Create Job Campaigns headline */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-medium text-gray-900 mb-2">
                Create Job Campaigns
              </h1>
            </div>
            <div className="flex items-center gap-3">
              {hasUnsavedChanges && (
                <div className="flex items-center gap-2 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <Info className="w-4 h-4 text-yellow-600" />
                  <span className="text-sm text-yellow-700">
                    Unsaved changes
                  </span>
                </div>
              )}
              <Badge variant="outline" className="px-3 py-1">
                <Briefcase className="w-4 h-4 mr-1" />
                Job Setup
              </Badge>
            </div>
          </div>

          {/* 2. Job Campaign Navigation */}
          <div className="mb-6">
            <JobCampaignNavigation />
          </div>

          {/* Progress indicator */}
          {isSaving && (
            <div className="mt-4">
              <div className="flex items-center gap-2 mb-2">
                <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                <span className="text-sm text-gray-600">
                  Saving campaign... {saveProgress}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-blue-600 to-purple-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${saveProgress}%` }}
                ></div>
              </div>
            </div>
          )}
        </motion.div>

        {/* Error Alert */}
        {state.error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm py-6 px-2">
            <CardContent className="space-y-6">
              {/* 3. Step indicator and progress bar */}
              <div className="pb-4 border-b border-gray-200">
                <h3 className="font-medium text-xl mb-3">Job Details</h3>
                <div className="flex gap-3 items-center flex-nowrap">
                  <p className="text-gray-600 text-nowrap">Step 1 of 4:</p>
                  <Progress value={25} className="h-1 [&>div]:bg-purple-600" />
                </div>
              </div>

              {/* Company Information */}
              {companyName && (
                <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-purple-600">
                      Company: {companyName}
                    </span>
                    {loadingCompany && (
                      <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                    )}
                  </div>
                </div>
              )}

              {/* Basic Information */}
              <div className="flex-col space-y-4">
                <div className="grid grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label
                      htmlFor="campaignName"
                      className="text-sm font-medium"
                    >
                      Campaign Name *
                    </Label>
                    <Input
                      id="campaignName"
                      placeholder="e.g., Senior Developer Hiring Q1 2024"
                      value={state.jobDetails.campaignName || ""}
                      onChange={(e) =>
                        handleInputChange("campaignName", e.target.value)
                      }
                      className={`h-11 ${
                        validationErrors.campaignName
                          ? "border-red-300 focus:ring-red-500"
                          : ""
                      }`}
                    />
                    {validationErrors.campaignName && (
                      <p className="mt-1 text-sm text-red-600 flex items-center">
                        <Info className="w-4 h-4 mr-1" />
                        {validationErrors.campaignName}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="jobTitle" className="text-sm font-medium">
                      Job Title *
                    </Label>
                    <Input
                      id="jobTitle"
                      placeholder="e.g., Senior Software Engineer"
                      value={state.jobDetails.jobTitle || ""}
                      onChange={(e) =>
                        handleInputChange("jobTitle", e.target.value)
                      }
                      className={`h-11 ${
                        validationErrors.jobTitle
                          ? "border-red-300 focus:ring-red-500"
                          : ""
                      }`}
                    />
                    {validationErrors.jobTitle && (
                      <p className="mt-1 text-sm text-red-600 flex items-center">
                        <Info className="w-4 h-4 mr-1" />
                        {validationErrors.jobTitle}
                      </p>
                    )}
                  </div>
                  {state.jobDetails.campaignType === "specific" && (
                    <div className="space-y-2">
                      <Label>
                        Application Deadline*
                      </Label>
                      <Input
                        type="date"
                        value={formatDateInput(
                          state.jobDetails.applicationDeadline ?? null
                        )}
                        onChange={(e) =>
                          handleInputChange(
                            "applicationDeadline",
                            e.target.value
                          )
                        }
                      />
                      {validationErrors.applicationDeadline && (
                        <div className="flex items-center gap-1 mt-1">
                          <Info className="w-4 h-4 mr-1 text-red-500" />
                          <span className="text-red-500 text-xs font-medium">
                            {validationErrors.applicationDeadline}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-6">
                  {state.jobDetails.campaignType === "specific" && (
                    <div className="space-y-2">
                      <Label
                        htmlFor="targetHireDate"
                        className="text-sm font-medium"
                      >
                        Target Hire Date*
                      </Label>
                      <Input
                        name="targetHireDate"
                        type="date"
                        value={state.jobDetails.targetHireDate || ""}
                        onChange={(e) =>
                          handleInputChange("targetHireDate", e.target.value)
                        }
                      />
                      {validationErrors.targetHireDate && (
                        <div className="text-red-600 text-sm mt-1 flex items-center gap-1">
                          <AlertCircle className="w-4 h-4 text-red-600" />
                          {validationErrors.targetHireDate}
                        </div>
                      )}
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="department" className="text-sm font-medium">
                      Department *
                    </Label>
                    <Select
                      value={state.jobDetails.department || ""}
                      onValueChange={(value) =>
                        handleInputChange("department", value)
                      }
                    >
                      <SelectTrigger
                        className={`h-11 ${
                          validationErrors.department
                            ? "border-red-300 focus:ring-red-500"
                            : ""
                        }`}
                      >
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map((dept) => (
                          <SelectItem key={dept} value={dept}>
                            {dept}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {validationErrors.department && (
                      <p className="mt-1 text-sm text-red-600 flex items-center">
                        <Info className="w-4 h-4 mr-1" />
                        {validationErrors.department}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="location"
                      className="text-sm font-medium flex items-center gap-1"
                    >
                      <MapPin className="w-4 h-4" />
                      Location *
                    </Label>
                    <Input
                      id="location"
                      placeholder="e.g., San Francisco, CA"
                      value={state.jobDetails.location || ""}
                      onChange={(e) =>
                        handleInputChange("location", e.target.value)
                      }
                      className={`h-11 ${
                        validationErrors.location
                          ? "border-red-300 focus:ring-red-500"
                          : ""
                      }`}
                    />
                    {validationErrors.location && (
                      <p className="mt-1 text-sm text-red-600 flex items-center">
                        <Info className="w-4 h-4 mr-1" />
                        {validationErrors.location}
                      </p>
                    )}
                  </div>
                </div>

                {/* Work Arrangement */}
                <div className="space-y-4">
                  <h4 className="text-md font-medium text-gray-900">
                    Work Arrangement
                  </h4>
                  <div className="flex items-center gap-6">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="isRemote"
                        checked={state.jobDetails.isRemote}
                        onCheckedChange={(checked) =>
                          handleInputChange("isRemote", checked)
                        }
                      />
                      <Label htmlFor="isRemote" className="text-sm font-medium">
                        Remote Work
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="isHybrid"
                        checked={state.jobDetails.isHybrid}
                        onCheckedChange={(checked) =>
                          handleInputChange("isHybrid", checked)
                        }
                      />
                      <Label htmlFor="isHybrid" className="text-sm font-medium">
                        Hybrid Work
                      </Label>
                    </div>
                  </div>
                </div>
              </div>
              <Separator />

              {/* Education & Employment */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-purple-600" />
                  Education & Employment
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      Experience Level *
                    </Label>
                    <Select
                      value={state.jobDetails.experienceLevel || ""}
                      onValueChange={(value) =>
                        handleInputChange("experienceLevel", value)
                      }
                    >
                      <SelectTrigger
                        className={`h-11 ${
                          validationErrors.experienceLevel
                            ? "border-red-300 focus:ring-red-500"
                            : ""
                        }`}
                      >
                        <SelectValue placeholder="Select level" />
                      </SelectTrigger>
                      <SelectContent>
                        {experienceLevels.map((level) => (
                          <SelectItem key={level} value={level}>
                            {level}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {validationErrors.experienceLevel && (
                      <p className="mt-1 text-sm text-red-600 flex items-center">
                        <Info className="w-4 h-4 mr-1" />
                        {validationErrors.experienceLevel}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      Employee Type *
                    </Label>
                    <Select
                      value={state.jobDetails.employeeType || ""}
                      onValueChange={(value) =>
                        handleInputChange("employeeType", value)
                      }
                    >
                      <SelectTrigger
                        className={`h-11 ${
                          validationErrors.employeeType
                            ? "border-red-300 focus:ring-red-500"
                            : ""
                        }`}
                      >
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {employeeTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {validationErrors.employeeType && (
                      <p className="mt-1 text-sm text-red-600 flex items-center">
                        <Info className="w-4 h-4 mr-1" />
                        {validationErrors.employeeType}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      Number of Openings *
                    </Label>
                    <Input
                      type="number"
                      min="1"
                      value={state.jobDetails.numberOfOpenings || 1}
                      onChange={(e) =>
                        handleInputChange(
                          "numberOfOpenings",
                          parseInt(e.target.value) || 1
                        )
                      }
                      className={`h-11 ${
                        validationErrors.numberOfOpenings
                          ? "border-red-300 focus:ring-red-500"
                          : ""
                      }`}
                    />
                    {validationErrors.numberOfOpenings && (
                      <p className="mt-1 text-sm text-red-600 flex items-center">
                        <Info className="w-4 h-4 mr-1" />
                        {validationErrors.numberOfOpenings}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-1">
                      Course/ Degree
                    </Label>
                    <Input
                      type="text"
                      min="1"
                      value={""}
                      className={`h-11 ${
                        validationErrors.course
                          ? "border-red-300 focus:ring-red-500"
                          : ""
                      }`}
                    />
                    {validationErrors.course && (
                      <p className="mt-1 text-sm text-red-600 flex items-center">
                        <Info className="w-4 h-4 mr-1" />
                        {validationErrors.numberOfOpenings}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-1">
                      Specialization
                    </Label>
                    <Input
                      type="text"
                      min="1"
                      value={""}
                      className={`h-11 ${
                        validationErrors.specialization
                          ? "border-red-300 focus:ring-red-500"
                          : ""
                      }`}
                    />
                    {validationErrors.specialization && (
                      <p className="mt-1 text-sm text-red-600 flex items-center">
                        <Info className="w-4 h-4 mr-1" />
                        {validationErrors.specialization}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <Separator />

              {/* Salary Range */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <CircleDollarSign className="w-5 h-5 text-purple-600" />
                  Salary Range
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Currency</Label>
                    <Select
                      value={state.jobDetails.currency || "INR"}
                      onValueChange={(value) =>
                        handleInputChange("currency", value)
                      }
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Select currency" />
                      </SelectTrigger>
                      <SelectContent>
                        {CURRENCIES.map((currency) => (
                          <SelectItem key={currency.code} value={currency.code}>
                            {currency.code} - {currency.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      Minimum Salary ({state.jobDetails.currency})
                    </Label>
                    <Input
                      type="number"
                      placeholder="e.g., 80000"
                      value={state.jobDetails.salaryMin || ""}
                      onChange={(e) =>
                        handleInputChange(
                          "salaryMin",
                          e.target.value ? parseInt(e.target.value) : undefined
                        )
                      }
                      className={`h-11 ${
                        validationErrors.salaryMin
                          ? "border-red-300 focus:ring-red-500"
                          : ""
                      }`}
                      disabled={!state.jobDetails.salaryNegotiable}
                    />
                    {validationErrors.salaryMin && (
                      <p className="mt-1 text-sm text-red-600 flex items-center">
                        <Info className="w-4 h-4 mr-1" />
                        {validationErrors.salaryMin}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      Maximum Salary ({state.jobDetails.currency})
                    </Label>
                    <Input
                      type="number"
                      placeholder="e.g., 120000"
                      value={state.jobDetails.salaryMax || ""}
                      onChange={(e) =>
                        handleInputChange(
                          "salaryMax",
                          e.target.value ? parseInt(e.target.value) : undefined
                        )
                      }
                      className={`h-11 ${
                        validationErrors.salaryMax
                          ? "border-red-300 focus:ring-red-500"
                          : ""
                      }`}
                      disabled={!state.jobDetails.salaryNegotiable}
                    />
                    {validationErrors.salaryMax && (
                      <p className="mt-1 text-sm text-red-600 flex items-center">
                        <Info className="w-4 h-4 mr-1" />
                        {validationErrors.salaryMax}
                      </p>
                    )}
                  </div>
                </div>

                {/* Salary Negotiable Toggle */}
                <div className="flex items-center space-x-2 pt-2">
                  <Switch
                    id="salaryNegotiable"
                    checked={state.jobDetails.salaryNegotiable || false}
                    onCheckedChange={(checked) =>
                      handleInputChange("salaryNegotiable", checked)
                    }
                  />
                  <Label
                    htmlFor="salaryNegotiable"
                    className="text-sm font-medium"
                  >
                    Salary is negotiable
                  </Label>
                </div>
              </div>

              <Separator />

              {/* Job Description */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-purple-600" />
                  Job Description
                </h3>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      Job Description Template
                    </Label>
                    <Select
                      value={selectedTemplate}
                      onValueChange={(value) => {
                        setSelectedTemplate(value);
                        const template = jobDescriptionTemplates.find(
                          (t) => t.id === value
                        );
                        if (template && template.templateContent) {
                          updateJobDetails({
                            jobDescription: template.templateContent,
                          });
                        }
                      }}
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue
                          placeholder={
                            loadingTemplates
                              ? "Loading templates..."
                              : "Choose a template"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {jobDescriptionTemplates.map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.templateName}
                          </SelectItem>
                        ))}
                        <SelectItem value="custom">Custom Template</SelectItem>
                      </SelectContent>
                    </Select>

                    {selectedTemplate && (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setShowTemplatePreview(!showTemplatePreview)
                          }
                        >
                          {showTemplatePreview ? "Hide" : "Show"} Preview
                        </Button>
                        <Button variant="outline" size="sm">
                          Manage Templates
                        </Button>
                      </div>
                    )}

                    {showTemplatePreview &&
                      selectedTemplate &&
                      selectedTemplate !== "custom" && (
                        <div className="p-3 bg-gray-50 rounded-lg border">
                          <p className="text-sm text-gray-600">
                            {jobDescriptionTemplates.find(
                              (t) => t.id === selectedTemplate
                            )?.templateContent ||
                              "Template preview not available"}
                          </p>
                        </div>
                      )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">
                        Job Duties & Responsibilities
                      </Label>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={generateWithAI}
                          disabled={isGenerating || !state.jobDetails.jobTitle}
                          className="flex items-center gap-1"
                        >
                          <Sparkles className="w-4 h-4" />
                          {isGenerating ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Generating...
                            </>
                          ) : (
                            <>Generate With AI</>
                          )}
                        </Button>
                        {state.campaignId && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={downloadJobDescriptionPDF}
                            className="flex items-center gap-1"
                          >
                            <Download className="w-4 h-4" />
                            Download PDF
                          </Button>
                        )}
                        <Button variant="outline" size="sm">
                          Customize
                        </Button>
                      </div>
                    </div>
                    <Textarea
                      placeholder="Enter job duties and responsibilities..."
                      value={state.jobDetails.jobDescription || ""}
                      onChange={(e) => {
                        updateJobDetails({ jobDescription: e.target.value });
                      }}
                      className={`min-h-[120px] resize-none ${
                        validationErrors.jobDescription
                          ? "border-red-300 focus:ring-red-500"
                          : ""
                      }`}
                    />
                    {validationErrors.jobDescription && (
                      <p className="mt-1 text-sm text-red-600 flex items-center">
                        <Info className="w-4 h-4 mr-1" />
                        {validationErrors.jobDescription}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex items-center justify-between mt-8"
        >
          <Button
            variant="outline"
            onClick={() => router.push("/dashboard")}
            className="flex items-center gap-2"
          >
            <X className="w-4 h-4" />
            Cancel
          </Button>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={saveDraft}
              className="flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Save as Draft
            </Button>

            <Button
              onClick={handleContinue}
              disabled={!isFormValidMemo || isSaving}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {saveProgress > 0 && (
                    <span className="ml-2">{saveProgress}%</span>
                  )}
                  Saving...
                </>
              ) : (
                <>
                  Continue to Interview Setup
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>

            {/* Validation errors display */}
            {!isFormValidMemo && (
              <div className="mt-2">
                {Object.keys(validationErrors).length > 0 ? (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm font-medium text-red-800 mb-2">
                      Please fix the following errors:
                    </p>
                    <ul className="text-sm text-red-700 space-y-1">
                      {Object.entries(validationErrors).map(
                        ([field, error]) => (
                          <li key={field} className="flex items-center gap-2">
                            <span className="w-2 h-2 bg-red-400 rounded-full"></span>
                            <span className="font-medium capitalize">
                              {field.replace(/([A-Z])/g, " $1")}:
                            </span>{" "}
                            {error}
                          </li>
                        )
                      )}
                    </ul>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // Trigger validation to show errors
                      console.log("Current form data:", {
                        campaignName: state.jobDetails.campaignName,
                        jobTitle: state.jobDetails.jobTitle,
                        department: state.jobDetails.department,
                        location: state.jobDetails.location,
                        experienceLevel: state.jobDetails.experienceLevel,
                        employeeType: state.jobDetails.employeeType,
                        numberOfOpenings: state.jobDetails.numberOfOpenings,
                        salaryMin: state.jobDetails.salaryMin,
                        salaryMax: state.jobDetails.salaryMax,
                        jobDescription: state.jobDetails.jobDescription,
                        jobDuties: state.jobDetails.jobDuties,
                        requirements: state.jobDetails.requirements,
                        applicationDeadline:
                          state.jobDetails.applicationDeadline,
                        targetHireDate: state.jobDetails.targetHireDate,
                        benefits: state.jobDetails.benefits,
                        skills: state.jobDetails.skills,
                      });
                      const isValid = validateForm();
                      console.log("Validation result:", isValid);
                      console.log("Validation errors:", validationErrors);
                    }}
                    className="text-red-600 border-red-200 hover:bg-red-50"
                  >
                    <Info className="w-4 h-4 mr-2" />
                    Show what's missing
                  </Button>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
