import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AppButton from '@/components/AppButton';
import Header from '@/components/Header';
import { COLORS } from '@/constants/colors';
import { signUp } from '@/lib/auth';

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'student' | 'teacher'>('student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    setError(null);

    if (!email.trim() || !password || !confirmPassword) {
      setError('All fields are required.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);

    try {
      const { data, error: authError } = await signUp(
        email.trim(),
        password,
        { full_name: fullName.trim(), role }
      );

      if (authError) {
        setError(authError.message);
      } else if (data?.session) {
        router.replace('/(tabs)');
      } else {
        setSuccess(true);
      }
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.cardWrapper}>
              {/* Header Logo Section */}
              <View style={styles.headerContainer}>
                <Header title="QR Attendance" />
              </View>

              {/* Title Section */}
              <View style={styles.titleSection}>
                <Text style={styles.title}>Create Account</Text>
                <Text style={styles.subtitle}>Register to start recording attendance</Text>
              </View>

              {success ? (
                <View style={styles.successContainer}>
                  <Text style={styles.successTitle}>Check your email!</Text>
                  <Text style={styles.successText}>
                    We sent a confirmation link to {email}. Click the link to verify your
                    account, then come back and sign in.
                  </Text>
                  <Link href="/login" style={styles.link}>
                    Back to Sign In
                  </Link>
                </View>
              ) : (
                <View style={styles.form}>
                  <Text style={styles.label}>Full Name</Text>
                  <TextInput
                    style={styles.input}
                    value={fullName}
                    onChangeText={setFullName}
                    placeholder="e.g. Maria Santos"
                    placeholderTextColor={COLORS.textSecondary}
                    editable={!loading}
                  />

                  <Text style={styles.label}>Email</Text>
                  <TextInput
                    style={styles.input}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="your.email@school.edu"
                    placeholderTextColor={COLORS.textSecondary}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    editable={!loading}
                  />

                  <Text style={styles.label}>Password</Text>
                  <TextInput
                    style={styles.input}
                    value={password}
                    onChangeText={setPassword}
                    placeholder="At least 6 characters"
                    placeholderTextColor={COLORS.textSecondary}
                    secureTextEntry
                    editable={!loading}
                  />

                  <Text style={styles.label}>Confirm Password</Text>
                  <TextInput
                    style={styles.input}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="Re-enter your password"
                    placeholderTextColor={COLORS.textSecondary}
                    secureTextEntry
                    editable={!loading}
                  />

                  <Text style={styles.label}>I am a...</Text>
                  <View style={styles.roleContainer}>
                    <Pressable
                      style={[
                        styles.roleButton,
                        role === 'student' && styles.roleButtonActive,
                      ]}
                      onPress={() => setRole('student')}
                    >
                      <Text
                        style={[
                          styles.roleButtonText,
                          role === 'student' && styles.roleButtonTextActive,
                        ]}
                      >
                        Student
                      </Text>
                    </Pressable>

                    <Pressable
                      style={[
                        styles.roleButton,
                        role === 'teacher' && styles.roleButtonActive,
                      ]}
                      onPress={() => setRole('teacher')}
                    >
                      <Text
                        style={[
                          styles.roleButtonText,
                          role === 'teacher' && styles.roleButtonTextActive,
                        ]}
                      >
                        Teacher
                      </Text>
                    </Pressable>
                  </View>

                  {error && <Text style={styles.error}>{error}</Text>}

                  <View style={styles.buttonWrapper}>
                    <AppButton
                      theme="primary"
                      title={loading ? 'Creating Account...' : 'Sign Up'}
                      icon="person-add-outline"
                      onPress={handleRegister}
                      disabled={loading}
                    />
                  </View>
                </View>
              )}

              {!success && (
                <Link href="/login" style={styles.link}>
                  Already have an account? Sign In
                </Link>
              )}
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  cardWrapper: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: COLORS.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  titleSection: {
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  form: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  roleContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
    marginBottom: 4,
  },
  roleButton: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 12,
    alignItems: 'center',
  },
  roleButtonActive: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.primary,
    borderWidth: 2,
  },
  roleButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  roleButtonTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  error: {
    fontSize: 13,
    color: COLORS.danger || '#FF3B30',
    marginTop: 10,
    marginBottom: 4,
  },
  buttonWrapper: {
    marginTop: 20,
  },
  link: {
    fontSize: 14,
    color: COLORS.primary,
    textAlign: 'center',
    fontWeight: '600',
  },
  successContainer: {
    alignItems: 'center',
    marginBottom: 16,
    padding: 16,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  successTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  successText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 12,
  },
});