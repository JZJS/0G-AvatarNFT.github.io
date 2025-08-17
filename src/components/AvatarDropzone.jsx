import React, { useCallback, useRef, useState } from "react";

const ACCEPTED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/svg+xml",
];
const MAX_BYTES = 5 * 1024 * 1024; // 5MB

export default function AvatarDropzone({ id = "avatar-drop", onChange }) {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [error, setError] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  const validate = (f) => {
    if (!ACCEPTED_TYPES.includes(f.type)) {
      return "Only png, jpg, jpeg, webp, svg formats are supported";
    }
    if (f.size > MAX_BYTES) {
      return "File size cannot exceed 5MB";
    }
    return null;
  };

  const handleFiles = useCallback(
    (files) => {
      const f = files?.[0];
      if (!f) return;
      const err = validate(f);
      if (err) {
        setError(err);
        return;
      }
      setError(null);
      setFile(f);
      const url = URL.createObjectURL(f);
      setPreviewUrl(url);
      onChange?.(f);
    },
    [onChange]
  );

  const onDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const dt = e.dataTransfer;
    if (dt?.files?.length) {
      handleFiles(dt.files);
    }
  };

  const onDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const onDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const onPick = () => {
    inputRef.current?.click();
  };

  const onChangeInput = (e) => {
    handleFiles(e.target.files);
  };

  const onRemove = () => {
    setFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    onChange?.(null);
  };

  return (
    <div className="flex flex-col gap-2">
      <div
        id={id}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        className={`border-2 border-dashed rounded-lg p-4 cursor-pointer transition-colors ${
          isDragging ? "border-[#5EE616] bg-[#1E2230]" : "border-[#2F3548]"
        } ${previewUrl ? "" : "bg-[#0c132f]"}`}
        onClick={onPick}
      >
        {!previewUrl ? (
          <div className="text-center text-sm text-gray-300">
            Drag image here, or click to select
            <div className="text-xs opacity-70 mt-1">
              Supports png / jpg / jpeg / webp / svg, max 5MB
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <img
              src={previewUrl}
              alt="avatar preview"
              className="w-16 h-16 object-cover rounded-md border border-[#2F3548]"
            />
            <div className="flex-1 min-w-0">
              <div className="text-sm truncate text-gray-200">{file?.name}</div>
              <div className="text-xs opacity-70">
                {(file?.size / 1024).toFixed(0)} KB
              </div>
            </div>
            <button
              type="button"
              className="text-xs px-2 py-1 rounded border border-[#2F3548] hover:border-[#5EE616]"
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
            >
              Remove
            </button>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(",")}
          className="hidden"
          onChange={onChangeInput}
        />
      </div>
      {error ? (
        <div className="text-xs text-red-400">{error}</div>
      ) : null}
    </div>
  );
} 