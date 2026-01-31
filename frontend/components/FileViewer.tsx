import React, { useState, useEffect } from 'react';
import { FileImage, FileText, FileSpreadsheet, File as FileIcon, Download, ExternalLink, AlertCircle } from 'lucide-react';

interface FileViewerProps {
  data: any;
  contentType?: string;
}

export const FileViewer: React.FC<FileViewerProps> = ({ data, contentType }) => {
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [fileType, setFileType] = useState<'image' | 'pdf' | 'csv' | 'excel' | 'text' | 'unknown'>('unknown');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      // Detect file type from content-type or data
      let detectedType: typeof fileType = 'unknown';
      let blob: Blob | null = null;

      if (contentType) {
        if (contentType.includes('image/')) {
          detectedType = 'image';
        } else if (contentType.includes('pdf')) {
          detectedType = 'pdf';
        } else if (contentType.includes('csv')) {
          detectedType = 'csv';
        } else if (contentType.includes('spreadsheet') || contentType.includes('excel')) {
          detectedType = 'excel';
        } else if (contentType.includes('text/')) {
          detectedType = 'text';
        }
      }

      // Handle different data types
      if (typeof data === 'string') {
        // Check if it's a base64 image
        if (data.startsWith('data:image/')) {
          detectedType = 'image';
          setFileUrl(data);
        } else if (data.startsWith('data:application/pdf')) {
          detectedType = 'pdf';
          setFileUrl(data);
        } else if (data.startsWith('http://') || data.startsWith('https://')) {
          // It's a URL
          setFileUrl(data);
          // Try to detect from URL extension
          if (data.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) detectedType = 'image';
          else if (data.match(/\.pdf$/i)) detectedType = 'pdf';
          else if (data.match(/\.csv$/i)) detectedType = 'csv';
          else if (data.match(/\.(xlsx|xls)$/i)) detectedType = 'excel';
        } else {
          // Plain text
          detectedType = 'text';
          blob = new Blob([data], { type: 'text/plain' });
          setFileUrl(URL.createObjectURL(blob));
        }
      } else if (data instanceof Blob) {
        blob = data;
        setFileUrl(URL.createObjectURL(blob));
      } else if (data instanceof ArrayBuffer) {
        blob = new Blob([data]);
        setFileUrl(URL.createObjectURL(blob));
      }

      setFileType(detectedType);

      // Cleanup
      return () => {
        if (fileUrl && fileUrl.startsWith('blob:')) {
          URL.revokeObjectURL(fileUrl);
        }
      };
    } catch (err: any) {
      setError(err.message);
    }
  }, [data, contentType]);

  const handleDownload = () => {
    if (fileUrl) {
      const a = document.createElement('a');
      a.href = fileUrl;
      a.download = `download_${Date.now()}.${fileType === 'image' ? 'png' : fileType}`;
      a.click();
    }
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-red-400">
        <AlertCircle size={32} className="mb-3" />
        <p className="text-sm">Error loading file: {error}</p>
      </div>
    );
  }

  if (!fileUrl) {
    return (
      <div className="flex items-center justify-center p-8 text-zinc-500">
        <p className="text-sm">Loading file...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
        <div className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
          {fileType === 'image' && <FileImage size={14} />}
          {fileType === 'pdf' && <FileText size={14} />}
          {fileType === 'csv' && <FileSpreadsheet size={14} />}
          {fileType === 'excel' && <FileSpreadsheet size={14} />}
          {fileType === 'text' && <FileText size={14} />}
          {fileType === 'unknown' && <FileIcon size={14} />}
          <span className="font-medium">
            {fileType === 'image' && 'Image'}
            {fileType === 'pdf' && 'PDF Document'}
            {fileType === 'csv' && 'CSV File'}
            {fileType === 'excel' && 'Excel Spreadsheet'}
            {fileType === 'text' && 'Text File'}
            {fileType === 'unknown' && 'File'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownload}
            className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded transition-colors text-zinc-600 dark:text-zinc-400"
            title="Download"
          >
            <Download size={14} />
          </button>
          {(fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) && (
            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded transition-colors text-zinc-600 dark:text-zinc-400"
              title="Open in new tab"
            >
              <ExternalLink size={14} />
            </a>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto bg-zinc-100 dark:bg-zinc-950 p-4">
        {fileType === 'image' && (
          <div className="flex items-center justify-center h-full">
            <img
              src={fileUrl}
              alt="Response"
              className="max-w-full max-h-full object-contain rounded shadow-lg"
            />
          </div>
        )}

        {fileType === 'pdf' && (
          <iframe
            src={fileUrl}
            className="w-full h-full border-0 rounded bg-white"
            title="PDF Viewer"
          />
        )}

        {fileType === 'csv' && (
          <CSVViewer url={fileUrl} />
        )}

        {fileType === 'excel' && (
          <div className="flex flex-col items-center justify-center h-full text-zinc-500">
            <FileSpreadsheet size={48} className="mb-4 opacity-50" />
            <p className="text-sm mb-4">Excel files cannot be previewed directly</p>
            <button
              onClick={handleDownload}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm font-medium transition-colors flex items-center gap-2"
            >
              <Download size={14} />
              Download to view
            </button>
          </div>
        )}

        {fileType === 'text' && (
          <pre className="text-xs font-mono text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap break-words bg-white dark:bg-zinc-900 p-4 rounded border border-zinc-200 dark:border-zinc-800">
            {typeof data === 'string' ? data : JSON.stringify(data, null, 2)}
          </pre>
        )}

        {fileType === 'unknown' && (
          <div className="flex flex-col items-center justify-center h-full text-zinc-500">
            <FileIcon size={48} className="mb-4 opacity-50" />
            <p className="text-sm mb-4">Unknown file type</p>
            <button
              onClick={handleDownload}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm font-medium transition-colors flex items-center gap-2"
            >
              <Download size={14} />
              Download file
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// CSV Viewer Component
const CSVViewer: React.FC<{ url: string }> = ({ url }) => {
  const [csvData, setCsvData] = useState<string[][]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(url)
      .then(res => res.text())
      .then(text => {
        const rows = text.split('\n').map(row => 
          row.split(',').map(cell => cell.trim())
        );
        setCsvData(rows);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [url]);

  if (loading) {
    return <div className="text-zinc-500 text-sm p-4">Loading CSV...</div>;
  }

  if (csvData.length === 0) {
    return <div className="text-zinc-500 text-sm p-4">Empty CSV file</div>;
  }

  return (
    <div className="overflow-auto">
      <table className="w-full text-xs border-collapse bg-white dark:bg-zinc-900 rounded">
        <thead>
          <tr className="bg-zinc-100 dark:bg-zinc-800">
            {csvData[0]?.map((header, i) => (
              <th key={i} className="border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-left font-semibold text-zinc-700 dark:text-zinc-300">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {csvData.slice(1).map((row, i) => (
            <tr key={i} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
              {row.map((cell, j) => (
                <td key={j} className="border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-zinc-600 dark:text-zinc-400">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
