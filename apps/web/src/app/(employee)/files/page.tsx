'use client';

import { useState, type ReactNode } from 'react';
import {
  Upload,
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle,
  Download,
  Eye,
  MoreVertical,
  Search,
  Filter,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Progress,
  Input,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@hr-portal/ui';

type DocumentStatus = 'approved' | 'pending' | 'missing' | 'rejected';

interface Document {
  id: string;
  name: string;
  category: string;
  status: DocumentStatus;
  uploadedAt?: string;
  reviewedAt?: string;
  required: boolean;
}

// Mock data - replace with actual data fetching
const documents: Document[] = [
  {
    id: '1',
    name: 'Government ID (Front & Back)',
    category: 'Identity',
    status: 'approved',
    uploadedAt: '2024-01-05',
    reviewedAt: '2024-01-06',
    required: true,
  },
  {
    id: '2',
    name: 'Birth Certificate',
    category: 'Identity',
    status: 'approved',
    uploadedAt: '2024-01-05',
    reviewedAt: '2024-01-06',
    required: true,
  },
  {
    id: '3',
    name: 'NBI Clearance',
    category: 'Clearances',
    status: 'pending',
    uploadedAt: '2024-01-10',
    required: true,
  },
  {
    id: '4',
    name: 'SSS E1 Form',
    category: 'Government',
    status: 'missing',
    required: true,
  },
  {
    id: '5',
    name: 'PhilHealth MDR',
    category: 'Government',
    status: 'missing',
    required: true,
  },
  {
    id: '6',
    name: 'Pag-IBIG MID',
    category: 'Government',
    status: 'rejected',
    uploadedAt: '2024-01-08',
    reviewedAt: '2024-01-09',
    required: true,
  },
  {
    id: '7',
    name: 'TIN Certificate',
    category: 'Government',
    status: 'approved',
    uploadedAt: '2024-01-05',
    reviewedAt: '2024-01-06',
    required: true,
  },
  {
    id: '8',
    name: 'Diploma / TOR',
    category: 'Education',
    status: 'pending',
    uploadedAt: '2024-01-07',
    required: true,
  },
];

const statusConfig: Record<
  DocumentStatus,
  { label: string; variant: 'approved' | 'pending' | 'error' | 'secondary'; icon: typeof CheckCircle2 }
> = {
  approved: { label: 'Approved', variant: 'approved', icon: CheckCircle2 },
  pending: { label: 'Pending Review', variant: 'pending', icon: Clock },
  missing: { label: 'Not Uploaded', variant: 'secondary', icon: AlertCircle },
  rejected: { label: 'Rejected', variant: 'error', icon: AlertCircle },
};

export default function FilesPage(): ReactNode {
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);

  const filteredDocuments = documents.filter((doc) =>
    doc.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = {
    total: documents.length,
    approved: documents.filter((d) => d.status === 'approved').length,
    pending: documents.filter((d) => d.status === 'pending').length,
    missing: documents.filter((d) => d.status === 'missing').length,
    rejected: documents.filter((d) => d.status === 'rejected').length,
  };

  const completionPercentage = Math.round(
    (stats.approved / stats.total) * 100
  );

  const handleUpload = (doc: Document): void => {
    setSelectedDocument(doc);
    setUploadDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">My 201 Files</h1>
        <p className="text-muted-foreground">
          Manage and upload your employment documents
        </p>
      </div>

      {/* Progress Overview */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <h2 className="text-lg font-semibold">Document Completion</h2>
              <div className="flex items-center gap-2">
                <Progress value={completionPercentage} className="h-3 w-48" />
                <span className="text-sm font-medium">
                  {completionPercentage}%
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                {stats.approved} of {stats.total} documents approved
              </p>
            </div>

            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-success" />
                <span className="text-sm">Approved ({stats.approved})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-warning" />
                <span className="text-sm">Pending ({stats.pending})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-muted" />
                <span className="text-sm">Missing ({stats.missing})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-error" />
                <span className="text-sm">Rejected ({stats.rejected})</span>
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
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-sm font-medium truncate">
                        {doc.name}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        {doc.category}
                      </CardDescription>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {doc.status !== 'missing' && (
                        <>
                          <DropdownMenuItem>
                            <Eye className="mr-2 h-4 w-4" />
                            View
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Download className="mr-2 h-4 w-4" />
                            Download
                          </DropdownMenuItem>
                        </>
                      )}
                      <DropdownMenuItem onClick={() => handleUpload(doc)}>
                        <Upload className="mr-2 h-4 w-4" />
                        {doc.status === 'missing' ? 'Upload' : 'Replace'}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Badge variant={config.variant} className="gap-1">
                    <StatusIcon className="h-3 w-3" />
                    {config.label}
                  </Badge>

                  {doc.uploadedAt && (
                    <p className="text-xs text-muted-foreground">
                      Uploaded: {doc.uploadedAt}
                    </p>
                  )}

                  {doc.status === 'missing' || doc.status === 'rejected' ? (
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={() => handleUpload(doc)}
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      Upload Document
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
            <DialogDescription>
              {selectedDocument?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg border-2 border-dashed border-border p-8 text-center">
              <Upload className="mx-auto h-10 w-10 text-muted-foreground" />
              <p className="mt-2 text-sm font-medium">
                Drag and drop your file here
              </p>
              <p className="text-xs text-muted-foreground">
                or click to browse from your computer
              </p>
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
            <Button onClick={() => setUploadDialogOpen(false)}>
              Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
