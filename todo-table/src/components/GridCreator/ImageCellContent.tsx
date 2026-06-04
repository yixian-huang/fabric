
import React, { useRef } from "react";
import type { Cell } from "./GridTypes";

interface ImageCellContentProps {
  cell: Cell;
  onFileUpload: (file: File) => void;
  baseUrl: string;
}

export const ImageCellContent: React.FC<ImageCellContentProps> = ({
  cell,
  onFileUpload,
  baseUrl,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileUpload(file);
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  // Get image URL from the first file in files array
  const imageUrl = cell.files && cell.files.length > 0 ? `${baseUrl}/${cell.files[cell.files.length-1].url}` : undefined;
  return (
    <div className="w-full h-full flex items-center justify-center">
      {imageUrl ? (
        <img
          src={imageUrl}
          alt="Preview"
          className="max-full max-full object-contain cursor-pointer"
          onClick={triggerFileUpload}
        />
      ) : (
        <div
          className="w-full h-full flex items-center justify-center "
        >
          <span className="text-gray-400 cursor-pointer text-sm"
          onClick={triggerFileUpload}
          >粘贴或点击上传图片</span>
        </div>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
};
