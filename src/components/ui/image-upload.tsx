'use client';

import { useState, useRef, ChangeEvent, DragEvent } from 'react';
import { Upload, X, Loader2, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ImageUploadProps {
    value?: string; // Current image URL
    onChange: (url: string | null) => void;
    type: 'logo' | 'product';
    className?: string;
    disabled?: boolean;
    minimal?: boolean;
}

export function ImageUpload({ value, onChange, type, className, disabled, minimal }: ImageUploadProps) {
    const [uploading, setUploading] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleUpload = async (file: File) => {
        setError(null);
        setUploading(true);

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('type', type);

            const response = await fetch('/api/upload/image', {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Upload failed');
            }

            onChange(data.url);
        } catch (err: any) {
            setError(err.message || 'Failed to upload image');
            console.error('Upload error:', err);
        } finally {
            setUploading(false);
        }
    };

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            handleUpload(file);
        }
    };

    const handleDrag = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        const file = e.dataTransfer.files?.[0];
        if (file && file.type.startsWith('image/')) {
            handleUpload(file);
        } else {
            setError('Please drop an image file');
        }
    };

    const handleRemove = () => {
        onChange(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleButtonClick = () => {
        fileInputRef.current?.click();
    };

    if (minimal) {
        return (
            <div className={cn('relative w-full h-full', className)}>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleFileChange}
                    className="hidden"
                    disabled={disabled || uploading}
                />
                <div
                    onClick={handleButtonClick}
                    className={cn(
                        "w-full h-full rounded-md border border-dashed flex items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors overflow-hidden bg-white",
                        disabled && "opacity-50 cursor-not-allowed",
                        value && "border-solid border-gray-200"
                    )}
                    title="Upload variant image"
                >
                    {uploading ? (
                        <Loader2 className="h-3 w-3 animate-spin text-primary" />
                    ) : value ? (
                        <img src={value} alt="Variant" className="w-full h-full object-cover" />
                    ) : (
                        <ImageIcon className="h-4 w-4 text-gray-400" />
                    )}
                </div>
                {value && !uploading && !disabled && (
                    <button
                        type="button"
                        className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 shadow-sm hover:bg-red-600 transition-colors z-10"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleRemove();
                        }}
                    >
                        <X className="h-2 w-2" />
                    </button>
                )}
            </div>
        );
    }

    return (
        <div className={cn('space-y-2', className)}>
            {value ? (
                <div className="relative group">
                    <div className="relative w-full h-48 rounded-lg border-2 border-gray-200 overflow-hidden bg-gray-50">
                        <img
                            src={value}
                            alt="Uploaded image"
                            className="w-full h-full object-contain"
                        />
                    </div>
                    <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={handleRemove}
                        disabled={disabled || uploading}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            ) : (
                <div
                    className={cn(
                        'relative w-full h-48 rounded-lg border-2 border-dashed transition-colors',
                        dragActive ? 'border-primary bg-primary/5' : 'border-gray-300',
                        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-primary'
                    )}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    onClick={handleButtonClick}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleFileChange}
                        className="hidden"
                        disabled={disabled || uploading}
                    />
                    <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                        {uploading ? (
                            <>
                                <Loader2 className="h-10 w-10 text-primary animate-spin mb-3" />
                                <p className="text-sm text-muted-foreground">Uploading...</p>
                            </>
                        ) : (
                            <>
                                <ImageIcon className="h-10 w-10 text-muted-foreground mb-3" />
                                <p className="text-sm font-medium text-foreground mb-1">
                                    Drop an image here or click to browse
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    JPG, PNG or WebP (max 5MB)
                                </p>
                            </>
                        )}
                    </div>
                </div>
            )}

            {error && (
                <p className="text-sm text-destructive">{error}</p>
            )}
        </div>
    );
}
