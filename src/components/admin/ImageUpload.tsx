"use client";

import { useRef, useState } from "react";
import { Upload, X, ImageIcon } from "lucide-react";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/Spinner";

interface ImageUploadProps {
  images: string[];
  onChange: (urls: string[]) => void;
  maxImages?: number;
}

export function ImageUpload({ images, onChange, maxImages = 5 }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canAdd = images.length < maxImages;

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (!canAdd) return;

    setError(null);
    setUploading(true);

    const toUpload = Array.from(files).slice(0, maxImages - images.length);
    const urls: string[] = [];

    for (const file of toUpload) {
      if (!file.type.startsWith("image/")) {
        setError("Solo se permiten imágenes.");
        continue;
      }
      try {
        const url = await uploadToCloudinary(file, "productos");
        urls.push(url);
      } catch {
        setError("Error al subir una imagen. Intenta de nuevo.");
      }
    }

    if (urls.length > 0) {
      onChange([...images, ...urls]);
    }

    setUploading(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  const removeImage = (idx: number) => {
    onChange(images.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      {canAdd && (
        <div
          className={cn(
            "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all duration-200",
            dragOver ? "border-primary bg-gray-light" : "border-border hover:border-primary hover:bg-gray-light/50"
          )}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <Spinner size="md" />
              <p className="text-sm text-gray-mid">Subiendo imagen...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-gray-light flex items-center justify-center">
                <Upload className="w-5 h-5 text-gray-mid" />
              </div>
              <p className="text-sm text-primary font-medium">
                Arrastra imágenes aquí o haz clic para seleccionar
              </p>
              <p className="text-xs text-gray-mid">
                PNG, JPG, WEBP — máx. {maxImages} imágenes ({images.length}/{maxImages})
              </p>
            </div>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>
      )}

      {error && <p className="text-xs text-error">{error}</p>}

      {/* Previews */}
      {images.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {images.map((url, idx) => (
            <div key={url} className="relative group aspect-square">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={`Imagen ${idx + 1}`}
                className="w-full h-full object-cover rounded border border-border"
              />
              <button
                type="button"
                onClick={() => removeImage(idx)}
                className="absolute top-1 right-1 bg-primary/80 text-secondary rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Eliminar imagen"
              >
                <X className="w-3 h-3" />
              </button>
              {idx === 0 && (
                <span className="absolute bottom-1 left-1 text-[10px] bg-primary text-secondary px-1.5 py-0.5 rounded font-body">
                  Principal
                </span>
              )}
            </div>
          ))}
          {/* Empty slot placeholder when not at max */}
          {images.length < maxImages && images.length > 0 && !canAdd && (
            <div className="aspect-square border-2 border-dashed border-border rounded flex items-center justify-center">
              <ImageIcon className="w-6 h-6 text-border" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
