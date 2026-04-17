import { Image, Text, View } from 'react-native';
import { User } from 'lucide-react-native';

type ProfileAvatarNativeProps = {
  uri?: string | null;
  name?: string | null;
  size?: number;
};

function getInitials(name?: string | null) {
  if (!name) return '';

  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  return parts.map((part) => part[0]?.toUpperCase() || '').join('');
}

export function ProfileAvatarNative({
  uri,
  name,
  size = 64,
}: ProfileAvatarNativeProps) {
  const initials = getInitials(name);

  return (
    <View
      className="items-center justify-center overflow-hidden rounded-full border border-white/10 bg-white/[0.04]"
      style={{ width: size, height: size }}
    >
      {uri ? (
        <Image source={{ uri }} style={{ width: size, height: size }} resizeMode="cover" />
      ) : initials ? (
        <Text className="text-base font-black tracking-[0.18em] text-chakra-neon">{initials}</Text>
      ) : (
        <User color="#FF5F1F" size={Math.max(20, Math.round(size * 0.36))} />
      )}
    </View>
  );
}
