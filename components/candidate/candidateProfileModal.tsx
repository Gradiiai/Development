"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/shared/dialog";
import { Button } from "@/components/ui/shared/button";
import { Badge } from "@/components/ui/shared/badge";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/shared/avatar";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/shared/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/shared/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/shared/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Mail,
  Phone,
  MapPin,
  Calendar,
  Briefcase,
  GraduationCap,
  Award,
  Code,
  ExternalLink,
  Download,
  Star,
  TrendingUp,
  Building,
  Clock,
  Globe,
  Github,
  Linkedin,
  FileText,
  User,
  Target,
} from "lucide-react";
import { toast } from "sonner";
import CircularProgress from "@/components/admin/CircularProgress";

interface ParsedResumeData {
  personalInfo: {
    name: string;
    email: string;
    phone?: string;
    location?: string;
    linkedin?: string;
    github?: string;
    portfolio?: string;
  };
  summary?: string;
  experience: Array<{
    company: string;
    position: string;
    startDate: string;
    endDate: string;
    description: string;
    technologies?: string[];
  }>;
  education: Array<{
    institution: string;
    degree: string;
    field: string;
    graduationYear: string;
    gpa?: string;
  }>;
  skills: {
    technical: string[];
    soft: string[];
    languages: string[];
    frameworks: string[];
    tools: string[];
  };
  certifications: Array<{
    name: string;
    issuer: string;
    date: string;
    expiryDate?: string;
  }>;
  projects: Array<{
    name: string;
    description: string;
    technologies: string[];
    url?: string;
  }>;
  totalExperience: number;
}

interface CandidateProfileData {
  id: string;
  name: string;
  email: string;
  phone?: string;
  location?: string;
  experience?: string;
  skills?: string[];
  status: string;
  appliedDate: string;
  resumeUrl?: string;
  campaignId: string;
  talentFitScore?: number;
  overallScore?: number;
  source?: string;
  parsedResumeData?: string;
  currentCompany?: string;
  currentRole?: string;
  expectedCTC?: string;
  noticePeriod?: string;
  education?: string;
}

interface CandidateProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidateId: string;
}

export default function CandidateProfileModal({
  isOpen,
  onClose,
  candidateId,
}: CandidateProfileModalProps) {
  const [candidate, setCandidate] = useState<CandidateProfileData | null>(null);
  const [parsedData, setParsedData] = useState<ParsedResumeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("experience");

  useEffect(() => {
    if (isOpen && candidateId) {
      fetchCandidateProfile();
    }
  }, [isOpen, candidateId]);

  const fetchCandidateProfile = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/candidates/${candidateId}`);

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setCandidate(data.data);

          // Parse the resume data if available
          if (data.data.parsedResumeData) {
            try {
              const parsed = JSON.parse(data.data.parsedResumeData);
              setParsedData(parsed);
            } catch (error) {
              console.error("Error parsing resume data:", error);
            }
          }
        } else {
          toast.error(data.error || "Failed to fetch candidate profile");
        }
      } else {
        toast.error("Failed to fetch candidate profile");
      }
    } catch (error) {
      console.error("Error fetching candidate profile:", error);
      toast.error("Failed to fetch candidate profile");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "applied":
        return "bg-blue-100 text-blue-800";
      case "screening":
        return "bg-yellow-100 text-yellow-800";
      case "interview":
        return "bg-purple-100 text-purple-800";
      case "hired":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      case "shortlisted":
        return "bg-indigo-100 text-indigo-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  const calculateExperience = (startDate: string, endDate: string) => {
    try {
      const start = new Date(startDate);
      const end =
        endDate.toLowerCase() === "present" ? new Date() : new Date(endDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffYears = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 365));
      return diffYears;
    } catch {
      return 0;
    }
  };

  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogTitle className="sr-only">
            Loading Candidate Profile
          </DialogTitle>
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading candidate profile...</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!candidate) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl">
          <DialogTitle className="sr-only">Candidate Not Found</DialogTitle>
          <div className="text-center p-8">
            <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Candidate Not Found
            </h3>
            <p className="text-gray-600">Unable to load candidate profile.</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const personalInfo = parsedData?.personalInfo || {
    name: candidate.name,
    email: candidate.email,
    phone: candidate.phone,
    location: candidate.location,
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[95vh] flex flex-col overflow-hidden">
        <DialogHeader className="">
          <DialogTitle className="text-2xl font-bold">
            Candidate Profile
          </DialogTitle>
        </DialogHeader>

        {/* Header Section - Static */}
        <div className="border border-gray-200 rounded-lg p-5 mb-6">
          <div className="flex justify-between items-start gap-4">
            <div className="flex flex-col justify-start">
              {/* Left Side */}
              <div className="flex items-center">
                {/* Avatar */}
                <Avatar className="h-10 w-10 mr-3">
                  <AvatarImage
                    src={`https://api.dicebear.com/7.x/initials/svg?seed=${personalInfo.name}`}
                  />
                  <AvatarFallback className="text-lg">
                    {personalInfo.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {/* Info */}
                <div className="flex flex-col">
                  {/* Name and badges */}
                  <div className="flex items-center flex-wrap gap-2">
                    <h2 className="text-lg font-semibold text-gray-900">
                      {personalInfo.name}
                    </h2>
                    <Badge className="bg-blue-100 text-blue-700 font-medium">
                      {candidate.status}
                    </Badge>
                    {candidate.source && (
                      <Badge variant="outline" className="text-xs capitalize">
                        {candidate.source.replace("_", " ")}
                      </Badge>
                    )}
                  </div>
                  {/* Role and Company */}
                  {candidate.currentRole && candidate.currentCompany && (
                    <div className="flex items-center gap-1 text-sm text-gray-700 mb-1 mt-1">
                      <Briefcase className="h-4 w-4 text-gray-500" />
                      <span className="font-medium">
                        {candidate.currentRole}
                      </span>
                      <span className="text-gray-500">at</span>
                      <span className="font-medium">
                        {candidate.currentCompany}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-2">
                {/* Email, Location, Applied */}
                <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-2">
                  <div className="flex items-center gap-1">
                    <Mail className="h-4 w-4" />
                    <span>{personalInfo.email}</span>
                  </div>
                  {personalInfo.location && (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      <span>{personalInfo.location}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>Applied {formatDate(candidate.appliedDate)}</span>
                  </div>
                </div>
              </div>

              {/* Summary */}
              {(parsedData?.summary || candidate.experience) && (
                <div className="mt-4">
                  <h3 className="text-sm font-bold text-gray-700 mb-1">
                    Summary
                  </h3>
                  <p className="text-gray-700 leading-relaxed text-wrap text-justify">
                    {parsedData?.summary ||
                      candidate.experience ||
                      "No professional summary available"}
                  </p>
                </div>
              )}

              {/* Skills as small pills divided into categories */}
              <div className="mt-6">
                <h3 className="text-sm font-bold text-gray-700 mb-2">
                  Skills Matched
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {parsedData?.skills ? (
                    [
                      ...(parsedData.skills.technical || []),
                      ...(parsedData.skills.frameworks || []),
                    ]
                      .slice(0, 7)
                      .map((skill, index) => (
                        <div key={skill} className="flex items-center gap-2">
                          <span
                            className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-800 rounded-full"
                            style={{
                              backgroundColor: [
                                "#FFF5DC",
                                "#FFDEE3",
                                "#D9FFFC",
                              ][index % 3],
                            }}
                          >
                            {skill}
                          </span>
                          <div className="flex-1 bg-gray-200 rounded-full h-1">
                            <div
                              className="bg-purple-600 h-1 rounded-full"
                              style={{
                                width: `${Math.floor(Math.random() * (100 - 50 + 1)) + 50}%`,
                              }}
                            ></div>
                          </div>
                        </div>
                      ))
                  ) : (
                    <span className="text-sm text-gray-600">
                      No skills found
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Right Side: Talent Fit Score */}
            {candidate.talentFitScore && (
              <div className="mx-5">
                <CircularProgress score={candidate.talentFitScore} />
              </div>
            )}

            <div className="flex-col justify-end items-center">
              {/* Download Resume */}
              <div className="flex items-center gap-2 mt-4 md:mt-0">
                {candidate.resumeUrl && (
                  <Button variant="outline" size="sm" asChild>
                    <a
                      href={candidate.resumeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Download className="h-4 w-4 mr-1" />
                    </a>
                  </Button>
                )}

                <Select value={candidate.status}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scheduled">
                      Scheduled Interview
                    </SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="applied">Applied</SelectItem>
                    <SelectItem value="screening">Screening</SelectItem>
                    <SelectItem value="shortlisted">Shortlisted</SelectItem>
                    <SelectItem value="interview">Interviewed</SelectItem>
                    <SelectItem value="hired">Hired</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Quick Stats like total experience, notice period, expected CTC, etc. */}
              <div className="mt-4 bg-gray-200 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2">
                  Quick Stats
                </h3>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600">
                      Total Experience: {candidate.experience || "N/A"} years
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600">
                      Notice Period: {candidate.noticePeriod || "N/A"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600">
                      Expected CTC: {candidate.expectedCTC || "N/A"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600">
                      Current City: {personalInfo.location || "N/A"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs Section - Scrollable */}
        <div className="flex-1 overflow-y-auto scroll">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4 sticky top-0 z-10">
              <TabsTrigger value="experience">Experience</TabsTrigger>
              <TabsTrigger value="education">Education</TabsTrigger>
              <TabsTrigger value="skills">Skills</TabsTrigger>
              <TabsTrigger value="projects">Projects</TabsTrigger>
            </TabsList>

            {/* Experience Tab */}
            <TabsContent value="experience" className="space-y-4">
              {parsedData?.experience && parsedData.experience.length > 0 ? (
                parsedData.experience.map((exp, index) => (
                  <Card key={index}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="text-lg font-semibold">
                            {exp.position}
                          </h3>
                          <div className="flex items-center gap-2 text-gray-600">
                            <Building className="h-4 w-4" />
                            <span className="font-medium">{exp.company}</span>
                          </div>
                        </div>
                        <div className="text-right text-sm text-gray-500">
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            <span>
                              {formatDate(exp.startDate)} -{" "}
                              {exp.endDate === "present"
                                ? "Present"
                                : formatDate(exp.endDate)}
                            </span>
                          </div>
                          <div className="mt-1">
                            {calculateExperience(exp.startDate, exp.endDate)}{" "}
                            year(s)
                          </div>
                        </div>
                      </div>
                      <p className="text-gray-700 mb-3">{exp.description}</p>
                      {exp.technologies && exp.technologies.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {exp.technologies.map((tech, techIndex) => (
                            <Badge
                              key={techIndex}
                              variant="outline"
                              className="text-xs"
                            >
                              {tech}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Briefcase className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No Experience Data
                    </h3>
                    <p className="text-gray-600">
                      Experience information not available in parsed resume
                      data.
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Education Tab */}
            <TabsContent value="education" className="space-y-4">
              {parsedData?.education && parsedData.education.length > 0 ? (
                parsedData.education.map((edu, index) => (
                  <Card key={index}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-lg font-semibold">
                            {edu.degree}
                          </h3>
                          <p className="text-gray-600 font-medium">
                            {edu.field}
                          </p>
                          <div className="flex items-center gap-2 text-gray-500 mt-1">
                            <GraduationCap className="h-4 w-4" />
                            <span>{edu.institution}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-semibold text-blue-600">
                            {edu.graduationYear}
                          </div>
                          {edu.gpa && (
                            <div className="text-sm text-gray-500">
                              GPA: {edu.gpa}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <GraduationCap className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No Education Data
                    </h3>
                    <p className="text-gray-600">
                      Education information not available in parsed resume data.
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Skills Tab */}
            <TabsContent value="skills" className="space-y-6">
              {parsedData?.skills ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Technical Skills */}
                  {parsedData.skills.technical.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Code className="h-5 w-5" />
                          Technical Skills
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-2">
                          {parsedData.skills.technical.map((skill, index) => (
                            <Badge key={index} variant="secondary">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Frameworks */}
                  {parsedData.skills.frameworks.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">
                          Frameworks & Libraries
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-2">
                          {parsedData.skills.frameworks.map(
                            (framework, index) => (
                              <Badge key={index} variant="outline">
                                {framework}
                              </Badge>
                            )
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Tools */}
                  {parsedData.skills.tools.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">
                          Tools & Technologies
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-2">
                          {parsedData.skills.tools.map((tool, index) => (
                            <Badge key={index} variant="outline">
                              {tool}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Soft Skills */}
                  {parsedData.skills.soft.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Soft Skills</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-2">
                          {parsedData.skills.soft.map((skill, index) => (
                            <Badge
                              key={index}
                              className="bg-green-100 text-green-800"
                            >
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Languages */}
                  {parsedData.skills.languages.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Languages</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-2">
                          {parsedData.skills.languages.map(
                            (language, index) => (
                              <Badge
                                key={index}
                                className="bg-blue-100 text-blue-800"
                              >
                                {language}
                              </Badge>
                            )
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Code className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No Skills Data
                    </h3>
                    <p className="text-gray-600">
                      Skills information not available in parsed resume data.
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Projects Tab */}
            <TabsContent value="projects" className="space-y-4">
              {parsedData?.projects && parsedData.projects.length > 0 ? (
                parsedData.projects.map((project, index) => (
                  <Card key={index}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-lg font-semibold">
                              {project.name}
                            </h3>
                            {project.url && (
                              <Button variant="outline" size="sm" asChild>
                                <a
                                  href={project.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              </Button>
                            )}
                          </div>
                          <p className="text-gray-700 mb-3">
                            {project.description}
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {project.technologies.map((tech, techIndex) => (
                              <Badge
                                key={techIndex}
                                variant="outline"
                                className="text-xs"
                              >
                                {tech}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No Projects Data
                    </h3>
                    <p className="text-gray-600">
                      Project information not available in parsed resume data.
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
