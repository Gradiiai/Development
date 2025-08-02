'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/shared/card';
import { Button } from '@/components/ui/shared/button';
import { Input } from '@/components/ui/shared/input';
import { Label } from '@/components/ui/shared/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/shared/tabs';
import { Badge } from '@/components/ui/shared/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/shared/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/shared/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/shared/avatar';
import { 
  Search, 
  Plus, 
  FileText, 
  Users, 
  TrendingUp, 
  Filter,
  Download,
  Eye,
  Trash2,
  Star,
  Calendar,
  Mail,
  Phone,
  MapPin,
  Briefcase
} from 'lucide-react';
import ResumeUpload from '@/components/candidate/ResumeUpload';
import { useToast } from '@/shared/hooks/use-toast';

interface Candidate {
  id: string;
  name: string;
  email: string;
  phone?: string;
  location?: string;
  resumeUrl?: string;
  parsedResumeData?: string;
  cvScore?: string;
  createdAt: string;
  updatedAt: string;
}

interface ParsedResumeData {
  personalInfo: {
    name: string;
    email: string;
    phone?: string;
    location?: string;
  };
  experience: Array<{
    position: string;
    company: string;
    duration: string;
  }>;
  education: Array<{
    degree: string;
    institution: string;
    year: string;
  }>;
  skills: {
    technical: string[];
    soft: string[];
  };
  totalExperience: number;
}

interface CVScore {
  overallScore: number;
  experienceScore: number;
  skillsScore: number;
  educationScore: number;
  keywordScore: number;
  recommendations: string[];
}

export default function ResumesPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [newCandidateData, setNewCandidateData] = useState({
    name: '',
    email: '',
    phone: '',
    location: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchCandidates();
  }, []);

  const fetchCandidates = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/resume-candidates');
      if (response.ok) {
        const data = await response.json();
        setCandidates(data.candidates || []);
      }
    } catch (error) {
      console.error('Error fetching candidates:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch candidates',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const createCandidate = async () => {
    if (!newCandidateData.name || !newCandidateData.email) {
      toast({
        title: 'Error',
        description: 'Name and email are required',
        variant: 'destructive'
      });
      return;
    }

    try {
      const response = await fetch('/api/resume-candidates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newCandidateData)
      });

      if (response.ok) {
        const data = await response.json();
        setCandidates(prev => [data.candidate, ...prev]);
        setNewCandidateData({ name: '', email: '', phone: '', location: '' });
        setShowUpload(false);
        toast({
          title: 'Success',
          description: 'Candidate created successfully'
        });
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create candidate');
      }
    } catch (error) {
      console.error('Error creating candidate:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create candidate',
        variant: 'destructive'
      });
    }
  };

  const handleUploadComplete = (data: any) => {
    toast({
      title: 'Success',
      description: 'Resume uploaded and parsed successfully'
    });
    fetchCandidates(); // Refresh the list
    setSelectedCandidate(null);
  };

  const filteredCandidates = candidates.filter(candidate =>
    candidate.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    candidate.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const candidatesWithResumes = candidates.filter(c => c.resumeUrl);
  const candidatesWithScores = candidates.filter(c => c.cvScore);
  const averageScore = candidatesWithScores.length > 0 
    ? candidatesWithScores.reduce((sum, c) => {
        const score = JSON.parse(c.cvScore!);
        return sum + score.overallScore;
      }, 0) / candidatesWithScores.length
    : 0;

  const renderCandidateCard = (candidate: Candidate) => {
    const parsedResume: ParsedResumeData | null = candidate.parsedResumeData 
      ? JSON.parse(candidate.parsedResumeData) 
      : null;
    const cvScore: CVScore | null = candidate.cvScore 
      ? JSON.parse(candidate.cvScore) 
      : null;

    return (
      <Card key={candidate.id} className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="text-lg">{candidate.name}</CardTitle>
              <CardDescription className="flex items-center gap-2">
                <Mail className="h-3 w-3" />
                {candidate.email}
              </CardDescription>
              {parsedResume?.personalInfo.phone && (
                <CardDescription className="flex items-center gap-2">
                  <Phone className="h-3 w-3" />
                  {parsedResume.personalInfo.phone}
                </CardDescription>
              )}
              {parsedResume?.personalInfo.location && (
                <CardDescription className="flex items-center gap-2">
                  <MapPin className="h-3 w-3" />
                  {parsedResume.personalInfo.location}
                </CardDescription>
              )}
            </div>
            <div className="flex flex-col items-end gap-2">
              {cvScore && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Star className="h-3 w-3" />
                  {cvScore.overallScore}%
                </Badge>
              )}
              {candidate.resumeUrl ? (
                <Badge variant="default">Resume Uploaded</Badge>
              ) : (
                <Badge variant="outline">No Resume</Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {parsedResume && (
            <div className="space-y-3">
              {parsedResume.totalExperience > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <Briefcase className="h-3 w-3 text-muted-foreground" />
                  <span>{parsedResume.totalExperience} years experience</span>
                </div>
              )}
              
              {parsedResume.skills.technical.length > 0 && (
                <div>
                  <div className="text-xs font-medium text-muted-foreground mb-1">Top Skills</div>
                  <div className="flex flex-wrap gap-1">
                    {parsedResume.skills.technical.slice(0, 4).map((skill, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {skill}
                      </Badge>
                    ))}
                    {parsedResume.skills.technical.length > 4 && (
                      <Badge variant="outline" className="text-xs">
                        +{parsedResume.skills.technical.length - 4}
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
          
          <div className="flex gap-2">
            {!candidate.resumeUrl ? (
              <Button 
                size="sm" 
                onClick={() => setSelectedCandidate(candidate)}
                className="flex-1"
              >
                <Plus className="h-3 w-3 mr-1" />
                Upload Resume
              </Button>
            ) : (
              <>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.open(candidate.resumeUrl!, '_blank')}
                >
                  <Eye className="h-3 w-3 mr-1" />
                  View
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setSelectedCandidate(candidate)}
                >
                  <FileText className="h-3 w-3 mr-1" />
                  Re-upload
                </Button>
              </>
            )}
          </div>
          
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            Added {new Date(candidate.createdAt).toLocaleDateString()}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (selectedCandidate) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="mb-6">
          <Button 
            variant="outline" 
            onClick={() => setSelectedCandidate(null)}
            className="mb-4"
          >
            ← Back to Candidates
          </Button>
          <h1 className="text-2xl font-bold">Upload Resume for {selectedCandidate.name}</h1>
          <p className="text-muted-foreground">{selectedCandidate.email}</p>
        </div>
        
        <ResumeUpload 
          candidateId={selectedCandidate.id}
          onUploadComplete={handleUploadComplete}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Resume Management</h1>
            <p className="text-muted-foreground">Manage candidate resumes and AI parsing</p>
          </div>
          <Button onClick={() => setShowUpload(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Candidate
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Users className="h-8 w-8 text-blue-500" />
                <div>
                  <div className="text-2xl font-bold">{candidates.length}</div>
                  <div className="text-sm text-muted-foreground">Total Candidates</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <FileText className="h-8 w-8 text-green-500" />
                <div>
                  <div className="text-2xl font-bold">{candidatesWithResumes.length}</div>
                  <div className="text-sm text-muted-foreground">Resumes Uploaded</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Star className="h-8 w-8 text-yellow-500" />
                <div>
                  <div className="text-2xl font-bold">{candidatesWithScores.length}</div>
                  <div className="text-sm text-muted-foreground">CV Scores</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-8 w-8 text-purple-500" />
                <div>
                  <div className="text-2xl font-bold">{Math.round(averageScore)}%</div>
                  <div className="text-sm text-muted-foreground">Avg Score</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <div className="flex gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search candidates by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
        </div>
      </div>

      {/* Add Candidate Modal */}
      {showUpload && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Add New Candidate</CardTitle>
            <CardDescription>Create a new candidate profile</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  value={newCandidateData.name}
                  onChange={(e) => setNewCandidateData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter full name"
                />
              </div>
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={newCandidateData.email}
                  onChange={(e) => setNewCandidateData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Enter email address"
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={newCandidateData.phone}
                  onChange={(e) => setNewCandidateData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="Enter phone number"
                />
              </div>
              <div>
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={newCandidateData.location}
                  onChange={(e) => setNewCandidateData(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="Enter location"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={createCandidate}>
                Create Candidate
              </Button>
              <Button variant="outline" onClick={() => setShowUpload(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Candidates List */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading candidates...</p>
        </div>
      ) : filteredCandidates.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No candidates found</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm ? 'No candidates match your search.' : 'Get started by adding your first candidate.'}
            </p>
            {!searchTerm && (
              <Button onClick={() => setShowUpload(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Candidate
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCandidates.map(renderCandidateCard)}
        </div>
      )}
    </div>
  );
}