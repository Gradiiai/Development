"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/shared/card";
import { Button } from "@/components/ui/shared/button";
import { Input } from "@/components/ui/shared/input";
import { Label } from "@/components/ui/shared/label";
import { Badge } from "@/components/ui/shared/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/shared/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/shared/dropdown-menu";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  FileText,
  Upload,
  Download,
  Eye,
  Edit,
  Trash2,
  MoreVertical,
  Search,
  Filter,
  Calendar,
  User,
  Building2,
  Award,
  Image,
  File,
  Video,
  Archive,
  Plus,
  Loader2,
  ExternalLink,
  Share,
  Star,
  Clock,
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/shared/hooks/use-toast";

interface Document {
  id: string;
  name: string;
  type: "resume" | "cover_letter" | "certificate" | "portfolio" | "transcript" | "other";
  fileType: string;
  size: number;
  url: string;
  uploadDate: Date;
  lastModified: Date;
  isPublic: boolean;
  isPrimary?: boolean;
  tags: string[];
  description?: string;
  relatedTo?: {
    type: "application" | "interview" | "company";
    id: string;
    name: string;
  };
}

const documentTypeConfig = {
  resume: {
    label: "Resume",
    color: "bg-blue-100 text-blue-800",
    icon: FileText,
  },
  cover_letter: {
    label: "Cover Letter",
    color: "bg-green-100 text-green-800",
    icon: FileText,
  },
  certificate: {
    label: "Certificate",
    color: "bg-purple-100 text-purple-800",
    icon: Award,
  },
  portfolio: {
    label: "Portfolio",
    color: "bg-orange-100 text-orange-800",
    icon: Image,
  },
  transcript: {
    label: "Transcript",
    color: "bg-indigo-100 text-indigo-800",
    icon: FileText,
  },
  other: {
    label: "Other",
    color: "bg-gray-100 text-gray-800",
    icon: File,
  },
};

const getFileIcon = (fileType: string) => {
  if (fileType.includes("pdf")) return FileText;
  if (fileType.includes("image")) return Image;
  if (fileType.includes("video")) return Video;
  if (fileType.includes("zip") || fileType.includes("rar")) return Archive;
  return File;
};

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};



export default function CandidateDocuments() {
  const { data: session, status } = useSession();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<Document[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<Document | null>(null);
  const { toast } = useToast();

  // Handle session and fetch documents when authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      // Redirect to sign in if not authenticated
      window.location.href = "/candidate/signin";
    } else if (status === "authenticated") {
      if (session.user.role !== "candidate") {
        window.location.href = "/candidate/signin";
        return;
      }
      fetchDocuments();
    }
  }, [status, session]);

  const fetchDocuments = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch('/api/candidates/documents');
      if (!response.ok) {
        throw new Error('Failed to fetch documents');
      }
      const data = await response.json();
      
      // Transform API response to match frontend interface
      const transformedDocuments = data.map((doc: any) => ({
        id: doc.id,
        name: doc.name,
        type: doc.documentType || 'other', // Map documentType to type
        fileType: doc.type, // Map type to fileType
        size: doc.size,
        url: doc.url,
        uploadDate: new Date(doc.uploadedAt), // Map uploadedAt to uploadDate
        lastModified: new Date(doc.uploadedAt), // Use uploadedAt for lastModified
        isPublic: doc.isPublic !== undefined ? doc.isPublic : true,
        isPrimary: doc.isDefault || false, // Map isDefault to isPrimary
        tags: doc.tags || [],
        description: doc.description || '',
      }));
      
      setDocuments(transformedDocuments);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching documents:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter documents
  useEffect(() => {
    let filtered = documents.filter((doc) => {
      const matchesSearch = 
        doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesType = typeFilter === "all" || doc.type === typeFilter;
      
      return matchesSearch && matchesType;
    });

    // Sort by upload date (newest first)
    filtered.sort((a, b) => b.uploadDate.getTime() - a.uploadDate.getTime());

    setFilteredDocuments(filtered);
  }, [documents, searchTerm, typeFilter]);

  const getDocumentCounts = () => {
    const counts = {
      all: documents.length,
      resume: 0,
      cover_letter: 0,
      certificate: 0,
      portfolio: 0,
      transcript: 0,
      other: 0,
    };

    documents.forEach((doc) => {
      counts[doc.type]++;
    });

    return counts;
  };

  const counts = getDocumentCounts();

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      const uploadedDocuments: Document[] = [];
      
      // Upload files one by one to handle individual metadata
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('documentType', getDocumentTypeFromFile(file));
        formData.append('description', '');
        formData.append('isPrimary', 'false');

        const response = await fetch('/api/candidates/documents/upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Failed to upload ${file.name}`);
        }

        const uploadedDoc = await response.json();
        uploadedDocuments.push(uploadedDoc);
      }
      
      setDocuments(prev => [...uploadedDocuments, ...prev]);
      setUploadDialogOpen(false);
      
      toast({
        title: "Files uploaded",
        description: `${files.length} file(s) uploaded successfully.`,
      });
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "Failed to upload files. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Helper function to determine document type from file
  const getDocumentTypeFromFile = (file: File): string => {
    const fileName = file.name.toLowerCase();
    const fileType = file.type.toLowerCase();
    
    if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
      if (fileName.includes('resume') || fileName.includes('cv')) {
        return 'resume';
      }
      if (fileName.includes('cover') || fileName.includes('letter')) {
        return 'cover-letter';
      }
      if (fileName.includes('transcript')) {
        return 'transcript';
      }
      if (fileName.includes('certificate') || fileName.includes('cert')) {
        return 'certificate';
      }
    }
    
    if (fileType.startsWith('image/')) {
      return 'portfolio';
    }
    
    return 'other';
  };

  const handleDeleteDocument = async (document: Document) => {
    try {
      const response = await fetch(`/api/candidates/documents/${document.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete document');
      }
      
      setDocuments(prev => prev.filter(doc => doc.id !== document.id));
      setDeleteDialogOpen(false);
      setDocumentToDelete(null);
      
      toast({
        title: "Document deleted",
        description: `${document.name} has been deleted.`,
      });
    } catch (error) {
      toast({
        title: "Delete failed",
        description: "Failed to delete document. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleTogglePublic = async (document: Document) => {
    try {
      const response = await fetch(`/api/candidates/documents/${document.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isPublic: !document.isPublic }),
      });

      if (!response.ok) {
        throw new Error('Failed to update document visibility');
      }

      setDocuments(prev => prev.map(doc => 
        doc.id === document.id 
          ? { ...doc, isPublic: !doc.isPublic }
          : doc
      ));
      
      toast({
        title: "Visibility updated",
        description: `${document.name} is now ${document.isPublic ? 'private' : 'public'}.`,
      });
    } catch (error) {
      toast({
        title: "Update failed",
        description: "Failed to update document visibility.",
        variant: "destructive",
      });
    }
  };

  const handleSetPrimary = async (document: Document) => {
    if (document.type !== "resume") return;
    
    try {
      const response = await fetch(`/api/candidates/documents/${document.id}/set-primary`, {
        method: 'PATCH',
      });

      if (!response.ok) {
        throw new Error('Failed to set primary resume');
      }

      setDocuments(prev => prev.map(doc => ({
        ...doc,
        isPrimary: doc.id === document.id && doc.type === "resume"
      })));
      
      toast({
        title: "Primary resume updated",
        description: `${document.name} is now your primary resume.`,
      });
    } catch (error) {
      toast({
        title: "Update failed",
        description: "Failed to set primary resume.",
        variant: "destructive",
      });
    }
  };

  // Show loading spinner while session is loading or data is being fetched
  if (status === "loading" || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={fetchDocuments}>Try Again</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Don't render if no session
  if (!session) {
    return null;
  }

  const DocumentCard = ({ document }: { document: Document }) => {
    const typeInfo = documentTypeConfig[document.type];
    const TypeIcon = typeInfo.icon;
    const FileIcon = getFileIcon(document.fileType);

    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-start space-x-3 flex-1 min-w-0">
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <FileIcon className="w-5 h-5 text-gray-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-gray-900 truncate">{document.name}</h3>
                <p className="text-sm text-gray-500">{formatFileSize(document.size)}</p>
                <div className="flex items-center space-x-2 mt-1">
                  <Badge className={typeInfo.color}>
                    <TypeIcon className="w-3 h-3 mr-1" />
                    {typeInfo.label}
                  </Badge>
                  {document.isPrimary && (
                    <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                      <Star className="w-3 h-3 mr-1" />
                      Primary
                    </Badge>
                  )}
                  {document.isPublic ? (
                    <Badge variant="outline" className="text-green-600 border-green-600">
                      Public
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-gray-600 border-gray-600">
                      Private
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <Eye className="w-4 h-4 mr-2" />
                  Preview
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Share className="w-4 h-4 mr-2" />
                  Share
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleTogglePublic(document)}>
                  <Eye className="w-4 h-4 mr-2" />
                  Make {document.isPublic ? 'Private' : 'Public'}
                </DropdownMenuItem>
                {document.type === "resume" && !document.isPrimary && (
                  <DropdownMenuItem onClick={() => handleSetPrimary(document)}>
                    <Star className="w-4 h-4 mr-2" />
                    Set as Primary
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Details
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-red-600"
                  onClick={() => {
                    setDocumentToDelete(document);
                    setDeleteDialogOpen(true);
                  }}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          {document.description && (
            <p className="text-sm text-gray-600 mb-3">{document.description}</p>
          )}
          
          {document.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {document.tags.map((tag, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
          
          {document.relatedTo && (
            <div className="flex items-center text-xs text-gray-500 mb-3">
              <Building2 className="w-3 h-3 mr-1" />
              Related to: {document.relatedTo.name}
            </div>
          )}
          
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center">
              <Calendar className="w-3 h-3 mr-1" />
              Uploaded {format(document.uploadDate, "MMM d, yyyy")}
            </div>
            <div className="flex items-center">
              <Clock className="w-3 h-3 mr-1" />
              Modified {format(document.lastModified, "MMM d, yyyy")}
            </div>
          </div>
          
          <div className="flex space-x-2 mt-4">
            <Button size="sm" variant="outline" className="flex-1">
              <Eye className="w-4 h-4 mr-1" />
              Preview
            </Button>
            <Button size="sm" variant="outline" className="flex-1">
              <Download className="w-4 h-4 mr-1" />
              Download
            </Button>
            <Button size="sm" variant="outline">
              <Share className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Documents</h1>
          <p className="text-gray-600 mt-1">
            Manage your resumes, certificates, and other documents
          </p>
        </div>
        <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Upload className="w-4 h-4 mr-2" />
              Upload Documents
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload Documents</DialogTitle>
              <DialogDescription>
                Upload your resumes, certificates, cover letters, and other documents.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-2">Drag and drop files here, or click to browse</p>
                <p className="text-sm text-gray-500">Supports PDF, DOC, DOCX, JPG, PNG, ZIP (max 10MB each)</p>
                <Input
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.zip"
                  onChange={(e) => handleFileUpload(e.target.files)}
                  className="mt-4"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>
                Cancel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Documents</p>
                <p className="text-2xl font-bold text-gray-900">{counts.all}</p>
              </div>
              <FileText className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Resumes</p>
                <p className="text-2xl font-bold text-blue-600">{counts.resume}</p>
              </div>
              <FileText className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Certificates</p>
                <p className="text-2xl font-bold text-purple-600">{counts.certificate}</p>
              </div>
              <Award className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Portfolio Items</p>
                <p className="text-2xl font-bold text-orange-600">{counts.portfolio}</p>
              </div>
              <Image className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search documents, tags, or descriptions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    <Filter className="w-4 h-4 mr-2" />
                    {typeFilter === "all" ? "All Types" : documentTypeConfig[typeFilter as keyof typeof documentTypeConfig]?.label}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setTypeFilter("all")}>
                    All Types
                  </DropdownMenuItem>
                  {Object.entries(documentTypeConfig).map(([key, config]) => (
                    <DropdownMenuItem key={key} onClick={() => setTypeFilter(key)}>
                      <config.icon className="w-4 h-4 mr-2" />
                      {config.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Documents List */}
      <Tabs value={typeFilter} onValueChange={setTypeFilter}>
        <TabsList className="grid w-full grid-cols-4 md:grid-cols-7">
          <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
          <TabsTrigger value="resume">Resumes ({counts.resume})</TabsTrigger>
          <TabsTrigger value="cover_letter">Cover Letters ({counts.cover_letter})</TabsTrigger>
          <TabsTrigger value="certificate">Certificates ({counts.certificate})</TabsTrigger>
          <TabsTrigger value="portfolio">Portfolio ({counts.portfolio})</TabsTrigger>
          <TabsTrigger value="transcript">Transcripts ({counts.transcript})</TabsTrigger>
          <TabsTrigger value="other">Other ({counts.other})</TabsTrigger>
        </TabsList>
        
        <TabsContent value={typeFilter} className="mt-6">
          {isUploading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400 mr-2" />
              <span className="text-gray-600">Uploading documents...</span>
            </div>
          ) : filteredDocuments.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No documents found
                </h3>
                <p className="text-gray-600 mb-4">
                  {searchTerm || typeFilter !== "all"
                    ? "Try adjusting your search or filters."
                    : "Upload your first document to get started."}
                </p>
                <Button onClick={() => setUploadDialogOpen(true)}>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Documents
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredDocuments.map((document) => (
                <DocumentCard key={document.id} document={document} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{documentToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDocumentToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => documentToDelete && handleDeleteDocument(documentToDelete)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}