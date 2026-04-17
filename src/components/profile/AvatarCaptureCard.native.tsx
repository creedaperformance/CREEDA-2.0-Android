import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  Text,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
import {
  Camera as CameraIcon,
  Images,
  RefreshCcw,
  Trash2,
  User,
  X,
} from 'lucide-react-native';

import { GlowingButtonNative } from '../neon/GlowingButtonNative';
import { deleteStoredAvatar, uploadAvatarFromFileUri } from '../../lib/avatar-upload';

type AvatarCaptureCardProps = {
  userId: string;
  currentUrl?: string | null;
  onUploaded: (url: string) => Promise<void> | void;
  onRemoved?: () => Promise<void> | void;
  title?: string;
  description?: string;
};

export default function AvatarCaptureCard({
  userId,
  currentUrl,
  onUploaded,
  onRemoved,
  title = 'Avatar',
  description = 'Capture a profile photo directly from your device camera.',
}: AvatarCaptureCardProps) {
  const cameraRef = useRef<Camera>(null);
  const { hasPermission, requestPermission } = useCameraPermission();
  const frontDevice = useCameraDevice('front');
  const backDevice = useCameraDevice('back');
  const [previewUrl, setPreviewUrl] = useState(currentUrl || null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<'front' | 'back'>('front');
  const [capturing, setCapturing] = useState(false);
  const [pickingFromLibrary, setPickingFromLibrary] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const device = cameraFacing === 'front' ? frontDevice ?? backDevice : backDevice ?? frontDevice;

  useEffect(() => {
    setPreviewUrl(currentUrl || null);
  }, [currentUrl]);

  async function openCamera() {
    setError(null);

    if (!hasPermission) {
      const granted = await requestPermission();
      if (!granted) {
        setError('Camera permission is required to capture an avatar.');
        return;
      }
    }

    setCameraOpen(true);
  }

  async function handleCapture() {
    if (!cameraRef.current || !device) return;

    setCapturing(true);
    setError(null);

    try {
      const photo = await cameraRef.current.takePhoto({
        enableShutterSound: false,
      });

      const fileUri = photo.path.startsWith('file://') ? photo.path : `file://${photo.path}`;
      await handleUpload(fileUri);
      setCameraOpen(false);
    } catch (captureError) {
      setError(
        captureError instanceof Error
          ? captureError.message
          : 'Failed to capture and upload avatar.'
      );
    } finally {
      setCapturing(false);
      setUploading(false);
    }
  }

  async function handleUpload(fileUri: string) {
    setUploading(true);
    setError(null);

    try {
      const publicUrl = await uploadAvatarFromFileUri(fileUri, userId, previewUrl ?? currentUrl);
      await Promise.resolve(onUploaded(publicUrl));
      setPreviewUrl(publicUrl);
    } finally {
      setUploading(false);
    }
  }

  async function openLibrary() {
    setError(null);
    setPickingFromLibrary(true);

    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setError('Photo library permission is required to choose an avatar.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.9,
        selectionLimit: 1,
      });

      if (result.canceled) return;

      const selectedAsset = result.assets?.[0];
      if (!selectedAsset?.uri) {
        setError('No image was returned from your photo library.');
        return;
      }

      await handleUpload(selectedAsset.uri);
    } catch (libraryError) {
      setError(
        libraryError instanceof Error
          ? libraryError.message
          : 'Failed to choose and upload avatar.'
      );
    } finally {
      setPickingFromLibrary(false);
    }
  }

  async function handleRemove() {
    if (!previewUrl) return;

    setRemoving(true);
    setError(null);

    try {
      await deleteStoredAvatar(userId, previewUrl);
      if (onRemoved) {
        await Promise.resolve(onRemoved());
      }
      setPreviewUrl(null);
      setCameraOpen(false);
    } catch (removeError) {
      setError(
        removeError instanceof Error ? removeError.message : 'Failed to remove avatar.'
      );
    } finally {
      setRemoving(false);
    }
  }

  return (
    <View className="rounded-3xl border border-white/5 bg-white/[0.03] p-5">
      <View className="items-center">
        <View className="h-28 w-28 overflow-hidden rounded-full border border-white/10 bg-white/[0.03]">
          {previewUrl ? (
            <Image source={{ uri: previewUrl }} className="h-full w-full" resizeMode="cover" />
          ) : (
            <View className="h-full w-full items-center justify-center">
              <User color="#FF5F1F" size={36} />
            </View>
          )}
          {uploading || removing ? (
            <View className="absolute inset-0 items-center justify-center bg-black/60">
              <ActivityIndicator color="#00E5FF" />
            </View>
          ) : null}
        </View>

        <Text className="mt-4 text-lg font-black tracking-tight text-white">{title}</Text>
        <Text className="mt-2 text-center text-sm leading-6 text-white/55">{description}</Text>

        {error ? (
          <Text className="mt-4 text-center text-sm leading-6 text-[#FF8C5A]">{error}</Text>
        ) : null}

        <View className="mt-5 w-full gap-3">
          <GlowingButtonNative
            title={previewUrl ? 'Choose New Avatar' : 'Choose From Library'}
            variant="chakra"
            icon={<Images color="#00E5FF" size={18} />}
            onPress={() => {
              void openLibrary();
            }}
            disabled={capturing || pickingFromLibrary || uploading || removing}
          />
          <GlowingButtonNative
            title={previewUrl ? 'Retake Avatar' : 'Capture Avatar'}
            variant="saffron"
            icon={<CameraIcon color="#FF5F1F" size={18} />}
            onPress={() => {
              void openCamera();
            }}
            disabled={capturing || pickingFromLibrary || uploading || removing}
          />
        </View>

        {previewUrl ? (
          <Pressable
            onPress={() => {
              void handleRemove();
            }}
            className="mt-4 flex-row items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-3"
            disabled={capturing || pickingFromLibrary || uploading || removing}
          >
            <Trash2 color="#FF8C5A" size={16} />
            <Text className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#FF8C5A]">
              Remove Avatar
            </Text>
          </Pressable>
        ) : null}

        <Text className="mt-4 text-center text-xs leading-5 text-white/40">
          Library selection opens a square crop step before upload.
        </Text>
      </View>

      <Modal visible={cameraOpen} animationType="slide" presentationStyle="fullScreen">
        <View className="flex-1 bg-black">
          {device ? (
            <Camera
              ref={cameraRef}
              className="flex-1"
              device={device}
              isActive={cameraOpen}
              photo
            />
          ) : (
            <View className="flex-1 items-center justify-center px-8">
              <Text className="text-center text-sm leading-6 text-white/65">
                No camera device is available on this build.
              </Text>
            </View>
          )}

          <View className="absolute left-0 right-0 top-0 flex-row items-center justify-between px-6 pt-16">
            <Pressable
              onPress={() => setCameraOpen(false)}
              className="rounded-full border border-white/10 bg-black/40 p-4"
            >
              <X color="#FFFFFF" size={18} />
            </Pressable>

            <Pressable
              onPress={() =>
                setCameraFacing((current) => (current === 'front' ? 'back' : 'front'))
              }
              className="rounded-full border border-white/10 bg-black/40 p-4"
            >
              <RefreshCcw color="#FFFFFF" size={18} />
            </Pressable>
          </View>

          <View className="absolute bottom-0 left-0 right-0 items-center px-6 pb-14">
            <Text className="mb-4 text-sm leading-6 text-white/70">
              Center your face and capture one clear portrait frame.
            </Text>
            <Pressable
              onPress={() => {
                void handleCapture();
              }}
              className="h-20 w-20 items-center justify-center rounded-full border-4 border-white bg-[#FF5F1F]"
              disabled={capturing || pickingFromLibrary || uploading || removing || !device}
            >
              {capturing || uploading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <CameraIcon color="#FFFFFF" size={24} />
              )}
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}
