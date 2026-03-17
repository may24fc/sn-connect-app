'use client';

import {
  ArrowUp,
  FileText,
  Loader2,
  Paperclip,
  Square,
  X,
} from 'lucide-react';
import * as React from 'react';
import { cn } from '../../utils/cn';

/* --- UTILS --- */
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

/* --- TYPES --- */
export interface AttachedFile {
  id: string;
  file: File;
  type: string;
  preview: string | null;
  uploadStatus: 'pending' | 'uploading' | 'complete';
}

/* --- FILE PREVIEW CARD --- */
interface FilePreviewCardProps {
  file: AttachedFile;
  onRemove: (id: string) => void;
}

const FilePreviewCard: React.FC<FilePreviewCardProps> = ({ file, onRemove }) => {
  const isImage = file.type.startsWith('image/') && file.preview;

  return (
    <div className="relative group flex-shrink-0 w-24 h-24 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 animate-fade-in transition-all hover:border-zinc-400 dark:hover:border-zinc-500">
      {isImage ? (
        <div className="w-full h-full relative">
          <img
            src={file.preview!}
            alt={file.file.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors" />
        </div>
      ) : (
        <div className="w-full h-full p-3 flex flex-col justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-zinc-200 dark:bg-zinc-700 rounded">
              <FileText className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
            </div>
            <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider truncate">
              {file.file.name.split('.').pop()}
            </span>
          </div>
          <div className="space-y-0.5">
            <p
              className="text-xs font-medium text-zinc-700 dark:text-zinc-200 truncate"
              title={file.file.name}
            >
              {file.file.name}
            </p>
            <p className="text-[10px] text-zinc-400 dark:text-zinc-500">
              {formatFileSize(file.file.size)}
            </p>
          </div>
        </div>
      )}

      {/* Remove Button Overlay */}
      <button
        type="button"
        onClick={() => onRemove(file.id)}
        className="absolute top-1 right-1 p-1 bg-black/50 hover:bg-black/70 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <X className="w-3 h-3" />
      </button>

      {/* Upload Status */}
      {file.uploadStatus === 'uploading' && (
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
          <Loader2 className="w-5 h-5 text-white animate-spin" />
        </div>
      )}
    </div>
  );
};

/* --- MAIN CHAT INPUT COMPONENT --- */
export interface ChatInputProps {
  onSendMessage: (data: { message: string; files: AttachedFile[] }) => void;
  isLoading?: boolean;
  onAbort?: (() => void) | undefined;
  placeholder?: string;
  className?: string;
  /** Whether to auto-focus the textarea on mount */
  autoFocus?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  isLoading = false,
  onAbort,
  placeholder = 'Ask me anything about HR...',
  className,
  autoFocus = false,
}) => {
  const [message, setMessage] = React.useState('');
  const [files, setFiles] = React.useState<AttachedFile[]>([]);
  const [isDragging, setIsDragging] = React.useState(false);

  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Auto-resize textarea
  React.useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 384)}px`;
    }
  }, [message]);

  // File Handling
  const handleFiles = React.useCallback((newFilesList: FileList | File[]) => {
    const newFiles: AttachedFile[] = Array.from(newFilesList).map((file) => {
      const isImage =
        file.type.startsWith('image/') ||
        /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(file.name);
      return {
        id: Math.random().toString(36).substring(2, 11),
        file,
        type: isImage ? (file.type || 'image/unknown') : (file.type || 'application/octet-stream'),
        preview: isImage ? URL.createObjectURL(file) : null,
        uploadStatus: 'pending' as const,
      };
    });

    setFiles((prev) => [...prev, ...newFiles]);

    // Simulate upload progress
    for (const f of newFiles) {
      setTimeout(() => {
        setFiles((prev) =>
          prev.map((p) =>
            p.id === f.id ? { ...p, uploadStatus: 'complete' as const } : p
          )
        );
      }, 800 + Math.random() * 1000);
    }
  }, []);

  // Drag & Drop
  const onDragOver = (e: React.DragEvent): void => {
    e.preventDefault();
    setIsDragging(true);
  };
  const onDragLeave = (e: React.DragEvent): void => {
    e.preventDefault();
    setIsDragging(false);
  };
  const onDrop = (e: React.DragEvent): void => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
  };

  // Paste Handling (files only)
  const handlePaste = (e: React.ClipboardEvent): void => {
    const items = e.clipboardData.items;
    const pastedFiles: File[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item?.kind === 'file') {
        const file = item.getAsFile();
        if (file) pastedFiles.push(file);
      }
    }
    if (pastedFiles.length > 0) {
      e.preventDefault();
      handleFiles(pastedFiles);
    }
  };

  const handleSend = (): void => {
    if (isLoading) {
      onAbort?.();
      return;
    }
    if (!message.trim() && files.length === 0) return;
    onSendMessage({ message, files });
    setMessage('');
    setFiles([]);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const hasContent = message.trim() || files.length > 0;

  return (
    <div
      className={cn('relative w-full transition-all duration-300', className)}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {/* Main Container */}
      <div
        className={cn(
          'flex flex-col items-stretch transition-all duration-200 relative z-10 rounded-2xl cursor-text',
          'border border-zinc-200 dark:border-zinc-700/60',
          'shadow-[0_0_15px_rgba(0,0,0,0.06)] hover:shadow-[0_0_20px_rgba(0,0,0,0.1)]',
          'focus-within:shadow-[0_0_25px_rgba(0,0,0,0.12)] focus-within:border-zinc-300 dark:focus-within:border-zinc-600',
          'bg-white dark:bg-zinc-800/80'
        )}
      >
        <div className="flex flex-col px-3 pt-3 pb-2 gap-2">
          {/* Attached Files Preview */}
          {files.length > 0 && (
            <div className="flex gap-3 overflow-x-auto pb-2 px-1" style={{ scrollbarWidth: 'thin' }}>
              {files.map((file) => (
                <FilePreviewCard
                  key={file.id}
                  file={file}
                  onRemove={(id) =>
                    setFiles((prev) => prev.filter((f) => f.id !== id))
                  }
                />
              ))}
            </div>
          )}

          {/* Textarea */}
          <div className="relative mb-1">
            <div className="max-h-96 w-full overflow-y-auto break-words transition-opacity duration-200 min-h-[2.5rem] pl-1">
              <textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onPaste={handlePaste}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                disabled={isLoading}
                className={cn(
                  'w-full bg-transparent border-0 outline-none resize-none overflow-hidden py-0 leading-relaxed block font-normal antialiased',
                  'text-zinc-900 dark:text-zinc-100 text-base',
                  'placeholder:text-zinc-400 dark:placeholder:text-zinc-500',
                  'disabled:opacity-60'
                )}
                rows={1}
                autoFocus={autoFocus}
                style={{ minHeight: '1.5em' }}
              />
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex gap-2 w-full items-center">
            {/* Left: Attach File */}
            <div className="flex-1 flex items-center">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  'inline-flex items-center justify-center h-8 w-8 rounded-lg transition-colors duration-200',
                  'text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300',
                  'hover:bg-zinc-100 dark:hover:bg-zinc-700/60',
                  'active:scale-95'
                )}
                aria-label="Attach files"
              >
                <Paperclip className="w-[18px] h-[18px]" strokeWidth={1.5} />
              </button>
            </div>

            {/* Right: Send / Stop */}
            <div className="flex items-center">
              <button
                type="button"
                onClick={handleSend}
                disabled={!hasContent && !isLoading}
                className={cn(
                  'inline-flex items-center justify-center h-8 w-8 rounded-xl transition-colors duration-200',
                  'active:scale-95',
                  isLoading
                    ? 'bg-slate-900 dark:bg-slate-200 text-white dark:text-zinc-900 hover:bg-slate-800 dark:hover:bg-slate-300'
                    : hasContent
                      ? 'bg-slate-900 dark:bg-slate-200 text-white dark:text-zinc-900 hover:bg-slate-800 dark:hover:bg-slate-300 shadow-sm'
                      : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-400 dark:text-zinc-500 cursor-default'
                )}
                aria-label={isLoading ? 'Stop generating' : 'Send message'}
              >
                {isLoading ? (
                  <Square className="w-3.5 h-3.5" fill="currentColor" />
                ) : (
                  <ArrowUp className="w-4 h-4" strokeWidth={2} />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Drag Overlay */}
      {isDragging && (
        <div className="absolute inset-0 bg-white/90 dark:bg-zinc-800/90 border-2 border-dashed border-slate-400 dark:border-slate-500 rounded-2xl z-50 flex flex-col items-center justify-center backdrop-blur-sm pointer-events-none">
          <Paperclip className="w-8 h-8 text-slate-500 dark:text-slate-400 mb-2 animate-bounce" />
          <p className="text-slate-600 dark:text-slate-300 font-medium text-sm">
            Drop files to attach
          </p>
        </div>
      )}

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) handleFiles(e.target.files);
          e.target.value = '';
        }}
      />
    </div>
  );
};

export default ChatInput;
