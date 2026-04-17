import { Image, Text, View } from 'react-native';
import { Camera as CameraIcon, User } from 'lucide-react-native';

import { GlowingButtonNative } from '../neon/GlowingButtonNative';

type AvatarCaptureCardProps = {
  userId: string;
  currentUrl?: string | null;
  onUploaded: (url: string) => Promise<void> | void;
  onRemoved?: () => Promise<void> | void;
  title?: string;
  description?: string;
};

export default function AvatarCaptureCard({
  currentUrl,
  title = 'Avatar',
  description = 'Avatar library selection and camera capture are available in the iOS and Android builds.',
}: AvatarCaptureCardProps) {
  return (
    <View className="rounded-3xl border border-white/5 bg-white/[0.03] p-5">
      <View className="items-center">
        <View className="h-28 w-28 overflow-hidden rounded-full border border-white/10 bg-white/[0.03]">
          {currentUrl ? (
            <Image source={{ uri: currentUrl }} className="h-full w-full" resizeMode="cover" />
          ) : (
            <View className="h-full w-full items-center justify-center">
              <User color="#FF5F1F" size={36} />
            </View>
          )}
        </View>

        <Text className="mt-4 text-lg font-black tracking-tight text-white">{title}</Text>
        <Text className="mt-2 text-center text-sm leading-6 text-white/55">{description}</Text>

        <View className="mt-5">
          <GlowingButtonNative
            title={currentUrl ? 'Edit On Device' : 'Available On Device'}
            variant="chakra"
            icon={<CameraIcon color="#00E5FF" size={18} />}
            onPress={() => {}}
            disabled
          />
        </View>

        <Text className="mt-4 text-center text-xs leading-5 text-white/40">
          Open the native mobile build to choose from your library or capture and upload a new profile photo.
        </Text>
      </View>
    </View>
  );
}
