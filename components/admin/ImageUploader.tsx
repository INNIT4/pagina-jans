"use client";

import { useState } from "react";

interface ImageUploaderProps {
  images: string[];
  onChange: (urls: string[]) => void;
}

export default function ImageUploader({ images, onChange }: ImageUploaderProps) {
  const [urlInput, setUrlInput] = useState("");
  const [uploading, setUploading] = useState(false);

  function addUrl() {
    const url = urlInput.trim();
    if (!url) return;
    onChange([...images, url]);
    setUrlInput("");
  }

  function removeImage(i: number) {
    onChange(images.filter((_, idx) => idx !== i));
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    const newUrls: string[] = [];
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        const json = await res.json();
        if (!res.ok) { alert(json.error ?? "Error al subir imagen."); continue; }
        newUrls.push(json.url);
      }
      if (newUrls.length > 0) onChange([...images, ...newUrls]);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  return (
    <div>
      <p className="block text-sm font-medium mb-2">
        Imágenes ({images.length})
        <span className="text-xs text-slate-400 ml-2">La primera será la principal</span>
      </p>

      {/* Image list */}
      {images.length > 0 && (
        <div className="space-y-2 mb-3">
          {images.map((url, i) => (
            <div key={i} className="flex items-center gap-2 bg-slate-50 dark:bg-slate-700 rounded-lg p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="w-12 h-10 object-cover rounded flex-shrink-0"
                onError={(e) => (e.currentTarget.style.display = "none")} />
              <span className="flex-1 text-xs text-slate-500 truncate">{url}</span>
              {i === 0 && <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-medium">Principal</span>}
              <button type="button" onClick={() => removeImage(i)}
                className="text-slate-400 hover:text-red-500 flex-shrink-0 text-lg leading-none">
                &times;
              </button>
            </div>
          ))}
        </div>
      )}

      {/* File upload */}
      <div className="mb-2">
        <label className="flex items-center justify-center gap-2 w-full px-3 py-2 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg cursor-pointer hover:border-red-400 transition-colors text-sm text-slate-500 dark:text-slate-400">
          {uploading ? "Subiendo..." : "Subir imagen desde tu equipo"}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            disabled={uploading}
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>
      </div>

      {/* Add by URL */}
      <div className="flex gap-2">
        <input
          type="url"
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addUrl())}
          placeholder="https://ejemplo.com/imagen.jpg"
          className="flex-1 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm"
        />
        <button type="button" onClick={addUrl}
          className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-sm font-medium rounded-lg transition-colors">
          + URL
        </button>
      </div>
      <p className="text-xs text-slate-400 mt-1">Sube archivos directamente o pega una URL externa.</p>
    </div>
  );
}
