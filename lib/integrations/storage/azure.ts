import { BlobServiceClient, ContainerClient } from '@azure/storage-blob';

interface AzureStorageConfig {
  connectionString: string;
  resumesContainer: string;
  candidatesContainer: string;
  recordingsContainer: string;
}

class AzureStorageService {
  private blobServiceClient: BlobServiceClient;
  private config: AzureStorageConfig;

  constructor() {
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    if (!connectionString) {
      throw new Error('AZURE_STORAGE_CONNECTION_STRING is not configured');
    }

    this.config = {
      connectionString,
      resumesContainer: process.env.AZURE_CONTAINER_RESUMES || 'resumes',
      candidatesContainer: process.env.AZURE_CONTAINER_CANDIDATES || 'candidates',
      recordingsContainer: process.env.AZURE_CONTAINER_VIDEOS || 'interview-videos'
    };

    this.blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
  }

  /**
   * Initialize containers if they don't exist
   */
  async initializeContainers(): Promise<void> {
    try {
      // Create resumes container with private access
      const resumesContainer = this.blobServiceClient.getContainerClient(this.config.resumesContainer);
      await resumesContainer.createIfNotExists();
      
      // Create candidates container with private access
      const candidatesContainer = this.blobServiceClient.getContainerClient(this.config.candidatesContainer);
      await candidatesContainer.createIfNotExists();
      
      // Create recordings container with private access
      const recordingsContainer = this.blobServiceClient.getContainerClient(this.config.recordingsContainer);
      await recordingsContainer.createIfNotExists();
      
      console.log('Azure Storage containers initialized successfully');
    } catch (error) {
      console.error('Error initializing Azure Storage containers:', error);
      throw error;
    }
  }

  /**
   * Create candidate folder structure upon registration
   */
  async createCandidateFolder(candidateId: string): Promise<boolean> {
    try {
      const containerClient = this.getCandidatesContainer();
      await containerClient.createIfNotExists();
      
      // Create folder structure by uploading placeholder files
      const folders = ['resumes', 'cover-letters', 'certificates', 'portfolios', 'transcripts', 'other'];
      
      for (const folder of folders) {
        const blobName = `candidate-${candidateId}/${folder}/.placeholder`;
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);
        
        // Upload a small placeholder file to create the folder structure
        await blockBlobClient.upload('', 0, {
          blobHTTPHeaders: {
            blobContentType: 'text/plain'
          },
          metadata: {
            candidateId,
            folderType: folder,
            createdAt: new Date().toISOString(),
            purpose: 'folder-structure'
          }
        });
      }
      
      console.log(`Candidate folder structure created for candidate: ${candidateId}`);
      return true;
    } catch (error) {
      console.error('Error creating candidate folder structure:', error);
      return false;
    }
  }

  /**
   * Get container client for resumes (company dashboard uploads)
   */
  getResumesContainer(): ContainerClient {
    return this.blobServiceClient.getContainerClient(this.config.resumesContainer);
  }

  /**
   * Get container client for candidates (candidate dashboard uploads)
   */
  getCandidatesContainer(): ContainerClient {
    return this.blobServiceClient.getContainerClient(this.config.candidatesContainer);
  }

  /**
   * Get container client for interview recordings
   */
  getRecordingsContainer(): ContainerClient {
    return this.blobServiceClient.getContainerClient(this.config.recordingsContainer);
  }

  /**
   * Upload candidate document to organized folder structure (File input)
   */
  async uploadCandidateDocument(
    file: File, 
    candidateId: string, 
    documentType: 'resume' | 'cover_letter' | 'certificate' | 'portfolio' | 'transcript' | 'other',
    isPrimary?: boolean
  ): Promise<{
    success: boolean;
    url: string;
    blobPath: string;
    originalFileName: string;
    description: string;
    isPrimary: string;
    uploadedAt: string;
  }>;

  /**
   * Upload candidate document to organized folder structure (Buffer input for resume parser)
   */
  async uploadCandidateDocument(
    candidateId: string,
    buffer: Buffer,
    fileName: string,
    mimeType: string,
    documentType: 'resume' | 'cover_letter' | 'certificate' | 'portfolio' | 'transcript' | 'other',
    metadata: {
      originalFileName: string;
      description: string;
      isPrimary: string;
      uploadedAt: string;
    }
  ): Promise<{
    success: boolean;
    url: string;
    blobPath: string;
    originalFileName: string;
    description: string;
    isPrimary: string;
    uploadedAt: string;
  }>;

  /**
   * Upload candidate document implementation
   */
  async uploadCandidateDocument(
    fileOrCandidateId: File | string,
    candidateIdOrBuffer: string | Buffer,
    documentTypeOrFileName?: 'resume' | 'cover_letter' | 'certificate' | 'portfolio' | 'transcript' | 'other' | string,
    isPrimaryOrMimeType?: boolean | string,
    metadataOrUndefined?: any,
    metadataParam?: any
  ): Promise<{
    success: boolean;
    url: string;
    blobPath: string;
    originalFileName: string;
    description: string;
    isPrimary: string;
    uploadedAt: string;
  }> {
    try {
      const containerClient = this.getCandidatesContainer();
      await containerClient.createIfNotExists();
      
      let candidateId: string;
      let buffer: Buffer;
      let fileName: string;
      let mimeType: string;
      let documentType: string;
      let metadata: any;
      
      // Handle different method signatures
      if (typeof fileOrCandidateId === 'string') {
        // Buffer input signature (for resume parser)
        candidateId = fileOrCandidateId;
        buffer = candidateIdOrBuffer as Buffer;
        fileName = documentTypeOrFileName as string;
        mimeType = isPrimaryOrMimeType as string;
        documentType = metadataOrUndefined;
        metadata = metadataParam;
      } else {
        // File input signature (for document upload)
        const file = fileOrCandidateId;
        candidateId = candidateIdOrBuffer as string;
        documentType = documentTypeOrFileName as string;
        const isPrimary = (isPrimaryOrMimeType as boolean) ?? false;
        
        const arrayBuffer = await file.arrayBuffer();
        buffer = Buffer.from(arrayBuffer);
        fileName = file.name;
        mimeType = file.type;
        
        metadata = {
          originalFileName: file.name,
          description: `${documentType} uploaded via candidate dashboard`,
          isPrimary: isPrimary.toString(),
          uploadedAt: new Date().toISOString()
        };
      }
      
      // Map document types to folder names
      const folderMap = {
        'resume': 'resumes',
        'cover_letter': 'cover-letters',
        'certificate': 'certificates',
        'portfolio': 'portfolios',
        'transcript': 'transcripts',
        'other': 'other'
      };
      
      const folder = folderMap[documentType as keyof typeof folderMap] || 'other';
      const timestamp = Date.now();
      const fileExtension = fileName.split('.').pop();
      
      // Create filename with primary indicator
      let finalFileName: string;
      if (documentType === 'resume' && metadata.isPrimary === 'true') {
        finalFileName = `primary-resume.${fileExtension}`;
      } else {
        finalFileName = `${fileName.replace(/\.[^/.]+$/, '')}-${timestamp}.${fileExtension}`;
      }
      
      const blobName = `candidate-${candidateId}/${folder}/${finalFileName}`;
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);
      
      await blockBlobClient.uploadData(buffer, {
        blobHTTPHeaders: {
          blobContentType: mimeType
        },
        metadata: {
          candidateId,
          documentType,
          originalFileName: metadata.originalFileName,
          isPrimary: metadata.isPrimary,
          uploadedAt: metadata.uploadedAt,
          fileSize: buffer.length.toString(),
          description: metadata.description
        }
      });
      
      console.log(`Document uploaded successfully: ${blobName}`);
      
      return {
        success: true,
        url: blockBlobClient.url,
        blobPath: blobName,
        originalFileName: metadata.originalFileName,
        description: metadata.description,
        isPrimary: metadata.isPrimary,
        uploadedAt: metadata.uploadedAt
      };
    } catch (error) {
      console.error('Error uploading candidate document:', error);
      return {
        success: false,
        url: '',
        blobPath: '',
        originalFileName: '',
        description: '',
        isPrimary: 'false',
        uploadedAt: new Date().toISOString()
      };
    }
  }

  /**
   * Upload resume file to Azure Storage (for company dashboard and job campaigns)
   */
  async uploadResume(file: File, fileName: string): Promise<string> {
    try {
      const containerClient = this.getResumesContainer();
      await containerClient.createIfNotExists();
      
      const blockBlobClient = containerClient.getBlockBlobClient(fileName);
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      await blockBlobClient.uploadData(buffer, {
        blobHTTPHeaders: {
          blobContentType: file.type
        }
      });
      
      return blockBlobClient.url;
    } catch (error) {
      console.error('Error uploading resume to Azure Blob Storage:', error);
      throw error;
    }
  }

  /**
   * Upload file to a specific container (legacy method)
   */
  async uploadFile(file: File, fileName: string, containerName: string): Promise<string> {
    try {
      const containerClient = this.blobServiceClient.getContainerClient(containerName);
      await containerClient.createIfNotExists();
      
      const blockBlobClient = containerClient.getBlockBlobClient(fileName);
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      await blockBlobClient.uploadData(buffer, {
        blobHTTPHeaders: {
          blobContentType: file.type
        }
      });
      
      return blockBlobClient.url;
    } catch (error) {
      console.error('Error uploading file to Azure Blob Storage:', error);
      throw error;
    }
  }

  /**
   * Upload interview recording to Azure Blob Storage
   */
  async uploadRecording(recordingBlob: Blob, fileName: string, interviewId: string): Promise<string> {
    try {
      const containerClient = this.getRecordingsContainer();
      await containerClient.createIfNotExists();
      
      // Create folder structure: interviews/{interviewId}/{fileName}
      const blobName = `interviews/${interviewId}/${fileName}`;
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);
      
      const arrayBuffer = await recordingBlob.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      await blockBlobClient.uploadData(buffer, {
        blobHTTPHeaders: {
          blobContentType: recordingBlob.type || 'video/webm'
        },
        metadata: {
          interviewId,
          uploadedAt: new Date().toISOString(),
          recordingType: 'interview-video'
        }
      });
      
      return blockBlobClient.url;
    } catch (error) {
      console.error('Error uploading recording to Azure Blob Storage:', error);
      throw error;
    }
  }

  /**
   * Upload audio recording to Azure Blob Storage
   */
  async uploadAudioRecording(audioBlob: Blob, fileName: string, interviewId: string, questionIndex?: number): Promise<string> {
    try {
      const containerClient = this.getRecordingsContainer();
      await containerClient.createIfNotExists();
      
      // Create folder structure: interviews/{interviewId}/audio/{fileName}
      const blobName = questionIndex !== undefined 
        ? `interviews/${interviewId}/audio/question-${questionIndex}-${fileName}`
        : `interviews/${interviewId}/audio/${fileName}`;
      
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);
      
      const arrayBuffer = await audioBlob.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      await blockBlobClient.uploadData(buffer, {
        blobHTTPHeaders: {
          blobContentType: audioBlob.type || 'audio/webm'
        },
        metadata: {
          interviewId,
          questionIndex: questionIndex?.toString() || 'general',
          uploadedAt: new Date().toISOString(),
          recordingType: 'interview-audio'
        }
      });
      
      return blockBlobClient.url;
    } catch (error) {
      console.error('Error uploading audio recording to Azure Blob Storage:', error);
      throw error;
    }
  }

  /**
   * Delete candidate document from Azure Blob Storage
   */
  async deleteCandidateDocument(candidateId: string, blobPath: string): Promise<boolean> {
    try {
      const containerClient = this.getCandidatesContainer();
      const blockBlobClient = containerClient.getBlockBlobClient(blobPath);
      
      await blockBlobClient.delete();
      console.log(`Candidate document deleted successfully: ${blobPath}`);
      return true;
    } catch (error) {
      console.error('Error deleting candidate document from Azure Blob Storage:', error);
      return false;
    }
  }

  /**
   * List all documents for a specific candidate
   */
  async listCandidateDocuments(candidateId: string): Promise<Array<{
    name: string;
    url: string;
    type: string;
    size: number;
    lastModified: Date;
    metadata: Record<string, string>;
  }>> {
    try {
      const containerClient = this.getCandidatesContainer();
      const documents: Array<{
        name: string;
        url: string;
        type: string;
        size: number;
        lastModified: Date;
        metadata: Record<string, string>;
      }> = [];
      
      const prefix = `candidate-${candidateId}/`;
      
      for await (const blob of containerClient.listBlobsFlat({ 
        prefix,
        includeMetadata: true 
      })) {
        // Skip placeholder files
        if (blob.name.endsWith('.placeholder')) continue;
        
        const blockBlobClient = containerClient.getBlockBlobClient(blob.name);
        
        documents.push({
          name: blob.name,
          url: blockBlobClient.url,
          type: blob.properties.contentType || 'application/octet-stream',
          size: blob.properties.contentLength || 0,
          lastModified: blob.properties.lastModified || new Date(),
          metadata: blob.metadata || {}
        });
      }
      
      return documents;
    } catch (error) {
      console.error('Error listing candidate documents:', error);
      return [];
    }
  }

  /**
   * Delete resume from Azure Blob Storage (for company dashboard uploads)
   */
  async deleteResume(blobName: string): Promise<boolean> {
    try {
      const containerClient = this.getResumesContainer();
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);
      
      await blockBlobClient.delete();
      console.log(`Resume deleted successfully: ${blobName}`);
      return true;
    } catch (error) {
      console.error('Error deleting resume from Azure Blob Storage:', error);
      return false;
    }
  }

  /**
   * Delete recording from Azure Blob Storage
   */
  async deleteRecording(blobName: string): Promise<boolean> {
    try {
      const containerClient = this.getRecordingsContainer();
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);
      
      await blockBlobClient.delete();
      return true;
    } catch (error) {
      console.error('Error deleting recording from Azure Blob Storage:', error);
      return false;
    }
  }

  /**
   * List recordings for a specific interview
   */
  async listInterviewRecordings(interviewId: string): Promise<string[]> {
    try {
      const containerClient = this.getRecordingsContainer();
      const recordings: string[] = [];
      
      for await (const blob of containerClient.listBlobsFlat({ prefix: `interviews/${interviewId}/` })) {
        recordings.push(blob.name);
      }
      
      return recordings;
    } catch (error) {
      console.error('Error listing interview recordings:', error);
      return [];
    }
  }

  /**
   * Get recording URL
   */
  getRecordingUrl(blobName: string): string {
    const containerClient = this.getRecordingsContainer();
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    return blockBlobClient.url;
  }

  /**
   * Generate SAS URL for secure access to recordings
   */
  async generateSasUrl(blobName: string, expiryHours: number = 24): Promise<string> {
    try {
      const containerClient = this.getRecordingsContainer();
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);
      
      // For production, implement SAS token generation
      // This is a simplified version - in production, you'd generate actual SAS tokens
      return blockBlobClient.url;
    } catch (error) {
      console.error('Error generating SAS URL:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const azureStorageService = new AzureStorageService();
export default azureStorageService;

// Export types
export type { AzureStorageConfig };