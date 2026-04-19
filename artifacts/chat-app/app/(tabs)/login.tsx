import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';

export default function LoginScreen() {
  const { setDisplayName, loading } = useAuth();
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleContinue = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Please enter your name');
      return;
    }
    if (trimmed.length < 2) {
      setError('Name must be at least 2 characters');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await setDisplayName(trimmed);
      router.replace('/');
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.headerBg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View
        style={[
          styles.inner,
          {
            paddingTop: Platform.OS === 'web' ? 67 : insets.top + 40,
            paddingBottom: Platform.OS === 'web' ? 34 : insets.bottom + 24,
          },
        ]}
      >
        <View style={styles.iconContainer}>
          <Ionicons name="chatbubbles" size={80} color="rgba(255,255,255,0.9)" />
        </View>

        <Text style={styles.title}>Welcome</Text>
        <Text style={styles.subtitle}>
          Enter your name to start chatting with people around the world
        </Text>

        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>Your name</Text>
          <TextInput
            style={[
              styles.input,
              {
                borderColor: error ? colors.destructive : colors.border,
                color: colors.foreground,
                fontFamily: 'Inter_400Regular',
              },
            ]}
            placeholder="e.g. Alex Johnson"
            placeholderTextColor={colors.mutedForeground}
            value={name}
            onChangeText={(t) => {
              setName(t);
              setError('');
            }}
            maxLength={30}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleContinue}
          />
          {error ? (
            <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text>
          ) : null}

          <TouchableOpacity
            style={[
              styles.button,
              {
                backgroundColor:
                  name.trim().length < 2 ? colors.mutedForeground : colors.primary,
              },
            ]}
            onPress={handleContinue}
            disabled={saving || loading}
            activeOpacity={0.8}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.buttonText}>Continue</Text>
                <Ionicons name="arrow-forward" size={20} color="#fff" />
              </>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.disclaimer}>
          You will be joined anonymously. No account required.
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontFamily: 'Inter_700Bold',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginBottom: 36,
    lineHeight: 22,
  },
  card: {
    width: '100%',
    borderRadius: 16,
    padding: 20,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  label: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  error: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 4,
  },
  buttonText: {
    color: '#fff',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
  },
  disclaimer: {
    marginTop: 24,
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
  },
});
