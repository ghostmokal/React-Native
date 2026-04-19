import { Ionicons } from '@expo/vector-icons';
import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import RoomCard from '@/components/RoomCard';
import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';
import { db } from '@/lib/firebase';

interface RoomPreview {
  text: string;
  time: Date | null;
}

const ROOMS = [
  { id: 'general', name: 'General', description: 'Chat for everyone' },
  { id: 'random', name: 'Random', description: 'Random topics and fun' },
  { id: 'tech', name: 'Tech Talk', description: 'Technology discussions' },
];

const IS_CONFIGURED = !!(
  process.env.EXPO_PUBLIC_FIREBASE_API_KEY &&
  process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID
);

export default function ChatsScreen() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [roomPreviews, setRoomPreviews] = useState<Record<string, RoomPreview>>({});

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading]);

  useEffect(() => {
    if (!user || !IS_CONFIGURED) return;

    const unsubscribers = ROOMS.map((room) => {
      const q = query(
        collection(db, 'rooms', room.id, 'messages'),
        orderBy('createdAt', 'desc'),
        limit(1)
      );
      return onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          const data = snapshot.docs[0].data();
          setRoomPreviews((prev) => ({
            ...prev,
            [room.id]: {
              text: data['image'] ? '📷 Photo' : (data['text'] ?? ''),
              time: data['createdAt']?.toDate?.() ?? null,
            },
          }));
        }
      });
    });

    return () => unsubscribers.forEach((u) => u());
  }, [user]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.headerBg,
            paddingTop: Platform.OS === 'web' ? 67 : insets.top,
          },
        ]}
      >
        <Text style={styles.headerTitle}>Chats</Text>
        <View style={[styles.userBadge, { backgroundColor: user?.avatarColor ?? colors.primary }]}>
          <Text style={styles.userBadgeText}>
            {(user?.displayName ?? 'U')[0].toUpperCase()}
          </Text>
        </View>
      </View>

      <FlatList
        data={ROOMS}
        keyExtractor={(item) => item.id}
        scrollEnabled={true}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: Platform.OS === 'web' ? 34 : insets.bottom + 16,
        }}
        renderItem={({ item }) => (
          <RoomCard
            room={item}
            preview={roomPreviews[item.id]}
            onPress={() => router.push(`/chat/${item.id}` as any)}
          />
        )}
        ListHeaderComponent={
          <View style={[styles.sectionLabel, { borderBottomColor: colors.border }]}>
            <Ionicons name="chatbubbles" size={16} color={colors.mutedForeground} />
            <Text style={[styles.sectionLabelText, { color: colors.mutedForeground }]}>
              CHAT ROOMS
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: 'Inter_700Bold',
    color: '#fff',
  },
  userBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userBadgeText: {
    color: '#fff',
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
  },
  sectionLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sectionLabelText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.8,
  },
});
