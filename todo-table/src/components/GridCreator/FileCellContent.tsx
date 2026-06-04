import React, { useRef } from "react";
import type { Cell, FileData } from "./GridTypes";
import { Trash2, Upload, Loader2 } from "lucide-react";
import { API_BASE_URL } from "@/lib/api";

interface FileCellContentProps {
  cell: Cell;
  onFileUpload: (file: File) => void;
  onFileRemove: (fileIndex: number) => void;
  isUploading?: boolean;
}

export const FileCellContent: React.FC<FileCellContentProps> = ({
  cell,
  onFileUpload,
  onFileRemove,
  isUploading = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const files = cell.files ?? [];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      // Upload each selected file
      for (let i = 0; i < selectedFiles.length; i++) {
        onFileUpload(selectedFiles[i]);
      }
      e.target.value = ""; // Reset to support repeated uploads
    }
  };

  const triggerFileUpload = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isUploading) {
      fileInputRef.current?.click();
    }
  };

  const handleFileDownload = async (e: React.MouseEvent, f: FileData) => {
    e.stopPropagation();
    console.log(f);
    // 调用 download_file 接口
    window.open(API_BASE_URL + '/base/images/download_file/?file_id=' + f.file_id, "_blank");
  };

  return (
    <div className="w-full h-full flex flex-col gap-1">
      {files.length > 0 ? (
        <div className="flex flex-col gap-1">
          {files.map((f, i) => (
            <div key={i} className="flex items-center gap-1 group w-full">
              <div
                className="text-blue-500 underline cursor-pointer flex-1 overflow-hidden text-ellipsis whitespace-nowrap"
                onClick={(e) => handleFileDownload(e, f)}
                title={f.name}
              >
                {f.name}
              </div>
              <button
                aria-label="删除"
                title="删除"
                type="button"
                className="ml-2 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition"
                onClick={e => {
                  e.stopPropagation();
                  onFileRemove(i);
                }}
                disabled={isUploading}
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-gray-400 text-center text-sm pb-1">暂无文件</div>
      )}
      {/* 上传按钮 */}
      <button
        className={`flex items-center justify-center text-blue-500 hover:text-blue-700 text-sm gap-1 mt-1 ${isUploading ? 'cursor-not-allowed opacity-70' : ''}`}
        type="button"
        onClick={triggerFileUpload}
        disabled={isUploading}
      >
        {isUploading && (
          <>
            <Loader2 size={16} className="animate-spin" /> <span>上传中...</span>
          </>
        )}
      </button>
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileChange}
        className="hidden"
        disabled={isUploading}
      />
    </div>
  );
};
