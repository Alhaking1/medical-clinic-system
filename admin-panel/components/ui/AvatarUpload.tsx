import { useState, useRef, type ChangeEvent } from 'react';
import { Camera, Upload, AlertCircle, Loader2 } from 'lucide-react';
import apiClient from '../../api/client';
import UserAvatar from './UserAvatar';

interface AvatarUploadProps {
  currentAvatar?: string | null;
  name?: string;
  onAvatarUpdated: (url: string) => void;
}

export default function AvatarUpload({
  currentAvatar,
  name,
  onAvatarUpdated,
}: AvatarUploadProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('حجم الصورة كبير جداً، يرجى اختيار صورة أقل من 5 ميجابايت');
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    setError(null);
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('image', file);

      const res = await apiClient.post('/users/upload-avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const newUrl = res.data?.avatar_url || res.data?.data?.avatar_url;
      if (newUrl) {
        onAvatarUpdated(newUrl);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'تعذر رفع الصورة الشخصية');
      setPreview(null);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center sm:items-start gap-3">
      <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
        <UserAvatar
          src={preview || currentAvatar}
          name={name}
          className="w-24 h-24 ring-4 ring-teal-500/30"
          iconClassName="w-10 h-10"
        />
        <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
          <Camera className="w-6 h-6" />
        </div>
        <div className="absolute bottom-0 right-0 bg-teal-600 text-white p-1.5 rounded-full ring-2 ring-white shadow-md">
          {isUploading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Camera className="w-3.5 h-3.5" />
          )}
        </div>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />

      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        className="text-xs font-semibold text-teal-600 hover:text-teal-700 bg-teal-50 hover:bg-teal-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
      >
        <Upload className="w-3.5 h-3.5" />
        {isUploading ? 'جاري الرفع والمعالجة...' : 'تغيير الصورة الشخصية'}
      </button>

      {error && (
        <p className="text-xs text-red-500 flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5" />
          {error}
        </p>
      )}
    </div>
  );
}
