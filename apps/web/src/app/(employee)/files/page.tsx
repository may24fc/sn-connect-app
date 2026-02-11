'use client';

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Input,
  Progress,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Label,
} from '@hr-portal/ui';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileText,
  Filter,
  MoreVertical,
  Search,
  Upload,
} from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useDocuments, useUploadDocument, useDownloadDocument } from '@/hooks/useDocuments';
import { useEmployees } from '@/hooks/useEmployees';
import type { DocumentType } from '@repo/database';

export default function FilesPage(): ReactNode {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<string>('contract');
  const [isConfidential, setIsConfidential] = useState(false);
  const [notes, setNotes] = useState('');
  
  // Fetch current user's employee record
  const { data: employeesData } = useEmployees({
    search: user?.email || '',
    pageSize: 1,
  });
  const employeeId = employeesData?.data?.[0]?.id;

  // Fetch documents for current employee
  const { data: documentsData, isLoading } = useDocuments({
    employeeId,
    search: searchQuery,
  });

  const uploadDocument = useUploadDocument();
  const downloadDocument = useDownloadDocument();

  const documents = documentsData?.data || [];

  const stats = {
    total: documents.length,
    uploaded: documents.length,
    pending: 0,
    missing: 8 - documents.length, // Assume 8 required documents
  };

  const completionPercentage = documents.length > 0 ? Math.round((documents.length / 8) * 100) : 0;

  const handleUpload = (): void => {
    setUploadDialogOpen(true);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleSubmitUpload = async (): Promise<void> => {
    if (!selectedFile || !employeeId) return;

    try {
      await uploadDocument.mutateAsync({
        file: selectedFile,
        employeeId,
        documentType,
        isConfidential,
        notes: notes || undefined,
      });
      setUploadDialogOpen(false);
      setSelectedFile(null);
      setNotes('');
    } catch (error) {
      console.error('Failed to upload document:', error);
    }uploaded} documents upload
  };

  const handleDownload = async (docId: string): Promise<void> => {
    try {
      await downloadDocument.mutateAsync(docId);
    } catch (error) {
      console.error('Failed to download document:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">My 201 Files</h1>
        <p className="text-muted-foreground">Manage and upload your employment documents</p>
      </div>

      {/* Progress Overview */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <h2 className="text-lg font-semibold">Document Completion</h2>
              <div className="flex items-center gap-2">
                <Progress value={completionPercentage} className="h-3 w-48" />
                <span className="text-sm font-medium">{completionPercentage}%</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {stats.approved} of {stats.total} documents approved
              </p>
            </div>

            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-success" />
                <span className="text-sm">Uploaded ({stats.uploaded})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-muted" />
                <span className="text-sm">Missing ({stats.missing})</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search and Filter */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline">
          <Filter className="mr-2 h-4 w-4" />
          Filter
        </Button>
      </div>

      {/* Document Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredDocuments.map((doc) => {
          const config = statusConfig[doc.status];
          const StatusIcon = config.icon;

          return (
            <Card key={doc.id} className="relative">
              <CardHeader className="pb-2">
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : documents.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No documents yet</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Upload your first document to get started
            </p>
            <Button className="mt-4" onClick={handleUpload}>
              <Upload className="mr-2 h-4 w-4" />
              Upload Document
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {documents.map((doc) => (
            <Card key={doc.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-sm font-medium truncate">
                        {doc.file_name}
                      </CardTitle>
                      <CardDescription className="text-xs">{doc.document_type}</CardDescription>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleDownload(doc.id)}>
                        <Download className="mr-2 h-4 w-4" />
                        Download
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Badge variant="secondary" className="gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Uploaded
                  </Badge>
                  {doc.uploaded_at && (
                    <p className="text-xs text-muted-foreground">
                      Uploaded: {new Date(doc.uploaded_at).toLocaleDateString()}
                    </p>
                  )}
                  {doc.is_confidential && (
                    <Badge variant="outline" className="text-xs">
                      Confidential
                    </Badge>
              Upload a document to your 201 file
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="documentType">Document Type</Label>
              <Select value={documentType} onValueChange={setDocumentType}>
                <SelectTrigger id="documentType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="contract">Contract</SelectItem>
                  <SelectItem value="id">ID</SelectItem>
                  <SelectItem value="certificate">Certificate</SelectItem>
                  <SelectItem value="resume">Resume</SelectItem>
                  <SelectItem value="tax_document">Tax Document</SelectItem>
                  <SelectItem value="nda">NDA</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="file">File</Label>
              <Input
                id="file"
                type="file"
                onChange={handleFileSelect}
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
              />
              {selectedFile && (
                <p className="text-sm text-muted-foreground">
                  Selected: {selectedFile.name}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Input
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any additional notes..."
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="confidential"
                checked={isConfidential}
                onChange={(e) => setIsConfidential(e.target.checked)}
                className="rounded border-gray-300"
              />
              <Label htmlFor="confidential" className="text-sm">
                Mark as confidential
              </Label>
            </div>

            <p className="text-xs text-muted-foreground">
              Accepted formats: PDF, JPG, PNG, DOC, DOCX, XLS, XLSX (max 10MB)
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setUploadDialogOpen(false);
                setSelectedFile(null);
                setNotes('');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitUpload}
              disabled={!selectedFile || uploadDocument.isPending}
            >
              {uploadDocument.isPending ? 'Uploading...' : 'Upload'}
            border p-8 text-center">
              <Upload className="mx-auto h-10 w-10 text-muted-foreground" />
              <p className="mt-2 text-sm font-medium">Drag and drop your file here</p>
              <p className="text-xs text-muted-foreground">or click to browse from your computer</p>
              <Button variant="outline" size="sm" className="mt-4">
                Choose File
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Accepted formats: PDF, JPG, PNG (max 10MB)
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setUploadDialogOpen(false)}>Upload</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
