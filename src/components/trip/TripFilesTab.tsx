"use client";
import { useState, useRef, DragEvent, ChangeEvent, useEffect } from "react";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { 
  UploadCloud, 
  File as FileIcon, 
  Trash2, 
  Loader, 
  CheckCircle, 
  ExternalLink 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Dialog as Modal, DialogContent as ModalContent, DialogHeader as ModalHeader, DialogTitle as ModalTitle } from "@/components/ui/dialog";

interface TripFilesTabProps {
  tripId: string;
}

interface UploadedFile {
  id: string;
  name: string;
  url: string;
  progress: number;
  size?: number;
  type?: string;
}

interface TripFile {
  id: string;
  url: string;
  name: string;
  createdAt: string;
}

export function TripFilesTab({ tripId }: TripFilesTabProps) {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [allFiles, setAllFiles] = useState<TripFile[]>([]);
  const [fileModal, setFileModal] = useState<{ url: string; name: string } | null>(null);

  // Fetch all trip files on mount
  useEffect(() => {
    async function fetchFiles() {
      const filesRes = await fetch(`/api/trips/${tripId}/files`);
      const files = await filesRes.json();
      setAllFiles(files);
    }
    fetchFiles();
  }, [tripId]);

  // After upload, refetch all files
  async function refetchAllFiles() {
    const filesRes = await fetch(`/api/trips/${tripId}/files`);
    const files = await filesRes.json();
    setAllFiles(files);
  }

  async function handleFileUpload(file: File) {
    if (!file) return;
    const tempId = `file-${Date.now()}`;
    const newFile: UploadedFile = {
      id: tempId,
      name: file.name,
      url: "",
      progress: 0,
      size: file.size,
      type: file.type,
    };
    setUploadedFiles(prev => [...prev, newFile]);
    setUploading(true);
    const progressInterval = setInterval(() => {
      setUploadedFiles(prev => 
        prev.map(f => 
          f.id === tempId 
            ? { ...f, progress: Math.min(f.progress + Math.random() * 20, 95) } 
            : f
        )
      );
    }, 300);
    try {
      const result = await uploadToCloudinary(file, `trip-files/${tripId}`);
      clearInterval(progressInterval);
      if (result?.secure_url) {
        setUploadedFiles(prev => 
          prev.map(f => 
            f.id === tempId 
              ? { ...f, url: result.secure_url, progress: 100 } 
              : f
          )
        );
        // Save file to trip
        await fetch(`/api/trips/${tripId}/files`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: result.secure_url, name: file.name }),
        });
      } else {
        setUploadedFiles(prev => prev.filter(f => f.id !== tempId));
      }
      await refetchAllFiles();
    } catch (error) {
      console.error("Upload failed:", error);
      clearInterval(progressInterval);
      setUploadedFiles(prev => prev.filter(f => f.id !== tempId));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave() {
    setIsDragging(false);
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileUpload(file);
  }

  function removeFile(id: string) {
    setUploadedFiles(prev => prev.filter(file => file.id !== id));
  }

  function formatFileSize(bytes?: number): string {
    if (!bytes) return "Unknown size";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  }

  function getFileNameFromUrl(url: string): string {
    try {
      const pathSegments = new URL(url).pathname.split('/');
      return pathSegments[pathSegments.length - 1];
    } catch {
      return url.split('/').pop() || "file";
    }
  }

  async function handleDeleteFile(fileId: string) {
    await fetch(`/api/trips/${tripId}/files`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: fileId }),
    });
    await refetchAllFiles();
  }

  return (
    <Card className="p-6 bg-background border-border w-full">
      {/* Upload area */}
      <div
        className={cn(
          "border-2 border-dashed rounded-lg p-6 transition-all duration-200 mb-6",
          isDragging 
            ? "border-primary bg-primary/5" 
            : "border-border hover:border-primary/50",
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center justify-center gap-4">
          <div className={cn(
            "p-3 rounded-full bg-primary/10 text-primary transition-transform duration-200",
            isDragging ? "scale-110" : ""
          )}>
            <UploadCloud className="h-8 w-8" />
          </div>
          <div className="text-center space-y-1">
            <h3 className="font-semibold text-foreground">
              {isDragging ? "Drop file here" : "Upload trip files"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {isDragging 
                ? "Release to upload" 
                : "Drag & drop files here or click to browse"
              }
            </p>
          </div>
          <Button 
            onClick={() => fileInputRef.current?.click()}
            variant="outline"
            disabled={uploading}
            className="mt-2"
          >
            {uploading ? (
              <>
                <Loader className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>Select File</>
            )}
          </Button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            disabled={uploading}
          />
        </div>
      </div>
      {/* All files list */}
      <div>
        <h3 className="font-semibold mb-4 text-foreground">
          {allFiles.length > 0 
            ? `All Uploaded Files (${allFiles.length})` 
            : "No files uploaded yet"
          }
        </h3>
        <div className="space-y-3">
          {allFiles.map((file) => (
            <div 
              key={file.id} 
              className="flex items-start gap-3 p-3 rounded-md bg-secondary/40 border border-border relative"
            >
              <div className="flex-shrink-0 text-muted-foreground">
                <FileIcon className="h-8 w-8" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between">
                  <h4 className="font-medium text-sm truncate text-foreground cursor-pointer" title={file.name} onClick={() => setFileModal({ url: file.url, name: file.name })}>
                    {file.name}
                  </h4>
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="secondary" asChild>
                      <a href={file.url} target="_blank" rel="noopener noreferrer" download>
                        Download
                      </a>
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDeleteFile(file.id)}>
                      <Trash2 className="h-4 w-4 mr-1" /> Delete
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Uploaded: {new Date(file.createdAt).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* File modal */}
      <Modal open={!!fileModal} onOpenChange={open => !open && setFileModal(null)}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>{fileModal?.name}</ModalTitle>
          </ModalHeader>
          {fileModal && (
            <div className="flex flex-col items-center gap-4">
              <iframe src={fileModal.url} className="w-full h-96 border rounded" title="File Preview" />
              <a href={fileModal.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
                <ExternalLink className="h-4 w-4" /> Download / Open in new tab
              </a>
            </div>
          )}
        </ModalContent>
      </Modal>
    </Card>
  );
} 