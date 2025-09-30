export interface MediaFile {
  file: File;
  type: 'image' | 'video' | 'audio' | 'pdf';
  previewUrl: string;
}
