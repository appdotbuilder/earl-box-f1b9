import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/utils/trpc';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Copy, Upload, File, CheckCircle } from 'lucide-react';
import type { UploadFileResponse, FileStats } from '../../server/src/schema';

function App() {
  const [fileStats, setFileStats] = useState<FileStats | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [recentUploads, setRecentUploads] = useState<UploadFileResponse[]>([]);
  const [showCopiedToast, setShowCopiedToast] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadFileStats = useCallback(async () => {
    try {
      const stats = await trpc.getFileStats.query();
      setFileStats(stats);
    } catch (error) {
      console.error('Failed to load file stats:', error);
    }
  }, []);

  useEffect(() => {
    loadFileStats();
    // Refresh stats every 30 seconds
    const interval = setInterval(loadFileStats, 30000);
    return () => clearInterval(interval);
  }, [loadFileStats]);

  const getBaseUrl = () => {
    const { protocol, host } = window.location;
    return `${protocol}//${host}`;
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file size (200MB limit)
    const maxSize = 200 * 1024 * 1024; // 200MB in bytes
    if (file.size > maxSize) {
      alert('File size exceeds 200MB limit');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Convert file to base64
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          // Remove data URL prefix to get pure base64
          const base64 = result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.onprogress = (e) => {
          if (e.lengthComputable) {
            const progress = (e.loaded / e.total) * 50; // First 50% for reading file
            setUploadProgress(progress);
          }
        };
        reader.readAsDataURL(file);
      });

      setUploadProgress(75); // 75% for upload start

      const uploadResponse = await trpc.uploadFile.mutate({
        original_name: file.name,
        file_data: base64Data,
        mime_type: file.type,
        file_size: file.size,
      });

      setUploadProgress(100);

      // Add to recent uploads
      setRecentUploads((prev: UploadFileResponse[]) => [uploadResponse, ...prev.slice(0, 4)]);
      
      // Refresh stats
      await loadFileStats();

    } catch (error) {
      console.error('Upload failed:', error);
      alert('Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const copyToClipboard = async (link: string, fileId: string) => {
    try {
      await navigator.clipboard.writeText(link);
      setShowCopiedToast(fileId);
      setTimeout(() => setShowCopiedToast(null), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            📦 Earl Box
          </h1>
          <p className="text-gray-600">Simple, fast file sharing for everyone</p>
          {fileStats && (
            <Badge variant="secondary" className="mt-4">
              📊 {fileStats.total_files.toLocaleString()} files uploaded globally
            </Badge>
          )}
        </div>

        {/* Upload Area */}
        <Card className="max-w-2xl mx-auto mb-8 shadow-lg">
          <CardHeader>
            <CardTitle className="text-center flex items-center justify-center gap-2">
              <Upload className="h-5 w-5" />
              Upload Your File
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* File Input Area */}
              <div 
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
                  isUploading 
                    ? 'border-blue-300 bg-blue-50' 
                    : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
                }`}
                onClick={() => !isUploading && fileInputRef.current?.click()}
              >
                <Input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileSelect}
                  disabled={isUploading}
                  className="hidden"
                />
                
                {isUploading ? (
                  <div className="space-y-4">
                    <div className="animate-spin mx-auto">
                      <Upload className="h-12 w-12 text-blue-500" />
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-gray-600">Uploading...</p>
                      <Progress value={uploadProgress} className="w-full" />
                      <p className="text-xs text-gray-500">{Math.round(uploadProgress)}%</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <File className="h-12 w-12 text-gray-400 mx-auto" />
                    <p className="text-lg font-medium text-gray-700">
                      Click to select a file
                    </p>
                    <p className="text-sm text-gray-500">
                      Maximum file size: 200MB
                    </p>
                  </div>
                )}
              </div>

              {/* Recent Uploads */}
              {recentUploads.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-gray-700">Recent Uploads:</h3>
                  {recentUploads.map((upload: UploadFileResponse) => {
                    const publicLink = `${getBaseUrl()}/file/${upload.id}`;
                    return (
                      <div 
                        key={upload.id} 
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {upload.original_name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatFileSize(upload.file_size)} • {upload.upload_date.toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            value={publicLink}
                            readOnly
                            className="w-64 text-xs"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyToClipboard(publicLink, upload.id)}
                            className="relative"
                          >
                            {showCopiedToast === upload.id ? (
                              <>
                                <CheckCircle className="h-4 w-4 text-green-600" />
                                <span className="ml-1 text-green-600">Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="h-4 w-4" />
                                <span className="ml-1">Copy</span>
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Features */}
        <div className="max-w-4xl mx-auto grid md:grid-cols-3 gap-6 mb-12">
          <Card>
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Upload className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="font-semibold mb-2">Instant Upload</h3>
              <p className="text-sm text-gray-600">
                Files are uploaded automatically when selected - no extra clicks needed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <File className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="font-semibold mb-2">200MB Limit</h3>
              <p className="text-sm text-gray-600">
                Upload files up to 200MB in size with lightning-fast speeds
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Copy className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="font-semibold mb-2">Easy Sharing</h3>
              <p className="text-sm text-gray-600">
                Get instant shareable links with one-click copy functionality
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-6 mt-auto">
        <div className="container mx-auto px-4 text-center">
          <p className="text-gray-600">
            Created by <span className="font-semibold text-gray-800">Earl Store❤️</span>
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;