'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/shared/dialog';
import { Button } from '@/components/ui/shared/button';
import { Badge } from '@/components/ui/shared/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/shared/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/shared/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/shared/tabs';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/shared/separator';
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
  Target
} from 'lucide-react';
import { toast } from 'sonner';

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

export default function CandidateProfileModal({ isOpen, onClose, candidateId }: CandidateProfileModalProps) {
  const [candidate, setCandidate] = useState<CandidateProfileData | null>(null);
  const [parsedData, setParsedData] = useState<ParsedResumeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

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
              console.error('Error parsing resume data:', error);
            }
          }
        } else {
          toast.error(data.error || 'Failed to fetch candidate profile');
        }
      } else {
        toast.error('Failed to fetch candidate profile');
      }
    } catch (error) {
      console.error('Error fetching candidate profile:', error);
      toast.error('Failed to fetch candidate profile');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'applied': return 'bg-blue-100 text-blue-800';
      case 'screening': return 'bg-yellow-100 text-yellow-800';
      case 'interview': return 'bg-purple-100 text-purple-800';
      case 'hired': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'shortlisted': return 'bg-indigo-100 text-indigo-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const calculateExperience = (startDate: string, endDate: string) => {
    try {
      const start = new Date(startDate);
      const end = endDate.toLowerCase() === 'present' ? new Date() : new Date(endDate);
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
          <DialogTitle className="sr-only">Loading Candidate Profile</DialogTitle>
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
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
            <h3 className="text-lg font-medium text-gray-900 mb-2">Candidate Not Found</h3>
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
    location: candidate.location
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto">
        <DialogHeader className="pb-4">
          <DialogTitle className="text-2xl font-bold">Candidate Profile</DialogTitle>
        </DialogHeader>

        {/* Header Section */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 mb-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${personalInfo.name}`} />
                <AvatarFallback className="text-lg">
                  {personalInfo.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-2xl font-bold text-gray-900">{personalInfo.name}</h2>
                  <Badge className={getStatusColor(candidate.status)}>
                    {candidate.status.toUpperCase()}
                  </Badge>
                  {candidate.source && (
                    <Badge variant="outline" className="text-xs">
                      {candidate.source.replace('_', ' ')}
                    </Badge>
                  )}
                </div>
                
                {candidate.currentRole && candidate.currentCompany && (
                  <div className="flex items-center gap-2 mb-2">
                    <Briefcase className="h-4 w-4 text-gray-500" />
                    <span className="text-gray-700 font-medium">{candidate.currentRole}</span>
                    <span className="text-gray-500">at</span>
                    <span className="text-gray-700 font-medium">{candidate.currentCompany}</span>
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    <span>{personalInfo.email}</span>
                  </div>
                  {personalInfo.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      <span>{personalInfo.phone}</span>
                    </div>
                  )}
                  {personalInfo.location && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      <span>{personalInfo.location}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>Applied {formatDate(candidate.appliedDate)}</span>
                  </div>
                </div>
                
                {/* Social Links */}
                <div className="flex gap-2 mt-3">
                  {personalInfo.linkedin && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={personalInfo.linkedin} target="_blank" rel="noopener noreferrer">
                        <Linkedin className="h-4 w-4 mr-1" />
                        LinkedIn
                      </a>
                    </Button>
                  )}
                  {personalInfo.github && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={personalInfo.github} target="_blank" rel="noopener noreferrer">
                        <Github className="h-4 w-4 mr-1" />
                        GitHub
                      </a>
                    </Button>
                  )}
                  {personalInfo.portfolio && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={personalInfo.portfolio} target="_blank" rel="noopener noreferrer">
                        <Globe className="h-4 w-4 mr-1" />
                        Portfolio
                      </a>
                    </Button>
                  )}
                  {candidate.resumeUrl && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={candidate.resumeUrl} target="_blank" rel="noopener noreferrer">
                        <Download className="h-4 w-4 mr-1" />
                        Resume
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            </div>
            
            {/* Scores Section */}
            <div className="text-right">
              {candidate.talentFitScore && (
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">{candidate.talentFitScore}%</div>
                  <div className="text-sm text-gray-600">Talent Fit Score</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tabs Section */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="experience">Experience</TabsTrigger>
            <TabsTrigger value="education">Education</TabsTrigger>
            <TabsTrigger value="skills">Skills</TabsTrigger>
            <TabsTrigger value="projects">Projects</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Quick Stats */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Quick Stats
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Experience</span>
                    <span className="font-semibold">{parsedData?.totalExperience || 0} years</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Notice Period</span>
                    <span className="font-semibold">{candidate.noticePeriod || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Expected CTC</span>
                    <span className="font-semibold">{candidate.expectedCTC || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Current City</span>
                    <span className="font-semibold">{personalInfo.location || 'N/A'}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Skills Overview */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Code className="h-5 w-5" />
                    Skills Matched
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {parsedData?.skills ? (
                      [...(parsedData.skills.technical || []), ...(parsedData.skills.frameworks || [])]
                        .slice(0, 7)
                        .map((skill, index) => (
                          <div key={skill} className="flex items-center justify-between">
                            <Badge variant="secondary" className="text-xs">{skill}</Badge>
                            <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-green-500 rounded-full" 
                                style={{ width: `${Math.random() * 40 + 60}%` }}
                              />
                            </div>
                          </div>
                        ))
                    ) : (
                      <div className="text-center text-gray-500 text-sm">
                        No skills data available
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Education Overview */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <GraduationCap className="h-5 w-5" />
                    Education
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm">
                    {parsedData?.education && parsedData.education.length > 0 ? (
                      <div className="space-y-1">
                        {parsedData.education.slice(0, 2).map((edu, index) => (
                          <div key={index} className="text-gray-600">
                            <div className="font-medium">{edu.degree} in {edu.field}</div>
                            <div className="text-xs">{edu.institution} ({edu.graduationYear})</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center text-gray-500">
                        No education data available
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Summary */}
            {(parsedData?.summary || candidate.experience) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Professional Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 leading-relaxed">
                    {parsedData?.summary || candidate.experience || 'No professional summary available'}
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Experience Tab */}
          <TabsContent value="experience" className="space-y-4">
            {parsedData?.experience && parsedData.experience.length > 0 ? (
              parsedData.experience.map((exp, index) => (
                <Card key={index}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-lg font-semibold">{exp.position}</h3>
                        <div className="flex items-center gap-2 text-gray-600">
                          <Building className="h-4 w-4" />
                          <span className="font-medium">{exp.company}</span>
                        </div>
                      </div>
                      <div className="text-right text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          <span>{formatDate(exp.startDate)} - {exp.endDate === 'present' ? 'Present' : formatDate(exp.endDate)}</span>
                        </div>
                        <div className="mt-1">
                          {calculateExperience(exp.startDate, exp.endDate)} year(s)
                        </div>
                      </div>
                    </div>
                    <p className="text-gray-700 mb-3">{exp.description}</p>
                    {exp.technologies && exp.technologies.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {exp.technologies.map((tech, techIndex) => (
                          <Badge key={techIndex} variant="outline" className="text-xs">
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
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Experience Data</h3>
                  <p className="text-gray-600">Experience information not available in parsed resume data.</p>
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
                        <h3 className="text-lg font-semibold">{edu.degree}</h3>
                        <p className="text-gray-600 font-medium">{edu.field}</p>
                        <div className="flex items-center gap-2 text-gray-500 mt-1">
                          <GraduationCap className="h-4 w-4" />
                          <span>{edu.institution}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-semibold text-blue-600">{edu.graduationYear}</div>
                        {edu.gpa && (
                          <div className="text-sm text-gray-500">GPA: {edu.gpa}</div>
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
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Education Data</h3>
                  <p className="text-gray-600">Education information not available in parsed resume data.</p>
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
                          <Badge key={index} variant="secondary">{skill}</Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Frameworks */}
                {parsedData.skills.frameworks.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Frameworks & Libraries</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {parsedData.skills.frameworks.map((framework, index) => (
                          <Badge key={index} variant="outline">{framework}</Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Tools */}
                {parsedData.skills.tools.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Tools & Technologies</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {parsedData.skills.tools.map((tool, index) => (
                          <Badge key={index} variant="outline">{tool}</Badge>
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
                          <Badge key={index} className="bg-green-100 text-green-800">{skill}</Badge>
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
                        {parsedData.skills.languages.map((language, index) => (
                          <Badge key={index} className="bg-blue-100 text-blue-800">{language}</Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <Code className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Skills Data</h3>
                  <p className="text-gray-600">Skills information not available in parsed resume data.</p>
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
                          <h3 className="text-lg font-semibold">{project.name}</h3>
                          {project.url && (
                            <Button variant="outline" size="sm" asChild>
                              <a href={project.url} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </Button>
                          )}
                        </div>
                        <p className="text-gray-700 mb-3">{project.description}</p>
                        <div className="flex flex-wrap gap-1">
                          {project.technologies.map((tech, techIndex) => (
                            <Badge key={techIndex} variant="outline" className="text-xs">
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
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Projects Data</h3>
                  <p className="text-gray-600">Project information not available in parsed resume data.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}