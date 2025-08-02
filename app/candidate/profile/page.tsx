"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/shared/card";
import { Button } from "@/components/ui/shared/button";
import { Input } from "@/components/ui/shared/input";
import { Label } from "@/components/ui/shared/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/shared/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/shared/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/shared/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/shared/dialog";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  GraduationCap,
  Award,
  Globe,
  Github,
  Linkedin,
  Upload,
  Download,
  Edit,
  Plus,
  X,
  Save,
  Camera,
  FileText,
  Calendar,
  Building2,
  Star,
  Loader2,
} from "lucide-react";
import { useToast } from "@/shared/hooks/use-toast";
import { format } from "date-fns";

interface CandidateProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  location?: string;
  title?: string;
  summary?: string;
  avatar?: string;
  resumeUrl?: string;
  portfolioUrl?: string;
  githubUrl?: string;
  linkedinUrl?: string;
  website?: string;
  experience: Experience[];
  education: Education[];
  skills: Skill[];
  certifications: Certification[];
  languages: Language[];
  preferences: {
    jobTypes: string[];
    locations: string[];
    salaryRange: {
      min: number;
      max: number;
      currency: string;
    };
    remoteWork: boolean;
    availability: string;
    noticePeriod: string;
  };
}

interface Experience {
  id: string;
  title: string;
  company: string;
  location: string;
  startDate: Date;
  endDate?: Date;
  current: boolean;
  description: string;
  technologies: string[];
}

interface Education {
  id: string;
  degree: string;
  institution: string;
  location: string;
  startDate: Date;
  endDate?: Date;
  gpa?: string;
  description?: string;
}

interface Skill {
  id: string;
  name: string;
  level: "beginner" | "intermediate" | "advanced" | "expert";
  category: string;
}

interface Certification {
  id: string;
  name: string;
  issuer: string;
  issueDate: Date;
  expiryDate?: Date;
  credentialId?: string;
  url?: string;
}

interface Language {
  id: string;
  name: string;
  proficiency: "basic" | "conversational" | "fluent" | "native";
}

// Default empty profile structure
const defaultProfile: CandidateProfile = {
  id: "",
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  location: "",
  title: "",
  summary: "",
  githubUrl: "",
  linkedinUrl: "",
  website: "",
  experience: [],
  education: [],
  skills: [],
  certifications: [],
  languages: [],
  preferences: {
    jobTypes: [],
    locations: [],
    salaryRange: {
      min: 0,
      max: 0,
      currency: "USD",
    },
    remoteWork: false,
    availability: "",
    noticePeriod: "",
  },
};

const skillLevels = {
  beginner: { label: "Beginner", color: "bg-gray-100 text-gray-800" },
  intermediate: { label: "Intermediate", color: "bg-blue-100 text-blue-800" },
  advanced: { label: "Advanced", color: "bg-green-100 text-green-800" },
  expert: { label: "Expert", color: "bg-purple-100 text-purple-800" },
};

const languageProficiency = {
  basic: { label: "Basic", color: "bg-gray-100 text-gray-800" },
  conversational: { label: "Conversational", color: "bg-blue-100 text-blue-800" },
  fluent: { label: "Fluent", color: "bg-green-100 text-green-800" },
  native: { label: "Native", color: "bg-purple-100 text-purple-800" },
};

// Helper function to generate temporary IDs
const generateTempId = () => `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export default function CandidateProfile() {
  const { data: session } = useSession();
  const [profile, setProfile] = useState<CandidateProfile>(defaultProfile);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const [editingExperience, setEditingExperience] = useState<Experience | null>(null);
  const [editingEducation, setEditingEducation] = useState<Education | null>(null);
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);
  const [editingCertification, setEditingCertification] = useState<Certification | null>(null);

  // Fetch profile data
  const fetchProfile = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/candidates/profile');
      if (!response.ok) {
        throw new Error('Failed to fetch profile');
      }
      const data = await response.json();
      setProfile(data);
      setError(null);
    } catch (error) {
      console.error('Error fetching profile:', error);
      setError('Failed to load profile');
      toast({
        title: "Error",
        description: "Failed to load profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Save profile data
  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/candidates/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profile),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update profile');
      }
      
      const updatedProfile = await response.json();
      setProfile(updatedProfile);
      
      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated.",
      });
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileUpload = async (type: "resume" | "avatar", file: File) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);
      
      const response = await fetch('/api/candidates/documents/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Failed to upload file');
      }
      
      const data = await response.json();
      
      // Update profile with new file URL
      if (type === 'resume') {
        setProfile(prev => ({ ...prev, resumeUrl: data.url }));
      } else if (type === 'avatar') {
        setProfile(prev => ({ ...prev, avatar: data.url }));
      }
      
      toast({
        title: "File uploaded",
        description: `Your ${type} has been uploaded successfully.`,
      });
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: "Error",
        description: `Failed to upload ${type}. Please try again.`,
        variant: "destructive",
      });
    }
  };

  const triggerFileUpload = (type: "resume" | "avatar") => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = type === 'resume' ? '.pdf,.doc,.docx' : 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        handleFileUpload(type, file);
      }
    };
    input.click();
  };

  // Load profile on component mount
  useEffect(() => {
    if (session?.user) {
      fetchProfile();
    }
  }, [session]);

  const calculateProfileCompletion = () => {
    let completed = 0;
    let total = 10;
    
    if (profile.firstName && profile.lastName) completed++;
    if (profile.email) completed++;
    if (profile.phone) completed++;
    if (profile.location) completed++;
    if (profile.title) completed++;
    if (profile.summary) completed++;
    if (profile.experience.length > 0) completed++;
    if (profile.education.length > 0) completed++;
    if (profile.skills && Array.isArray(profile.skills) && profile.skills.length > 0) completed++;
    if (profile.resumeUrl) completed++;
    
    return Math.round((completed / total) * 100);
  };

  const completionPercentage = calculateProfileCompletion();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
          <p className="text-gray-600 mt-1">
            Manage your personal information and preferences
          </p>
        </div>
        <Button
          onClick={isEditing ? handleSaveProfile : () => setIsEditing(true)}
          disabled={isSaving || isLoading}
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : isEditing ? (
            <Save className="w-4 h-4 mr-2" />
          ) : (
            <Edit className="w-4 h-4 mr-2" />
          )}
          {isEditing ? "Save Changes" : "Edit Profile"}
        </Button>
      </div>

      {/* Profile Completion */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Profile Completion</span>
            <span className="text-sm font-medium text-gray-900">{completionPercentage}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
          {completionPercentage < 100 && (
            <p className="text-xs text-gray-600 mt-2">
              Complete your profile to increase your visibility to recruiters
            </p>
          )}
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="experience">Experience</TabsTrigger>
          <TabsTrigger value="education">Education</TabsTrigger>
          <TabsTrigger value="skills">Skills</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Basic Information */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input
                        id="firstName"
                        value={profile.firstName}
                        onChange={(e) => setProfile(prev => ({ ...prev, firstName: e.target.value }))}
                        disabled={!isEditing}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        value={profile.lastName}
                        onChange={(e) => setProfile(prev => ({ ...prev, lastName: e.target.value }))}
                        disabled={!isEditing}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="title">Professional Title</Label>
                    <Input
                      id="title"
                      value={profile.title || ""}
                      onChange={(e) => setProfile(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="e.g., Senior Frontend Developer"
                      disabled={!isEditing}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={profile.email}
                      onChange={(e) => setProfile(prev => ({ ...prev, email: e.target.value }))}
                      disabled={!isEditing}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        value={profile.phone || ""}
                        onChange={(e) => setProfile(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="+1 (555) 123-4567"
                        disabled={!isEditing}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="location">Location</Label>
                      <Input
                        id="location"
                        value={profile.location || ""}
                        onChange={(e) => setProfile(prev => ({ ...prev, location: e.target.value }))}
                        placeholder="City, State/Country"
                        disabled={!isEditing}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="summary">Professional Summary</Label>
                    <Textarea
                      id="summary"
                      value={profile.summary || ""}
                      onChange={(e) => setProfile(prev => ({ ...prev, summary: e.target.value }))}
                      placeholder="Brief description of your professional background and goals..."
                      rows={4}
                      disabled={!isEditing}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Profile Picture and Links */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Profile Picture</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <div className="relative inline-block">
                    <div className="w-32 h-32 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      {profile.avatar ? (
                        <img
                          src={profile.avatar}
                          alt="Profile"
                          className="w-32 h-32 rounded-full object-cover"
                        />
                      ) : (
                        <User className="w-16 h-16 text-gray-400" />
                      )}
                    </div>
                    {isEditing && (
                      <Button
                        size="sm"
                        className="absolute bottom-0 right-0 rounded-full"
                        onClick={() => triggerFileUpload("avatar")}
                      >
                        <Camera className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  {isEditing && (
                    <Button variant="outline" size="sm" onClick={() => triggerFileUpload("avatar")}>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Photo
                    </Button>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Resume & Documents</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Resume</span>
                    {profile.resumeUrl ? (
                      <div className="flex space-x-2">
                        <Button size="sm" variant="outline">
                          <Download className="w-4 h-4 mr-1" />
                          Download
                        </Button>
                        {isEditing && (
                          <Button size="sm" onClick={() => triggerFileUpload("resume")}>
                            <Upload className="w-4 h-4 mr-1" />
                            Update
                          </Button>
                        )}
                      </div>
                    ) : (
                      <Button size="sm" onClick={() => triggerFileUpload("resume")}>
                        <Upload className="w-4 h-4 mr-1" />
                        Upload
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Social Links</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="linkedin">LinkedIn</Label>
                    <div className="flex">
                      <div className="flex items-center px-3 bg-gray-50 border border-r-0 rounded-l-md">
                        <Linkedin className="w-4 h-4 text-gray-400" />
                      </div>
                      <Input
                        id="linkedin"
                        value={profile.linkedinUrl || ""}
                        onChange={(e) => setProfile(prev => ({ ...prev, linkedinUrl: e.target.value }))}
                        placeholder="https://linkedin.com/in/username"
                        className="rounded-l-none"
                        disabled={!isEditing}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="github">GitHub</Label>
                    <div className="flex">
                      <div className="flex items-center px-3 bg-gray-50 border border-r-0 rounded-l-md">
                        <Github className="w-4 h-4 text-gray-400" />
                      </div>
                      <Input
                        id="github"
                        value={profile.githubUrl || ""}
                        onChange={(e) => setProfile(prev => ({ ...prev, githubUrl: e.target.value }))}
                        placeholder="https://github.com/username"
                        className="rounded-l-none"
                        disabled={!isEditing}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="website">Portfolio/Website</Label>
                    <div className="flex">
                      <div className="flex items-center px-3 bg-gray-50 border border-r-0 rounded-l-md">
                        <Globe className="w-4 h-4 text-gray-400" />
                      </div>
                      <Input
                        id="website"
                        value={profile.website || ""}
                        onChange={(e) => setProfile(prev => ({ ...prev, website: e.target.value }))}
                        placeholder="https://yourwebsite.com"
                        className="rounded-l-none"
                        disabled={!isEditing}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Experience Tab */}
        <TabsContent value="experience" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Work Experience</CardTitle>
              <Button onClick={() => setEditingExperience({} as Experience)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Experience
              </Button>
            </CardHeader>
            <CardContent>
              {profile.experience.length === 0 ? (
                <div className="text-center py-8">
                  <Briefcase className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No experience added</h3>
                  <p className="text-gray-600 mb-4">Add your work experience to showcase your background</p>
                  <Button onClick={() => setEditingExperience({ id: generateTempId() } as Experience)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Experience
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {profile.experience.map((exp, index) => (
                      <div key={exp.id || `exp-${index}`} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg">{exp.title}</h3>
                            <p className="text-gray-600 font-medium">{exp.company}</p>
                            <p className="text-sm text-gray-500">{exp.location}</p>
                            <p className="text-sm text-gray-500">
                              {format(exp.startDate, "MMM yyyy")} - {exp.current ? "Present" : format(exp.endDate!, "MMM yyyy")}
                            </p>
                            <p className="text-gray-700 mt-2">{exp.description}</p>
                            {exp.technologies.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {exp.technologies.map((tech, index) => (
                                  <Badge key={index} variant="secondary" className="text-xs">
                                    {tech}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingExperience(exp)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Education Tab */}
          <TabsContent value="education" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Education</CardTitle>
                <Button onClick={() => setEditingEducation({ id: generateTempId() } as Education)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Education
              </Button>
            </CardHeader>
            <CardContent>
              {profile.education.length === 0 ? (
                <div className="text-center py-8">
                  <GraduationCap className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No education added</h3>
                  <p className="text-gray-600 mb-4">Add your educational background</p>
                  <Button onClick={() => setEditingEducation({} as Education)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Education
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {profile.education.map((edu, index) => (
                    <div key={edu.id || `edu-${index}`} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">{edu.degree}</h3>
                          <p className="text-gray-600 font-medium">{edu.institution}</p>
                          <p className="text-sm text-gray-500">{edu.location}</p>
                          <p className="text-sm text-gray-500">
                            {format(edu.startDate, "MMM yyyy")} - {edu.endDate ? format(edu.endDate, "MMM yyyy") : "Present"}
                          </p>
                          {edu.gpa && (
                            <p className="text-sm text-gray-600">GPA: {edu.gpa}</p>
                          )}
                          {edu.description && (
                            <p className="text-gray-700 mt-2">{edu.description}</p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingEducation(edu)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Skills Tab */}
        <TabsContent value="skills" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Technical Skills</CardTitle>
                <Button onClick={() => setEditingSkill({ id: generateTempId() } as Skill)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Skill
                </Button>
              </CardHeader>
              <CardContent>
                {(!profile.skills || !Array.isArray(profile.skills) || profile.skills.length === 0) ? (
                <div className="text-center py-8">
                  <Award className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No skills added</h3>
                  <p className="text-gray-600 mb-4">Add your technical skills and expertise</p>
                  <Button onClick={() => setEditingSkill({ id: generateTempId() } as Skill)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Skill
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {Object.entries(
                    (profile.skills || []).reduce((acc, skill) => {
                      if (!acc[skill.category]) acc[skill.category] = [];
                      acc[skill.category].push(skill);
                      return acc;
                    }, {} as Record<string, Skill[]>)
                  ).map(([category, skills]) => (
                      <div key={category}>
                        <h4 className="font-medium text-gray-900 mb-2">{category}</h4>
                        <div className="flex flex-wrap gap-2">
                          {skills.map((skill, index) => (
                            <Badge
                              key={skill.id || `skill-${index}`}
                              className={skillLevels[skill.level].color}
                              onClick={() => setEditingSkill(skill)}
                            >
                              {skill.name} • {skillLevels[skill.level].label}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Certifications</CardTitle>
                  <Button onClick={() => setEditingCertification({ id: generateTempId() } as Certification)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Certification
                  </Button>
                </CardHeader>
                <CardContent>
                  {profile.certifications.length === 0 ? (
                    <div className="text-center py-4">
                      <Award className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">No certifications added</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {profile.certifications.map((cert, index) => (
                        <div key={cert.id || `cert-${index}`} className="border rounded-lg p-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium">{cert.name}</h4>
                              <p className="text-sm text-gray-600">{cert.issuer}</p>
                              <p className="text-xs text-gray-500">
                                {format(cert.issueDate, "MMM yyyy")}
                                {cert.expiryDate && ` - ${format(cert.expiryDate, "MMM yyyy")}`}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingCertification(cert)}
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Languages</CardTitle>
                </CardHeader>
                <CardContent>
                  {profile.languages.length === 0 ? (
                    <div className="text-center py-4">
                      <Globe className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">No languages added</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {profile.languages.map((lang, index) => (
                        <div key={lang.id || `lang-${index}`} className="flex items-center justify-between">
                          <span className="font-medium">{lang.name}</span>
                          <Badge className={languageProficiency[lang.proficiency].color}>
                            {languageProficiency[lang.proficiency].label}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Preferences Tab */}
        <TabsContent value="preferences" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Job Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Job Types</Label>
                    <div className="space-y-2">
                      {["full-time", "part-time", "contract", "internship"].map((type) => (
                        <div key={type} className="flex items-center space-x-2">
                          <Checkbox
                            id={type}
                            checked={profile.preferences?.jobTypes?.includes(type) || false}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setProfile(prev => ({
                                  ...prev,
                                  preferences: {
                                    ...prev.preferences,
                                    jobTypes: [...(prev.preferences?.jobTypes || []), type]
                                  }
                                }));
                              } else {
                                setProfile(prev => ({
                                  ...prev,
                                  preferences: {
                                    ...prev.preferences,
                                    jobTypes: (prev.preferences?.jobTypes || []).filter(t => t !== type)
                                  }
                                }));
                              }
                            }}
                            disabled={!isEditing}
                          />
                          <Label htmlFor={type} className="capitalize">
                            {type.replace("-", " ")}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Remote Work</Label>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="remoteWork"
                        checked={profile.preferences?.remoteWork || false}
                        onCheckedChange={(checked) => {
                          setProfile(prev => ({
                            ...prev,
                            preferences: {
                              ...prev.preferences,
                              remoteWork: checked as boolean
                            }
                          }));
                        }}
                        disabled={!isEditing}
                      />
                      <Label htmlFor="remoteWork">
                        Open to remote work opportunities
                      </Label>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="availability">Availability</Label>
                    <Select
                      value={profile.preferences?.availability || ""}
                      onValueChange={(value) => {
                        setProfile(prev => ({
                          ...prev,
                          preferences: {
                            ...prev.preferences,
                            availability: value
                          }
                        }));
                      }}
                      disabled={!isEditing}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="immediately">Immediately</SelectItem>
                        <SelectItem value="2-weeks">2 weeks</SelectItem>
                        <SelectItem value="1-month">1 month</SelectItem>
                        <SelectItem value="2-months">2 months</SelectItem>
                        <SelectItem value="3-months">3+ months</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="noticePeriod">Notice Period</Label>
                    <Select
                      value={profile.preferences?.noticePeriod || ""}
                      onValueChange={(value) => {
                        setProfile(prev => ({
                          ...prev,
                          preferences: {
                            ...prev.preferences,
                            noticePeriod: value
                          }
                        }));
                      }}
                      disabled={!isEditing}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="immediate">Immediate</SelectItem>
                        <SelectItem value="1-week">1 week</SelectItem>
                        <SelectItem value="2-weeks">2 weeks</SelectItem>
                        <SelectItem value="1-month">1 month</SelectItem>
                        <SelectItem value="2-months">2 months</SelectItem>
                        <SelectItem value="3-months">3 months</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Salary Range ({profile.preferences?.salaryRange?.currency || "USD"})</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="salaryMin" className="text-sm text-gray-600">Minimum</Label>
                      <Input
                        id="salaryMin"
                        type="number"
                        value={profile.preferences?.salaryRange?.min || 0}
                        onChange={(e) => {
                          setProfile(prev => ({
                            ...prev,
                            preferences: {
                              ...prev.preferences,
                              salaryRange: {
                                ...prev.preferences?.salaryRange,
                                min: parseInt(e.target.value) || 0
                              }
                            }
                          }));
                        }}
                        disabled={!isEditing}
                      />
                    </div>
                    <div>
                      <Label htmlFor="salaryMax" className="text-sm text-gray-600">Maximum</Label>
                      <Input
                        id="salaryMax"
                        type="number"
                        value={profile.preferences?.salaryRange?.max || 0}
                        onChange={(e) => {
                          setProfile(prev => ({
                            ...prev,
                            preferences: {
                              ...prev.preferences,
                              salaryRange: {
                                ...prev.preferences?.salaryRange,
                                max: parseInt(e.target.value) || 0
                              }
                            }
                          }));
                        }}
                        disabled={!isEditing}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}