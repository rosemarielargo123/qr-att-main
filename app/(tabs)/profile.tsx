
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import AppButton from '@/components/AppButton';
import { signOut, useAuth } from '@/lib/auth';
import { getProfile, updateProfile, type Profile } from '@/lib/profiles';

const C = {
  background: '#FFF5F8',
  white: '#FFFFFF',
  pink: '#F3A6C2',
  pinkDark: '#D65F8A',
  pinkDeep: '#AD456F',
  pinkLight: '#FCE4ED',
  pinkSoft: '#FFF0F5',
  border: '#F4CDDC',
  text: '#543746',
  muted: '#A47D8D',
  green: '#348568',
  greenSoft: '#E7F6EE',
  red: '#C94F69',
  redSoft: '#FCE8ED',
};

export default function ProfileScreen() {
  const { user } = useAuth();
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [draftName, setDraftName] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const photoKey = user ? `profile_photo_${user.id}` : '';

  const loadProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setPhoto(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const [result, savedPhoto] = await Promise.all([
        getProfile(user.id),
        AsyncStorage.getItem(`profile_photo_${user.id}`),
      ]);

      setProfile(result);
      setDraftName(result?.full_name ?? '');
      setPhoto(savedPhoto);
    } catch (error) {
      console.error('Profile loading error:', error);
      Alert.alert(
        'Profile Error',
        'Unable to load your profile. Please check your connection.'
      );
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      void loadProfile();
    }, [loadProfile])
  );

  const choosePhoto = async () => {
    if (!user) return;

    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          'Gallery Permission',
          'Please allow gallery access to choose your profile picture.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled || !result.assets?.[0]?.uri) return;

      const selectedPhoto = result.assets[0].uri;

      await AsyncStorage.setItem(photoKey, selectedPhoto);
      setPhoto(selectedPhoto);

      Alert.alert('Success', 'Your profile picture has been updated.');
    } catch (error) {
      console.error('Photo selection error:', error);
      Alert.alert('Error', 'Could not update your profile picture.');
    }
  };

  const saveProfile = async () => {
    if (!user) return;

    const name = draftName.trim();

    if (!name) {
      Alert.alert('Required', 'Please enter your full name.');
      return;
    }

    setSaving(true);

    try {
      const { error } = await updateProfile(
        user.id,
        { full_name: name },
        user.email ?? undefined
      );

      if (error) {
        Alert.alert('Save Failed', error);
        return;
      }

      setProfile((previous) =>
        previous ? { ...previous, full_name: name } : previous
      );

      setDraftName(name);
      setEditing(false);
      Alert.alert('Success', 'Your profile name has been saved.');
    } catch (error) {
      console.error('Save profile error:', error);
      Alert.alert('Error', 'Unable to save your profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    if (signingOut) return;

    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            setSigningOut(true);

            try {
              await signOut();
              router.replace('/login');
            } catch (error: any) {
              Alert.alert(
                'Sign Out Failed',
                error?.message || 'Please try again.'
              );
            } finally {
              setSigningOut(false);
            }
          },
        },
      ]
    );
  };

  const getInitials = (name?: string | null) => {
    const parts = (name || user?.email || 'User')
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    if (parts.length > 1) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }

    return (parts[0] || 'U').slice(0, 2).toUpperCase();
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <StatusBar barStyle="dark-content" backgroundColor={C.background} />
        <View style={styles.loadingIcon}>
          <ActivityIndicator size="large" color={C.pinkDark} />
        </View>
        <Text style={styles.loadingTitle}>Preparing your profile</Text>
        <Text style={styles.muted}>Just a moment...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.loading}>
        <StatusBar barStyle="dark-content" backgroundColor={C.background} />
        <View style={styles.loadingIcon}>
          <Ionicons name="person-outline" size={42} color={C.pinkDark} />
        </View>
        <Text style={styles.heading}>Welcome back!</Text>
        <Text style={styles.muted}>Sign in to view your profile.</Text>
        <View style={styles.loginButton}>
          <AppButton
            title="Go to Login"
            icon="log-in-outline"
            onPress={() => router.replace('/login')}
          />
        </View>
      </View>
    );
  }

  const isTeacher = profile?.role?.toLowerCase() === 'teacher';
  const displayName =
    profile?.full_name?.trim() || 'Complete your profile';

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor={C.background} />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.wrapper}>
          {/* Page heading */}
          <View style={styles.topBar}>
            <View style={styles.headingLeft}>
              <Text style={styles.eyebrow}>QR-ATT • YOUR ACCOUNT</Text>
              <Text style={styles.pageTitle}>My Profile</Text>
              <Text style={styles.pageSubtitle}>
                Your details, your space.
              </Text>
            </View>

            <Pressable
              onPress={() => void loadProfile()}
              style={({ pressed }) => [
                styles.headerButton,
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Refresh profile"
            >
              <Ionicons
                name="refresh-outline"
                size={21}
                color={C.pinkDeep}
              />
            </Pressable>
          </View>

          {/* Main profile card */}
          <View style={styles.heroCard}>
            <View style={styles.heroTop}>
              <View style={styles.heroPill}>
                <Ionicons
                  name="heart"
                  size={12}
                  color={C.pinkDeep}
                />
                <Text style={styles.heroPillText}>MY ACCOUNT</Text>
              </View>

              <Ionicons
                name="sparkles"
                size={24}
                color={C.pink}
              />
            </View>

            <View style={styles.avatarArea}>
              <Pressable
                onPress={choosePhoto}
                style={({ pressed }) => [
                  styles.avatarOuter,
                  pressed && styles.pressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Change profile picture"
              >
                {photo ? (
                  <Image
                    source={{ uri: photo }}
                    style={styles.avatar}
                  />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarText}>
                      {getInitials(profile?.full_name)}
                    </Text>
                  </View>
                )}

                <View style={styles.cameraBadge}>
                  <Ionicons
                    name="camera"
                    size={17}
                    color={C.white}
                  />
                </View>
              </Pressable>

              <View style={styles.verifiedDot}>
                <Ionicons
                  name="checkmark"
                  size={12}
                  color={C.white}
                />
              </View>
            </View>

            <Text style={styles.profileName} numberOfLines={2}>
              {displayName}
            </Text>

            <Text style={styles.profileEmail} numberOfLines={2}>
              {user.email || 'No email address'}
            </Text>

            <View
              style={[
                styles.roleBadge,
                isTeacher ? styles.teacherBadge : styles.studentBadge,
              ]}
            >
              <Ionicons
                name={isTeacher ? 'school-outline' : 'person-outline'}
                size={15}
                color={isTeacher ? C.white : C.pinkDeep}
              />
              <Text
                style={[
                  styles.roleText,
                  !isTeacher && styles.studentRoleText,
                ]}
              >
                {isTeacher ? 'Teacher Account' : 'Student Account'}
              </Text>
            </View>

            <Pressable
              onPress={choosePhoto}
              style={({ pressed }) => [
                styles.photoButton,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons
                name="image-outline"
                size={17}
                color={C.pinkDeep}
              />
              <Text style={styles.photoButtonText}>
                Update Profile Photo
              </Text>
            </Pressable>

            <View style={styles.heroDivider} />

            <View style={styles.accountFooter}>
              <View style={styles.accountFooterIcon}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={18}
                  color={C.green}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.accountFooterTitle}>
                  Attendance account
                </Text>
                <Text style={styles.accountFooterSubtitle}>
                  Keep your information up to date.
                </Text>
              </View>
              <Ionicons
                name="heart"
                size={18}
                color={C.pink}
              />
            </View>
          </View>

          {/* Personal information */}
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <Ionicons
                name="person-circle-outline"
                size={23}
                color={C.pinkDeep}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>
                Personal Information
              </Text>
              <Text style={styles.sectionSubtitle}>
                Your basic account details
              </Text>
            </View>

            {!editing && (
              <Pressable
                style={({ pressed }) => [
                  styles.editButton,
                  pressed && styles.pressed,
                ]}
                onPress={() => setEditing(true)}
              >
                <Ionicons
                  name="create-outline"
                  size={17}
                  color={C.pinkDeep}
                />
                <Text style={styles.editButtonText}>Edit</Text>
              </Pressable>
            )}
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.fieldLabel}>FULL NAME</Text>

            {editing ? (
              <TextInput
                style={styles.input}
                value={draftName}
                onChangeText={setDraftName}
                placeholder="Enter your full name"
                placeholderTextColor={C.muted}
                autoCapitalize="words"
                autoCorrect={false}
                editable={!saving}
                returnKeyType="done"
                onSubmitEditing={() => void saveProfile()}
              />
            ) : (
              <View style={styles.valueBox}>
                <View style={styles.fieldIcon}>
                  <Ionicons
                    name="person-outline"
                    size={19}
                    color={C.pinkDeep}
                  />
                </View>
                <Text style={styles.valueText}>
                  {profile?.full_name || 'Not set'}
                </Text>
              </View>
            )}

            <Text style={styles.fieldLabel}>EMAIL ADDRESS</Text>
            <View style={styles.valueBox}>
              <View style={styles.fieldIcon}>
                <Ionicons
                  name="mail-outline"
                  size={19}
                  color={C.pinkDeep}
                />
              </View>
              <Text style={styles.valueText} selectable>
                {user.email || 'Not set'}
              </Text>
            </View>

            <Text style={styles.fieldLabel}>ACCOUNT ID</Text>
            <View style={styles.valueBox}>
              <View style={styles.fieldIcon}>
                <Ionicons
                  name="finger-print-outline"
                  size={19}
                  color={C.pinkDeep}
                />
              </View>
              <Text
                style={styles.userIdText}
                selectable
                numberOfLines={2}
              >
                {user.id}
              </Text>
              <Ionicons
                name="lock-closed-outline"
                size={15}
                color={C.muted}
              />
            </View>

            {editing && (
              <View style={styles.editActions}>
                <Pressable
                  style={styles.cancelButton}
                  onPress={() => {
                    setDraftName(profile?.full_name ?? '');
                    setEditing(false);
                  }}
                  disabled={saving}
                >
                  <Text style={styles.cancelText}>Cancel</Text>
                </Pressable>

                <Pressable
                  style={[
                    styles.saveButton,
                    saving && styles.disabledButton,
                  ]}
                  onPress={() => void saveProfile()}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color={C.white} />
                  ) : (
                    <Ionicons
                      name="checkmark-circle-outline"
                      size={19}
                      color={C.white}
                    />
                  )}
                  <Text style={styles.saveText}>
                    {saving ? 'Saving...' : 'Save Changes'}
                  </Text>
                </Pressable>
              </View>
            )}
          </View>

          {/* Academic information */}
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <Ionicons
                name="school-outline"
                size={23}
                color={C.pinkDeep}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>
                Academic Information
              </Text>
              <Text style={styles.sectionSubtitle}>
                Your department and section
              </Text>
            </View>
          </View>

          <View style={styles.sectionCard}>
            <AcademicRow
              icon="business-outline"
              label="Department"
              value="BSIT"
            />
            <View style={styles.line} />
            <AcademicRow
              icon="book-outline"
              label="Year Level"
              value="3rd Year"
            />
            <View style={styles.line} />
            <AcademicRow
              icon="people-outline"
              label="Block / Section"
              value="E"
            />
          </View>

          {/* Helpful tip */}
          <View style={styles.tipCard}>
            <View style={styles.tipIcon}>
              <Ionicons
                name="bulb-outline"
                size={22}
                color={C.pinkDeep}
              />
            </View>
            <View style={styles.tipContent}>
              <Text style={styles.tipTitle}>A little reminder</Text>
              <Text style={styles.tipText}>
                Make sure your name and profile photo are correct so
                your account is easier to recognize.
              </Text>
            </View>
          </View>

          {/* Sign out */}
          <View style={styles.signOutCard}>
            <View style={styles.signOutHeader}>
              <View style={styles.signOutIcon}>
                <Ionicons
                  name="log-out-outline"
                  size={21}
                  color={C.red}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.signOutTitle}>Sign Out</Text>
                <Text style={styles.signOutDescription}>
                  End your session on this device.
                </Text>
              </View>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.signOutButton,
                pressed && styles.pressed,
                signingOut && styles.disabledButton,
              ]}
              onPress={handleSignOut}
              disabled={signingOut}
            >
              {signingOut ? (
                <ActivityIndicator size="small" color={C.white} />
              ) : (
                <Ionicons
                  name="log-out-outline"
                  size={19}
                  color={C.white}
                />
              )}
              <Text style={styles.signOutButtonText}>
                {signingOut ? 'Signing Out...' : 'Sign Out'}
              </Text>
            </Pressable>
          </View>

          <View style={styles.footer}>
            <Ionicons name="heart" size={13} color={C.pinkDark} />
            <Text style={styles.footerText}>
              Made with care • QR-ATT-MAIN
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function AcademicRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.academicRow}>
      <View style={styles.academicIcon}>
        <Ionicons name={icon} size={21} color={C.pinkDeep} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.academicLabel}>{label}</Text>
        <Text style={styles.academicValue}>{value}</Text>
      </View>
      <Ionicons
        name="checkmark-circle"
        size={19}
        color={C.green}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: C.background,
  },
  content: {
    paddingHorizontal: 17,
    paddingTop: 18,
    paddingBottom: 38,
    alignItems: 'center',
  },
  wrapper: {
    width: '100%',
    maxWidth: 600,
  },
  loading: {
    flex: 1,
    backgroundColor: C.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingIcon: {
    width: 76,
    height: 76,
    borderRadius: 26,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  loadingTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: C.text,
    marginBottom: 5,
  },
  muted: {
    color: C.muted,
    fontSize: 13,
    marginTop: 5,
    textAlign: 'center',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  headingLeft: {
    flex: 1,
  },
  eyebrow: {
    color: C.pinkDeep,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.8,
    marginBottom: 6,
  },
  pageTitle: {
    color: C.text,
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: -0.7,
  },
  pageSubtitle: {
    color: C.muted,
    fontSize: 13,
    marginTop: 4,
  },
  headerButton: {
    width: 45,
    height: 45,
    borderRadius: 16,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  heroCard: {
    backgroundColor: C.white,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: C.border,
    padding: 20,
    marginBottom: 27,
    overflow: 'hidden',
    shadowColor: C.pinkDark,
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  heroPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: C.pinkSoft,
    borderRadius: 30,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  heroPillText: {
    color: C.pinkDeep,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  avatarArea: {
    alignSelf: 'center',
    position: 'relative',
    marginBottom: 15,
  },
  avatarOuter: {
    width: 116,
    height: 116,
    borderRadius: 58,
    padding: 4,
    backgroundColor: C.pinkLight,
    borderWidth: 2,
    borderColor: C.pink,
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 54,
    backgroundColor: C.pinkLight,
  },
  avatarPlaceholder: {
    flex: 1,
    borderRadius: 54,
    backgroundColor: C.pinkLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: C.pinkDeep,
    fontSize: 35,
    fontWeight: '900',
  },
  cameraBadge: {
    position: 'absolute',
    right: -2,
    bottom: 2,
    width: 35,
    height: 35,
    borderRadius: 18,
    backgroundColor: C.pinkDeep,
    borderWidth: 3,
    borderColor: C.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifiedDot: {
    position: 'absolute',
    right: -5,
    top: 4,
    width: 23,
    height: 23,
    borderRadius: 12,
    backgroundColor: C.green,
    borderWidth: 3,
    borderColor: C.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileName: {
    textAlign: 'center',
    fontSize: 23,
    lineHeight: 29,
    fontWeight: '900',
    color: C.text,
    letterSpacing: -0.4,
  },
  profileEmail: {
    textAlign: 'center',
    fontSize: 12,
    color: C.muted,
    marginTop: 7,
  },
  roleBadge: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 25,
    marginTop: 13,
  },
  teacherBadge: {
    backgroundColor: C.pinkDeep,
  },
  studentBadge: {
    backgroundColor: C.pinkLight,
    borderWidth: 1,
    borderColor: C.border,
  },
  roleText: {
    color: C.white,
    fontSize: 11,
    fontWeight: '800',
  },
  studentRoleText: {
    color: C.pinkDeep,
  },
  photoButton: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 15,
    paddingVertical: 11,
    marginTop: 15,
    borderRadius: 14,
    backgroundColor: C.pinkSoft,
    borderWidth: 1,
    borderColor: C.border,
  },
  photoButtonText: {
    color: C.pinkDeep,
    fontSize: 12,
    fontWeight: '800',
  },
  heroDivider: {
    height: 1,
    backgroundColor: C.border,
    marginTop: 21,
    marginBottom: 16,
  },
  accountFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  accountFooterIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: C.greenSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountFooterTitle: {
    color: C.text,
    fontSize: 12,
    fontWeight: '800',
  },
  accountFooterSubtitle: {
    color: C.muted,
    fontSize: 10,
    marginTop: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    marginBottom: 13,
  },
  sectionIcon: {
    width: 45,
    height: 45,
    borderRadius: 15,
    backgroundColor: C.pinkLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    color: C.text,
    fontSize: 16,
    fontWeight: '900',
  },
  sectionSubtitle: {
    color: C.muted,
    fontSize: 11,
    marginTop: 4,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: C.pinkSoft,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  editButtonText: {
    color: C.pinkDeep,
    fontSize: 12,
    fontWeight: '800',
  },
  sectionCard: {
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 23,
    padding: 17,
    marginBottom: 25,
    shadowColor: C.pinkDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  fieldLabel: {
    color: C.muted,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.1,
    marginBottom: 8,
    marginTop: 4,
  },
  input: {
    minHeight: 51,
    borderWidth: 1,
    borderColor: C.pink,
    borderRadius: 15,
    paddingHorizontal: 14,
    fontSize: 14,
    color: C.text,
    backgroundColor: C.pinkSoft,
    marginBottom: 17,
  },
  valueBox: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingHorizontal: 11,
    paddingVertical: 10,
    backgroundColor: C.pinkSoft,
    borderWidth: 1,
    borderColor: '#F8E0E9',
    borderRadius: 15,
    marginBottom: 17,
  },
  fieldIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: C.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueText: {
    flex: 1,
    color: C.text,
    fontSize: 13,
    fontWeight: '600',
  },
  userIdText: {
    flex: 1,
    color: C.muted,
    fontSize: 10,
    lineHeight: 15,
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 9,
    marginTop: 2,
  },
  cancelButton: {
    minHeight: 45,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderRadius: 13,
    backgroundColor: C.pinkSoft,
  },
  cancelText: {
    color: C.muted,
    fontSize: 12,
    fontWeight: '800',
  },
  saveButton: {
    minHeight: 45,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 15,
    borderRadius: 13,
    backgroundColor: C.pinkDeep,
  },
  saveText: {
    color: C.white,
    fontSize: 12,
    fontWeight: '900',
  },
  disabledButton: {
    opacity: 0.65,
  },
  academicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 7,
  },
  academicIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: C.pinkLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  academicLabel: {
    color: C.muted,
    fontSize: 11,
    marginBottom: 4,
  },
  academicValue: {
    color: C.text,
    fontSize: 14,
    fontWeight: '800',
  },
  line: {
    height: 1,
    backgroundColor: '#F7E3EB',
    marginVertical: 12,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: C.pinkLight,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 19,
    padding: 16,
    marginBottom: 22,
  },
  tipIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: C.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    color: C.text,
    fontSize: 13,
    fontWeight: '900',
    marginBottom: 5,
  },
  tipText: {
    color: C.muted,
    fontSize: 12,
    lineHeight: 19,
  },
  signOutCard: {
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 22,
    padding: 17,
    gap: 16,
  },
  signOutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  signOutIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: C.redSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOutTitle: {
    color: C.text,
    fontSize: 15,
    fontWeight: '900',
  },
  signOutDescription: {
    color: C.muted,
    fontSize: 11,
    marginTop: 4,
  },
  signOutButton: {
    minHeight: 49,
    borderRadius: 15,
    backgroundColor: C.red,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },
  signOutButtonText: {
    color: C.white,
    fontSize: 14,
    fontWeight: '900',
  },
  heading: {
    color: C.text,
    fontSize: 22,
    fontWeight: '900',
    marginTop: 5,
  },
  loginButton: {
    width: '100%',
    maxWidth: 300,
    marginTop: 20,
  },
  pressed: {
    opacity: 0.78,
    transform: [{ scale: 0.99 }],
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 7,
    marginTop: 26,
  },
  footerText: {
    color: C.muted,
    fontSize: 11,
  },
});
