import { Ionicons } from '@expo/vector-icons';
import {
  addDoc,
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from 'firebase/firestore';
import { uploadImageToImgBB } from '@/lib/api';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Bubble,
  GiftedChat,
  IMessage,
  InputToolbar,
  Send,
} from 'react-native-gifted-chat';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';
import { db } from '@/lib/firebase';

const ROOM_NAMES: Record<string, string> = {
  general: 'General',
  random: 'Random',
  tech: 'Tech Talk',
};

type ChatMessage = IMessage & {
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
};

function getFileIcon(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  if (['pdf'].includes(ext)) return 'document-text';
  if (['doc', 'docx'].includes(ext)) return 'document';
  if (['xls', 'xlsx', 'csv'].includes(ext)) return 'grid';
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return 'archive';
  if (['mp3', 'wav', 'aac', 'm4a'].includes(ext)) return 'musical-note';
  if (['mp4', 'mov', 'avi', 'mkv'].includes(ext)) return 'videocam';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return 'image';
  return 'attach';
}

export default function ChatRoomScreen() {
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);

  const isConfigured = !!(
    process.env.EXPO_PUBLIC_FIREBASE_API_KEY &&
    process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID
  );

  const roomName = ROOM_NAMES[roomId ?? ''] ?? roomId ?? 'Chat';

  useEffect(() => {
    if (!roomId || !isConfigured) return;

    const q = query(
      collection(db, 'rooms', roomId, 'messages'),
      orderBy('createdAt', 'desc'),
      limit(60)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs: ChatMessage[] = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          _id: doc.id,
          text: data['text'] ?? '',
          createdAt: data['createdAt']?.toDate?.() ?? new Date(),
          image: data['image'] ?? undefined,
          fileUrl: data['fileUrl'] ?? undefined,
          fileName: data['fileName'] ?? undefined,
          fileType: data['fileType'] ?? undefined,
          user: {
            _id: data['userId'] ?? '',
            name: data['userName'] ?? 'Unknown',
            avatar: data['userAvatar'] ?? '#25D366',
          },
        };
      });
      setMessages(msgs);
    });

    return unsubscribe;
  }, [roomId, isConfigured]);

  const onSend = useCallback(
    async (newMessages: ChatMessage[] = []) => {
      if (!user || !roomId || !isConfigured) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const msg = newMessages[0];
      try {
        await addDoc(collection(db, 'rooms', roomId, 'messages'), {
          text: msg.text ?? '',
          image: msg.image ?? null,
          fileUrl: msg.fileUrl ?? null,
          fileName: msg.fileName ?? null,
          fileType: msg.fileType ?? null,
          createdAt: serverTimestamp(),
          userId: user.uid,
          userName: user.displayName,
          userAvatar: user.avatarColor,
        });
      } catch {
        Alert.alert('Error', 'Failed to send message. Please try again.');
      }
    },
    [user, roomId, isConfigured]
  );

  const pickAndUploadImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow access to your photo library.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      quality: 0.7,
      allowsEditing: true,
    });

    if (result.canceled || !result.assets[0]) return;

    const uri = result.assets[0].uri;
    setUploading(true);
    try {
      const downloadURL = await uploadImageToImgBB(uri);
      const fileId = Date.now().toString() + Math.random().toString(36).substring(2, 9);
      const imageMessage: ChatMessage = {
        _id: fileId,
        text: '',
        createdAt: new Date(),
        image: downloadURL,
        user: { _id: user!.uid, name: user!.displayName, avatar: user!.avatarColor },
      };
      await onSend([imageMessage]);
    } catch {
      Alert.alert('Upload failed', 'Could not upload image. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const pickAndUploadFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      setUploadingFile(true);

      console.log('[FileUpload] Picked file:', asset.name, asset.uri, asset.mimeType);

      const fetchResponse = await fetch(asset.uri);
      const blob = await fetchResponse.blob();

      console.log('[FileUpload] Blob size:', blob.size, 'type:', blob.type);

      const formData = new FormData();
      formData.append('file', blob, asset.name);

      console.log('[FileUpload] Uploading to File.io...');

      const uploadResponse = await fetch('https://file.io?expires=14d', {
        method: 'POST',
        body: formData,
      });

      const data = (await uploadResponse.json()) as {
        success?: boolean;
        link?: string;
        error?: string;
      };

      console.log('[FileUpload] File.io response:', JSON.stringify(data));

      if (!uploadResponse.ok || !data.success || !data.link) {
        throw new Error(data.error ?? 'File.io upload failed');
      }

      const fileId = Date.now().toString() + Math.random().toString(36).substring(2, 9);
      const fileMessage: ChatMessage = {
        _id: fileId,
        text: '',
        createdAt: new Date(),
        fileUrl: data.link,
        fileName: asset.name,
        fileType: asset.mimeType ?? 'application/octet-stream',
        user: { _id: user!.uid, name: user!.displayName, avatar: user!.avatarColor },
      };
      await onSend([fileMessage]);
      console.log('[FileUpload] File message sent successfully.');
    } catch (err) {
      console.error('[FileUpload] Error:', err);
      Alert.alert('Upload failed', 'Could not upload file. Please try again.');
    } finally {
      setUploadingFile(false);
    }
  };

  const renderAvatar = useCallback((props: any) => {
    const avatarColor = (props.currentMessage?.user?.avatar as string) ?? '#25D366';
    const initial = ((props.currentMessage?.user?.name as string) ?? 'U')[0].toUpperCase();
    return (
      <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
        <Text style={styles.avatarText}>{initial}</Text>
      </View>
    );
  }, []);

  const renderCustomView = useCallback(
    (props: any) => {
      const msg = props.currentMessage as ChatMessage;
      if (!msg?.fileUrl || !msg?.fileName) return null;
      const icon = getFileIcon(msg.fileName);
      const isSent = msg.user._id === user?.uid;
      return (
        <TouchableOpacity
          style={[
            styles.fileCard,
            { borderColor: isSent ? 'rgba(0,0,0,0.08)' : 'rgba(0,0,0,0.08)' },
          ]}
          onPress={() => Linking.openURL(msg.fileUrl!)}
          activeOpacity={0.7}
        >
          <View style={[styles.fileIconBox, { backgroundColor: colors.primary + '22' }]}>
            <Ionicons name={icon as any} size={22} color={colors.primary} />
          </View>
          <View style={styles.fileInfo}>
            <Text style={[styles.fileName, { color: colors.foreground }]} numberOfLines={1}>
              {msg.fileName}
            </Text>
            <Text style={[styles.fileTap, { color: colors.mutedForeground }]}>
              Tap to download
            </Text>
          </View>
          <Ionicons name="download-outline" size={18} color={colors.mutedForeground} />
        </TouchableOpacity>
      );
    },
    [colors, user]
  );

  const renderBubble = useCallback(
    (props: any) => (
      <Bubble
        {...props}
        wrapperStyle={{
          right: { backgroundColor: colors.sentBubble },
          left: { backgroundColor: colors.receivedBubble },
        }}
        textStyle={{
          right: { color: '#111B21', fontFamily: 'Inter_400Regular' },
          left: { color: '#111B21', fontFamily: 'Inter_400Regular' },
        }}
        timeTextStyle={{
          right: { color: '#8696A0' },
          left: { color: '#8696A0' },
        }}
      />
    ),
    [colors]
  );

  const renderSend = useCallback(
    (props: any) => (
      <Send {...props} containerStyle={styles.sendContainer}>
        <View style={[styles.sendBtn, { backgroundColor: colors.primary }]}>
          <Ionicons name="send" size={18} color="#fff" />
        </View>
      </Send>
    ),
    [colors]
  );

  const renderActions = useCallback(
    (_props: any) => (
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={pickAndUploadImage}
          disabled={uploading || uploadingFile}
        >
          {uploading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Ionicons name="image-outline" size={24} color={colors.mutedForeground} />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionBtn}
          onPress={pickAndUploadFile}
          disabled={uploading || uploadingFile}
        >
          {uploadingFile ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Ionicons name="attach" size={26} color={colors.mutedForeground} />
          )}
        </TouchableOpacity>
      </View>
    ),
    [uploading, uploadingFile, colors]
  );

  const renderInputToolbar = useCallback(
    (props: any) => (
      <InputToolbar
        {...props}
        containerStyle={[
          styles.inputToolbar,
          {
            backgroundColor: colors.background,
            borderTopColor: colors.border,
            paddingBottom: Platform.OS === 'web' ? 34 : insets.bottom,
          },
        ]}
        primaryStyle={{ alignItems: 'center' }}
      />
    ),
    [colors, insets]
  );

  if (!isConfigured) {
    return (
      <View style={[styles.setup, { backgroundColor: colors.background }]}>
        <View
          style={[
            styles.header,
            {
              backgroundColor: colors.headerBg,
              paddingTop: Platform.OS === 'web' ? 67 : insets.top,
            },
          ]}
        >
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{roomName}</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.setupBody}>
          <Ionicons name="settings-outline" size={56} color={colors.mutedForeground} />
          <Text style={[styles.setupTitle, { color: colors.foreground }]}>
            Firebase Not Configured
          </Text>
          <Text style={[styles.setupText, { color: colors.mutedForeground }]}>
            Add your Firebase credentials in the Secrets panel to start chatting.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.chatBg }]}>
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.headerBg,
            paddingTop: Platform.OS === 'web' ? 67 : insets.top,
          },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={[styles.headerAvatar, { backgroundColor: colors.primary }]}>
          <Ionicons
            name={
              roomId === 'general'
                ? 'chatbubbles'
                : roomId === 'random'
                ? 'shuffle'
                : 'code-slash'
            }
            size={18}
            color="#fff"
          />
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>{roomName}</Text>
          <Text style={styles.headerSub}>Public room</Text>
        </View>
      </View>

      <GiftedChat
        messages={messages}
        onSend={(msgs) => onSend(msgs as ChatMessage[])}
        user={{
          _id: user?.uid ?? 'guest',
          name: user?.displayName ?? 'Guest',
          avatar: user?.avatarColor ?? '#25D366',
        }}
        renderAvatar={renderAvatar}
        renderBubble={renderBubble}
        renderCustomView={renderCustomView}
        renderSend={renderSend}
        renderActions={renderActions}
        renderInputToolbar={renderInputToolbar}
        alwaysShowSend
        showUserAvatar
        showAvatarForEveryMessage={false}
        renderUsernameOnMessage
        scrollToBottom
        infiniteScroll
        keyboardShouldPersistTaps="handled"
        placeholder="Message..."
        textInputStyle={[styles.textInput, { fontFamily: 'Inter_400Regular' }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 8,
    paddingBottom: 10,
    gap: 10,
  },
  backBtn: { padding: 8 },
  headerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: { flex: 1 },
  headerTitle: {
    fontSize: 17,
    fontFamily: 'Inter_600SemiBold',
    color: '#fff',
  },
  headerSub: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: 'rgba(255,255,255,0.7)',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
  },
  sendContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
    marginBottom: 6,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 4,
    marginBottom: 4,
  },
  actionBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputToolbar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 8,
    paddingTop: 6,
  },
  textInput: {
    fontSize: 15,
    lineHeight: 20,
  },
  fileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 10,
    marginTop: 6,
    marginBottom: 4,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 10,
    maxWidth: 240,
  },
  fileIconBox: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
  },
  fileTap: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
  },
  setup: { flex: 1 },
  setupBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  setupTitle: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    textAlign: 'center',
  },
  setupText: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: 22,
  },
});
