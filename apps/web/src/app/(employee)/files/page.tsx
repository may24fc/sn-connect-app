'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useDocuments, useDownloadDocument, useUploadDocument } from '@/hooks/useDocuments';
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
  Input,
  Label,
} from '@hr-portal/ui';
import { Download, FileText, Upload } from 'lucide-react';
import { useState } from 'react';

export default function FilesPage() {
  const { user } = useAuth();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [fileInput, setFileInput] = useState<File | null>(null);

  const { data: docsData, isLoading } = useDocuments({
    search: user?.email || '',
  });

  const upload = useUploadDocument();
  const download = useDownloadDocument();

  const documents = docsData?.data ?? [];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setFileInput(f);
  };

  const handleUpload = async () => {
    if (!fileInput) return;
    try {
      await upload.mutateAsync({
        file: fileInput,
        employeeId: '',
        documentType: 'other',
        isConfidential: false,
      });
      setUploadOpen(false);
      setFileInput(null);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My 201 Files</h1>
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

      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="file">File</Label>
              <Input id="file" type="file" onChange={handleFileChange} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpload} disabled={!fileInput}>
              Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
