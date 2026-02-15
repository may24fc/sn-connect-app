import { Button } from '../../primitives/button';
import { Input } from '../../primitives/input';
import { Label } from '../../primitives/label';

export interface AttachmentUploaderProps {
  onFileSelected: (file: File) => void;
  isUploading?: boolean;
}

export function AttachmentUploader({ onFileSelected, isUploading }: AttachmentUploaderProps) {
  return (
    <div className="space-y-3 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4">
      <Label>Attachment</Label>
      <Input
        type="file"
        accept="image/jpeg,image/png,image/gif,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onFileSelected(file);
        }}
      />
      <p className="text-xs text-zinc-500 dark:text-zinc-400">Max file size: 10MB</p>
      {isUploading ? (
        <Button
          disabled
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md font-medium"
        >
          Uploading...
        </Button>
      ) : null}
    </div>
  );
}
