import { X } from 'lucide-react';
import { type KeyboardEvent, useCallback, useState } from 'react';
import { Badge } from '../../primitives/badge';
import { Input } from '../../primitives/input';

export interface TagInputProps {
  value: Array<string>;
  onChange: (tags: Array<string>) => void;
  maxTags?: number;
  placeholder?: string;
}

export function TagInput({
  value,
  onChange,
  maxTags = 20,
  placeholder = 'Add a tag and press Enter',
}: TagInputProps) {
  const [input, setInput] = useState('');

  const addTag = useCallback(
    (tag: string) => {
      const trimmed = tag.trim().toLowerCase();
      if (!trimmed || value.includes(trimmed) || value.length >= maxTags) return;
      onChange([...value, trimmed]);
      setInput('');
    },
    [value, onChange, maxTags]
  );

  const removeTag = useCallback(
    (tag: string) => {
      onChange(value.filter((t) => t !== tag));
    },
    [value, onChange]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addTag(input);
      } else if (e.key === 'Backspace' && !input && value.length > 0) {
        const lastTag = value[value.length - 1];
        if (lastTag) {
          removeTag(lastTag);
        }
      }
    },
    [input, value, addTag, removeTag]
  );

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {value.map((tag) => (
          <Badge key={tag} variant="indigo" className="gap-1 pr-1">
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="rounded-full p-0.5 hover:bg-indigo-700/20"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
      <Input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={value.length >= maxTags ? `Max ${maxTags} tags` : placeholder}
        disabled={value.length >= maxTags}
      />
    </div>
  );
}
