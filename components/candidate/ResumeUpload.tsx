'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/shared/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/shared/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/shared/badge';
import { Separator } from '@/components/ui/shared/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/shared/tabs';
import { Input } from '@/components/ui/shared/input';
import { Label } from '@/components/ui/shared/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Download,
  Eye,
  Star,
  User,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  GraduationCap,
  Award,
  Code,
  Loader2,
  RefreshCw,
  Edit,
  Save,
  X
} from 'lucide-react';
import { ParsedResume, CVScore } from '@/lib/services/candidate/resume-parser';

interface ResumeUploadProps {
  candidateId?: string;
  campaignId?: string;
  jobRequirements?: any;
  onUploadComplete?: (data: any) => void;
  className?: string;
}

interface UploadState {
  isUploading: boolean;
  progress: number;
  error: string | null;
  success: boolean;
  parsedResume: ParsedResume | null;
  cvScore: CVScore | null;
  resumeUrl: string | null;
  retryCount: number;
  isEditing: boolean;
  editedData: ParsedResume | null;
}

export default function ResumeUpload({ 
  candidateId, 
  campaignId,
  jobRequirements, 
  onUploadComplete,
  className = '' 
}: ResumeUploadProps) {
  const [uploadState, setUploadState] = useState<UploadState>({
    isUploading: false,
    progress: 0,
    error: null,
    success: false,
    parsedResume: null,
    cvScore: null,
    resumeUrl: null,
    retryCount: 0,
    isEditing: false,
    editedData: null
  });

  const [fileValidation, setFileValidation] = useState<{
    isValid: boolean;
    errors: string[];
  }>({ isValid: true, errors: [] });

  // File validation function
  const validateFile = (file: File): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = [
      'application/pdf',
      'text/plain',
      'application/rtf',
      'text/rtf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/msword' // .doc
    ];
    
    const allowedExtensions = ['.pdf', '.txt', '.rtf', '.doc', '.docx'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));

    // File size validation
    if (file.size === 0) {
      errors.push('File appears to be empty');
    } else if (file.size > maxSize) {
      errors.push(`File size (${(file.size / 1024 / 1024).toFixed(1)}MB) exceeds 10MB limit`);
    }

    // File type validation
    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
      errors.push(`File type '${file.type}' is not supported. Please upload PDF, DOC, DOCX, TXT, or RTF files`);
    }

    // File name validation
    if (file.name.length > 255) {
      errors.push('File name is too long (max 255 characters)');
    }
    
    // Check for suspicious file names
    const suspiciousPatterns = [/\.(exe|bat|cmd|scr|vbs|js)$/i, /[<>:"|?*]/];
    if (suspiciousPatterns.some(pattern => pattern.test(file.name))) {
      errors.push('File name contains invalid characters or suspicious extension');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  };

  const uploadFile = async (file: File, isRetry = false) => {
    // Validate file before upload
    const validation = validateFile(file);
    setFileValidation(validation);
    
    if (!validation.isValid) {
      setUploadState(prev => ({
        ...prev,
        error: validation.errors.join(', '),
        isUploading: false
      }));
      return;
    }

    setUploadState(prev => ({
      ...prev,
      isUploading: true,
      progress: 0,
      error: null,
      success: false,
      retryCount: isRetry ? prev.retryCount + 1 : 0
    }));

    // Enhanced progress simulation
    const progressInterval = setInterval(() => {
      setUploadState(prev => {
        if (prev.progress >= 85) {
          clearInterval(progressInterval);
          return prev;
        }
        return { ...prev, progress: prev.progress + Math.random() * 15 + 5 };
      });
    }, 300);

    try {
      const formData = new FormData();
      formData.append('resume', file);
      if (candidateId) {
        formData.append('candidateId', candidateId);
      }
      if (campaignId) {
        formData.append('campaignId', campaignId);
      }
      if (jobRequirements) {
        formData.append('jobRequirements', JSON.stringify(jobRequirements));
      }
      formData.append('source', candidateId ? 'standalone_upload' : 'manual_upload');

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

      const response = await fetch('/api/candidates/resumes/upload', {
        method: 'POST',
        body: formData,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ 
          error: 'Network error', 
          message: 'Unable to connect to server. Please check your connection and try again.' 
        }));
        
        // Handle different types of error responses
        let errorMessage = errorData.error || `Upload failed: ${response.statusText}`;
        
        if (errorData.message) {
          errorMessage = errorData.message;
        } else if (errorData.details && Array.isArray(errorData.details)) {
          errorMessage = errorData.details.join('; ');
        }
        
        throw new Error(errorMessage);
      }

      const result = await response.json();
      
      // Validate response structure
      if (!result.success && !result.candidateId) {
        throw new Error(result.message || 'Invalid response from server');
      }
      
      clearInterval(progressInterval);
      setUploadState(prev => ({
        ...prev,
        isUploading: false,
        progress: 100,
        success: true,
        parsedResume: result.parsedData,
        cvScore: result.cvScore,
        resumeUrl: result.candidate?.resumeUrl || '',
        editedData: result.parsedData
      }));
      
      toast.success('Resume uploaded and parsed successfully!');
      
      if (onUploadComplete) {
        onUploadComplete({
          parsedData: result.parsedData,
          cvScore: result.cvScore,
          candidate: result.candidate
        });
      }
    } catch (error) {
      clearInterval(progressInterval);
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      
      setUploadState(prev => ({
        ...prev,
        isUploading: false,
        error: errorMessage,
        success: false
      }));
      
      toast.error(`Upload failed: ${errorMessage}`);
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;
    
    await uploadFile(file);
  }, [candidateId, campaignId, jobRequirements, onUploadComplete]);

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt'],
      'application/rtf': ['.rtf'],
      'text/rtf': ['.rtf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
    disabled: uploadState.isUploading,
    onDropRejected: (rejectedFiles) => {
      const errors = rejectedFiles.flatMap(file => 
        file.errors.map(error => {
          switch (error.code) {
            case 'file-too-large':
              return `File "${file.file.name}" is too large (max 10MB)`;
            case 'file-invalid-type':
              return `File "${file.file.name}" has invalid type. Please upload PDF, DOC, DOCX, TXT, or RTF files`;
            case 'too-many-files':
              return 'Only one file can be uploaded at a time';
            default:
              return `File "${file.file.name}": ${error.message}`;
          }
        })
      );
      
      setUploadState(prev => ({
        ...prev,
        error: errors.join('; ')
      }));
      
      toast.error(errors.join('; '));
    }
  });

  const resetUpload = () => {
    setUploadState({
      isUploading: false,
      progress: 0,
      error: null,
      success: false,
      parsedResume: null,
      cvScore: null,
      resumeUrl: null,
      retryCount: 0,
      isEditing: false,
      editedData: null
    });
    setFileValidation({ isValid: true, errors: [] });
  };

  const retryUpload = async () => {
    if (uploadState.retryCount >= 3) {
      toast.error('Maximum retry attempts reached. Please try with a different file.');
      return;
    }
    
    // Get the last uploaded file from the input
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = fileInput?.files?.[0];
    
    if (file) {
      await uploadFile(file, true);
    } else {
      toast.error('No file found to retry. Please select a file again.');
    }
  };

  const toggleEdit = () => {
    setUploadState(prev => ({
      ...prev,
      isEditing: !prev.isEditing,
      editedData: prev.isEditing ? prev.editedData : prev.parsedResume
    }));
  };

  const saveEdits = () => {
    if (!uploadState.editedData) return;
    
    setUploadState(prev => ({
      ...prev,
      parsedResume: prev.editedData,
      isEditing: false
    }));
    
    toast.success('Resume data updated successfully!');
    
    if (onUploadComplete && uploadState.editedData) {
        onUploadComplete({
          parsedData: uploadState.editedData,
          cvScore: uploadState.cvScore!,
          candidate: {
            id: '',
            name: uploadState.editedData.personalInfo.name || '',
            email: uploadState.editedData.personalInfo.email || '',
            score: uploadState.cvScore!.overallScore,
            status: 'applied',
            resumeUrl: uploadState.resumeUrl!
          }
        });
      }
  };

  const updateEditedField = (field: keyof ParsedResume, value: any) => {
    setUploadState(prev => ({
      ...prev,
      editedData: prev.editedData ? {
        ...prev.editedData,
        [field]: value
      } : null
    }));
  };

  const renderPersonalInfo = (resume: ParsedResume) => {
    const isEditing = uploadState.isEditing;
    const data = isEditing ? uploadState.editedData : resume;
    
    if (!data) return null;
    
    return (
      <div className="space-y-3">
        <h4 className="font-semibold flex items-center gap-2">
          <User className="h-4 w-4" />
          Personal Information
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          {(data.personalInfo.name || isEditing) && (
            <div className="flex items-center gap-2">
              <User className="h-3 w-3 text-muted-foreground" />
              {isEditing ? (
                <Input
                  value={data.personalInfo.name || ''}
                  onChange={(e) => updateEditedField('personalInfo', {
                    ...data.personalInfo,
                    name: e.target.value
                  })}
                  placeholder="Full Name"
                  className="h-6 text-sm"
                />
              ) : (
                <span>{data.personalInfo.name}</span>
              )}
            </div>
          )}
          {(data.personalInfo.email || isEditing) && (
            <div className="flex items-center gap-2">
              <Mail className="h-3 w-3 text-muted-foreground" />
              {isEditing ? (
                <Input
                  type="email"
                  value={data.personalInfo.email || ''}
                  onChange={(e) => updateEditedField('personalInfo', {
                    ...data.personalInfo,
                    email: e.target.value
                  })}
                  placeholder="Email"
                  className="h-6 text-sm"
                />
              ) : (
                <span>{data.personalInfo.email}</span>
              )}
            </div>
          )}
          {(data.personalInfo.phone || isEditing) && (
            <div className="flex items-center gap-2">
              <Phone className="h-3 w-3 text-muted-foreground" />
              {isEditing ? (
                <Input
                  value={data.personalInfo.phone || ''}
                  onChange={(e) => updateEditedField('personalInfo', {
                    ...data.personalInfo,
                    phone: e.target.value
                  })}
                  placeholder="Phone"
                  className="h-6 text-sm"
                />
              ) : (
                <span>{data.personalInfo.phone}</span>
              )}
            </div>
          )}
          {(data.personalInfo.location || isEditing) && (
            <div className="flex items-center gap-2">
              <MapPin className="h-3 w-3 text-muted-foreground" />
              {isEditing ? (
                <Input
                  value={data.personalInfo.location || ''}
                  onChange={(e) => updateEditedField('personalInfo', {
                    ...data.personalInfo,
                    location: e.target.value
                  })}
                  placeholder="Location"
                  className="h-6 text-sm"
                />
              ) : (
                <span>{data.personalInfo.location}</span>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderExperience = (resume: ParsedResume) => {
    const isEditing = uploadState.isEditing;
    const data = isEditing ? uploadState.editedData : resume;
    
    if (!data) return null;
    
    return (
      <div className="space-y-3">
        <h4 className="font-semibold flex items-center gap-2">
          <Briefcase className="h-4 w-4" />
          Experience ({data.totalExperience} years)
        </h4>
        <div className="space-y-2">
          {data.experience.slice(0, 3).map((exp: any, index: number) => (
            <div key={index} className="text-sm border-l-2 border-blue-200 pl-3 space-y-2">
              {isEditing ? (
                <>
                  <Input
                    value={exp.position}
                    onChange={(e) => {
                      const newExperience = [...data.experience];
                      newExperience[index] = { ...exp, position: e.target.value };
                      updateEditedField('experience', newExperience);
                    }}
                    placeholder="Position"
                    className="font-medium h-6 text-sm"
                  />
                  <Input
                    value={exp.company}
                    onChange={(e) => {
                      const newExperience = [...data.experience];
                      newExperience[index] = { ...exp, company: e.target.value };
                      updateEditedField('experience', newExperience);
                    }}
                    placeholder="Company"
                    className="h-6 text-sm"
                  />
                  <Input
                    value={exp.duration}
                    onChange={(e) => {
                      const newExperience = [...data.experience];
                      newExperience[index] = { ...exp, duration: e.target.value };
                      updateEditedField('experience', newExperience);
                    }}
                    placeholder="Duration"
                    className="h-6 text-xs"
                  />
                </>
              ) : (
                <>
                  <div className="font-medium">{exp.position}</div>
                  <div className="text-muted-foreground">{exp.company} • {exp.duration}</div>
                </>
              )}
            </div>
          ))}
          {data.experience.length > 3 && (
            <div className="text-xs text-muted-foreground">
              +{data.experience.length - 3} more positions
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderEducation = (resume: ParsedResume) => (
    <div className="space-y-3">
      <h4 className="font-semibold flex items-center gap-2">
        <GraduationCap className="h-4 w-4" />
        Education
      </h4>
      <div className="space-y-2">
        {resume.education.slice(0, 2).map((edu: any, index: number) => (
          <div key={index} className="text-sm">
            <div className="font-medium">{edu.degree}</div>
            <div className="text-muted-foreground">{edu.institution} • {edu.year}</div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderSkills = (resume: ParsedResume) => {
    const isEditing = uploadState.isEditing;
    const data = isEditing ? uploadState.editedData : resume;
    
    if (!data) return null;
    
    return (
      <div className="space-y-3">
        <h4 className="font-semibold flex items-center gap-2">
          <Code className="h-4 w-4" />
          Skills
        </h4>
        <div className="space-y-2">
          {(data.skills.technical.length > 0 || isEditing) && (
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1">Technical</div>
              {isEditing ? (
                <Textarea
                  value={data.skills.technical.join(', ')}
                  onChange={(e) => updateEditedField('skills', {
                    ...data.skills,
                    technical: e.target.value.split(',').map(s => s.trim()).filter(s => s)
                  })}
                  placeholder="Enter technical skills separated by commas"
                  className="text-sm min-h-[60px]"
                />
              ) : (
                <div className="flex flex-wrap gap-1">
                  {data.skills.technical.slice(0, 8).map((skill: string, index: number) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {skill}
                    </Badge>
                  ))}
                  {data.skills.technical.length > 8 && (
                    <Badge variant="outline" className="text-xs">
                      +{data.skills.technical.length - 8}
                    </Badge>
                  )}
                </div>
              )}
            </div>
          )}
          {(data.skills.soft.length > 0 || isEditing) && (
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1">Soft Skills</div>
              {isEditing ? (
                <Textarea
                  value={data.skills.soft.join(', ')}
                  onChange={(e) => updateEditedField('skills', {
                    ...data.skills,
                    soft: e.target.value.split(',').map(s => s.trim()).filter(s => s)
                  })}
                  placeholder="Enter soft skills separated by commas"
                  className="text-sm min-h-[60px]"
                />
              ) : (
                <div className="flex flex-wrap gap-1">
                  {data.skills.soft.slice(0, 6).map((skill: string, index: number) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {skill}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderCVScore = (cvScore: CVScore) => (
    <Card className="border-green-200 bg-green-50">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Star className="h-5 w-5 text-yellow-500" />
          CV Score: {cvScore.overallScore}%
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="font-medium">Experience Match</div>
            <div className="text-muted-foreground">{cvScore.breakdown.experienceMatch}%</div>
          </div>
          <div>
            <div className="font-medium">Skills Match</div>
            <div className="text-muted-foreground">{cvScore.breakdown.skillsMatch}%</div>
          </div>
          <div>
            <div className="font-medium">Education Match</div>
            <div className="text-muted-foreground">{cvScore.breakdown.educationMatch}%</div>
          </div>
          <div>
            <div className="font-medium">Cultural Fit</div>
            <div className="text-muted-foreground">{cvScore.breakdown.culturalFit}%</div>
          </div>
        </div>
        
        {cvScore.recommendations.length > 0 && (
          <div>
            <h5 className="font-medium mb-2">Recommendations</h5>
            <ul className="text-sm space-y-1">
              {cvScore.recommendations.slice(0, 3).map((rec: string, index: number) => (
                <li key={index} className="flex items-start gap-2">
                  <AlertCircle className="h-3 w-3 mt-0.5 text-blue-500 flex-shrink-0" />
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className={`space-y-6 ${className}`}>
      {/* File Validation Errors */}
      {!fileValidation.isValid && (
        <Alert className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              {fileValidation.errors.map((error, index) => (
                <div key={index} className="text-sm">{error}</div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Upload Area */}
      {!uploadState.success && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload Resume
            </CardTitle>
            <CardDescription>
              Upload a PDF, DOC, DOCX, or TXT file (max 10MB)
              {candidateId && <span className="block text-xs text-muted-foreground mt-1">for standalone candidate</span>}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              {...getRootProps()}
              className={`
                border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
                ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
                ${uploadState.isUploading ? 'pointer-events-none opacity-50' : ''}
                ${uploadState.error ? 'border-red-300 bg-red-50' : ''}
              `}
            >
              <input {...getInputProps()} />
              <div className="flex flex-col items-center space-y-4">
                {uploadState.isUploading ? (
                  <div className="flex flex-col items-center space-y-4">
                    <Loader2 className="h-12 w-12 text-blue-600 animate-spin" />
                    <div className="w-full max-w-xs">
                      <Progress value={uploadState.progress} className="w-full" />
                      <p className="text-sm text-gray-600 mt-2">
                        {uploadState.retryCount > 0 && `Retry ${uploadState.retryCount}/3 • `}
                        Uploading and parsing... {Math.round(uploadState.progress)}%
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <Upload className={`h-12 w-12 ${uploadState.error ? 'text-red-400' : 'text-gray-400'}`} />
                    <div>
                      <p className="text-lg font-medium text-gray-900">
                        {isDragActive ? 'Drop your resume here' : 'Upload your resume'}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        Drag & drop or click to select • PDF, DOC, DOCX, TXT • Max 10MB
                      </p>
                      {uploadState.retryCount > 0 && (
                        <p className="text-xs text-orange-600 mt-1">
                          Retry attempt {uploadState.retryCount}/3
                        </p>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Alert */}
      {uploadState.error && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="flex items-center justify-between">
              <span>{uploadState.error}</span>
              <div className="flex gap-2 ml-4">
                {uploadState.retryCount < 3 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={retryUpload}
                    disabled={uploadState.isUploading}
                    className="flex items-center gap-1"
                  >
                    <RefreshCw className="h-3 w-3" />
                    Retry
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetUpload}
                  className="flex items-center gap-1"
                >
                  <X className="h-3 w-3" />
                  Reset
                </Button>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Success Results */}
      {uploadState.success && uploadState.parsedResume && (
        <div className="space-y-6">
          {/* Success Header */}
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              <div className="flex items-center justify-between">
                <span>Resume parsed successfully! Here's what we extracted:</span>
                <div className="flex gap-2 ml-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleEdit}
                    className="flex items-center gap-1"
                  >
                    {uploadState.isEditing ? (
                      <>
                        <X className="h-3 w-3" />
                        Cancel
                      </>
                    ) : (
                      <>
                        <Edit className="h-3 w-3" />
                        Edit
                      </>
                    )}
                  </Button>
                  {uploadState.isEditing && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={saveEdits}
                      className="flex items-center gap-1"
                    >
                      <Save className="h-3 w-3" />
                      Save
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={resetUpload}
                    className="flex items-center gap-1"
                  >
                    <Upload className="h-3 w-3" />
                    New Upload
                  </Button>
                </div>
              </div>
            </AlertDescription>
          </Alert>

          {/* CV Score */}
          {uploadState.cvScore && renderCVScore(uploadState.cvScore)}

          {/* Parsed Resume Data */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Parsed Resume Data
                </span>
                <div className="flex gap-2">
                  {uploadState.resumeUrl && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(uploadState.resumeUrl!, '_blank')}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      View Original
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={resetUpload}>
                    Upload New
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="experience">Experience</TabsTrigger>
                  <TabsTrigger value="skills">Skills</TabsTrigger>
                  <TabsTrigger value="score">CV Score</TabsTrigger>
                </TabsList>
                
                <TabsContent value="overview" className="space-y-4">
                  {renderPersonalInfo(uploadState.parsedResume)}
                  <Separator />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {renderExperience(uploadState.parsedResume)}
                    {renderEducation(uploadState.parsedResume)}
                  </div>
                </TabsContent>
                
                <TabsContent value="experience">
                  {renderExperience(uploadState.parsedResume)}
                </TabsContent>
                
                <TabsContent value="skills">
                  {renderSkills(uploadState.parsedResume)}
                </TabsContent>
                
                <TabsContent value="score">
                  {uploadState.cvScore && renderCVScore(uploadState.cvScore)}
                </TabsContent>
              </Tabs>
              
              {/* Action Buttons */}
              <div className="flex justify-between pt-4">
                <div className="flex gap-2">
                  {uploadState.resumeUrl && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={uploadState.resumeUrl} target="_blank" rel="noopener noreferrer">
                        <Eye className="h-4 w-4 mr-1" />
                        View Original
                      </a>
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={resetUpload}>
                    <Upload className="h-4 w-4 mr-1" />
                    Upload New
                  </Button>
                </div>
                
                {uploadState.isEditing && (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={toggleEdit}>
                      <X className="h-4 w-4 mr-1" />
                      Cancel
                    </Button>
                    <Button variant="default" size="sm" onClick={saveEdits}>
                      <Save className="h-4 w-4 mr-1" />
                      Save Changes
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}