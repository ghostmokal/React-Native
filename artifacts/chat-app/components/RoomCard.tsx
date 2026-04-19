import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useColors } from '@/hooks/useColors';

interface Room {
  id: string;
  name: string;
  description: string;
}

interface Preview {
  text: string;
  time: Date | null;
}

interface RoomCardProps {
  room: Room;
  preview?: Preview;
  onPress: () => void;
}

function formatTime(date: Date | null): string {
  if (!date) return '';
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const oneDay = 86400000;
  if (diff < oneDay) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  if (diff < oneDay * 7) {
    return date.toLocaleDateString([], { weekday: 'short' });
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

const ROOM_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  general: 'chatbubbles',
  random: 'shuffle',
  tech: 'code-slash',
};

export default function RoomCard({ room, preview, onPress }: RoomCardProps) {
  const colors = useColors();
  const iconName = ROOM_ICONS[room.id] ?? 'chatbubble';

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.container, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}
      activeOpacity={0.7}
    >
      <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
        <Ionicons name={iconName} size={24} color="#fff" />
      </View>

      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
            {room.name}
          </Text>
          {preview?.time && (
            <Text style={[styles.time, { color: colors.mutedForeground }]}>
              {formatTime(preview.time)}
            </Text>
          )}
        </View>
        <Text style={[styles.preview, { color: colors.mutedForeground }]} numberOfLines={1}>
          {preview?.text ?? room.description}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  content: { flex: 1 },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
  },
  name: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    flex: 1,
    marginRight: 8,
  },
  time: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  preview: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
});
