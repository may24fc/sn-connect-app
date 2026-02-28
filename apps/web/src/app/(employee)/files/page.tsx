'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useDocuments, useDownloadDocument, useUploadDocument } from '@/hooks/useDocuments';
import { useEmployees } from '@/hooks/useEmployees';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  FileDropZone,
} from '@hr-portal/ui';
import { Download, FileText, Upload } from 'lucide-react';
import { useCallback, useState } from 'react';

const MAX_FILES = 5;

export default function FilesPage() {
  const { user } = useAuth();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<Array<File>>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Fetch the current user's employee record to get the employee ID
  const { data: empLookup } = useEmployees({
    search: user?.email || '',
    pageSize: 1,
  });
  const employee = empLookup?.data?.[0] ?? null;

  const { data: docsData, isLoading } = useDocuments({
    employeeId: employee?.id,
  });

  const upload = useUploadDocument();
  const download = useDownloadDocument();

  const documents = docsData?.data ?? [];

  const handleFilesSelected = useCallback((files: Array<File>) => {
    setSelectedFiles((prev) => {
      const combined = [...prev, ...files];
      // Limit to MAX_FILES
      return combined.slice(0, MAX_FILES);
    });
  }, []);

  const handleRemoveFile = useCallback((index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleUpload = async () => {
    if (selectedFiles.length === 0 || !employee?.id) return;

    setIsUploading(true);
    try {
      // Upload all files sequentially
      for (const file of selectedFiles) {
        await upload.mutateAsync({
          file,
          employeeId: employee.id,
          documentType: 'other',
          isConfidential: false,
        });
      }
      setUploadOpen(false);
      setSelectedFiles([]);
    } catch (e) {
      console.error(e);
    } finally {
      setIsUploading(false);
    }
  };

  const handleCloseDialog = () => {
    if (!isUploading) {
      setUploadOpen(false);
      setSelectedFiles([]);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Documents</h1>
        <p className="text-sm text-muted-foreground">Manage and upload your employment documents</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Documents</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <FileText />
              <div>
                <div className="text-sm font-medium">Total</div>
                <div className="text-xs text-muted-foreground">{documents.length}</div>
              </div>
            </div>
            <div>
              <Button onClick={() => setUploadOpen(true)}>
                <Upload className="mr-2 h-4 w-4" />
                Upload
              </Button>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {isLoading ? (
              <div className="text-sm text-muted-foreground">Loading...</div>
            ) : documents.length === 0 ? (
              <div className="text-sm text-muted-foreground">No documents yet</div>
            ) : (
              documents.map((d: any) => (
                <div key={d.id} className="flex items-center justify-between border rounded p-3">
                  <div className="flex items-center gap-3">
                    <FileText />
                    <div>
                      <div className="text-sm">{d.file_name}</div>
                      <div className="text-xs text-muted-foreground">{d.document_type}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {d.is_confidential && <Badge variant="outline">Confidential</Badge>}
                    <Button onClick={() => download.mutateAsync(d.id)} size="sm">
                      <Download />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={uploadOpen} onOpenChange={handleCloseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Documents</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <FileDropZone
              onFilesSelected={handleFilesSelected}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,image/jpeg,image/png,image/gif"
              maxSizeMB={10}
              multiple
              maxFiles={MAX_FILES}
              selectedFiles={selectedFiles}
              onRemoveFile={handleRemoveFile}
              isUploading={isUploading}
              formatHint={`PDF, Word, Excel, PowerPoint, Images — max 10 MB each (up to ${MAX_FILES} files)`}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog} disabled={isUploading}>
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={selectedFiles.length === 0 || !employee?.id || isUploading}
            >
              {isUploading
                ? 'Uploading...'
                : `Upload ${selectedFiles.length > 0 ? `(${selectedFiles.length})` : ''}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
