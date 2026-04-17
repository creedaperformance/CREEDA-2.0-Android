declare module '*/AvatarCaptureCard' {
  import type { ComponentType } from 'react';

  type AvatarCaptureCardProps = {
    userId: string;
    currentUrl?: string | null;
    onUploaded: (url: string) => Promise<void> | void;
    onRemoved?: () => Promise<void> | void;
    title?: string;
    description?: string;
  };

  const AvatarCaptureCard: ComponentType<AvatarCaptureCardProps>;
  export default AvatarCaptureCard;
}
