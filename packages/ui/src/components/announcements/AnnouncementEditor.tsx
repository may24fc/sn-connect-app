import { Label } from '../../primitives/label';
import { Textarea } from '../../primitives/textarea';

export interface AnnouncementEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export function AnnouncementEditor({ value, onChange }: AnnouncementEditorProps) {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 min-h-[400px]">
      <Label className="mb-2 block">Content</Label>
      <Textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-[320px]"
        placeholder="Write announcement details..."
      />
    </div>
  );
}
