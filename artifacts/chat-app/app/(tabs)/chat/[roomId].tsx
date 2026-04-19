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
import { getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Actions,
  Bubble,
  GiftedChat,
  IMessage,
  InputToolbar,
  Send,
} from 'react-native-gifted-chat';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';
import { db, storage } from '@/lib/firebase';

const ROOM_NAMES: Record<string, string> = {
  general: 'General',
  random: 'Random',
  tech: 'Tech Talk',
};

export default function ChatRoomScreen() {
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<IMessage[]>([]);
  const [uploading, setUploading] = useState(false);
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
      const msgs: IMessage[] = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          _id: doc.id,
          text: data['text'] ?? '',
          createdAt: data['createdAt']?.toDate?.() ?? new Date(),
          image: data['image'] ?? undefined,
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
    async (newMessages: IMessage[] = []) => {
      if (!user || !roomId || !isConfigured) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const msg = newMessages[0];
      try {
        await addDoc(collection(db, 'rooms', roomId, 'messages'), {
          text: msg.text ?? '',
          image: msg.image ?? null,
          createdAt: serverTimestamp(),
          userId: user.uid,
          userName: user.displayName,
          userAvatar: user.avatarColor,
        });
      } catch (err) {
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
      const response = await fetch(uri);
      const blob = await response.blob();
      const fileId =
        Date.now().toString() + Math.random().toString(36).substring(2, 9);
      const storageRef = ref(storage, `chat-images/${roomId}/${fileId}`);
      const uploadTask = uploadBytesResumable(storageRef, blob);

      await new Promise<void>((resolve, reject) => {
        uploadTask.on('state_changed', null, reject, resolve);
      });

      const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);

      const imageMessage: IMessage = {
        _id: fileId,
        text: '',
        createdAt: new Date(),
        image: downloadURL,
        user: {
          _id: user!.uid,
          name: user!.displayName,
          avatar: user!.avatarColor,
        },
      };

      await onSend([imageMessage]);
    } catch {
      Alert.alert('Upload failed', 'Could not upload image. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const renderAvatar = useCallback((props: any) => {
    const avatarColor =
      (props.currentMessage?.user?.avatar as string) ?? '#25D366';
    const initial = (
      (props.currentMessage?.user?.name as string) ?? 'U'
    )[0].toUpperCase();
    return (
      <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
        <Text style={styles.avatarText}>{initial}</Text>
      </View>
    );
  }, []);

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
    (props: any) => (
      <Actions
        {...props}
        containerStyle={styles.actionsContainer}
        icon={() =>
          uploading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Ionicons name="image-outline" size={26} color={colors.mutedForeground} />
          )
        }
        onPressActionButton={pickAndUploadImage}
      />
    ),
    [uploading, colors]
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
        onSend={onSend}
        user={{
          _id: user?.uid ?? 'guest',
          name: user?.displayName ?? 'Guest',
          avatar: user?.avatarColor ?? '#25D366',
        }}
        renderAvatar={renderAvatar}
        renderBubble={renderBubble}
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
  backBtn: {
    padding: 8,
  },
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
  actionsContainer: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 0,
    marginLeft: 4,
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
