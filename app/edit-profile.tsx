import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Platform,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { FileText, ArrowLeft, Camera, User, Save, RefreshCw } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import * as ImagePicker from 'expo-image-picker';
import React from 'react';

interface Profile {
  username: string;
  avatar_url: string;
  first_name: string;
  last_name: string;
  bio: string | null;
}

export default function EditProfileScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: profileError } = await supabase
        .from('profiles')
        .select('username, avatar_url, first_name, last_name, bio')
        .eq('id', session?.user?.id)
        .single();

      if (profileError) throw profileError;
      setProfile(data);
    } catch (err) {
      console.error('Error loading profile:', err);
      setError('Failed to load profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    try {
      if (Platform.OS === 'web') {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.multiple = false;

        const fileSelected = new Promise((resolve) => {
          input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) {
              if (file.size > 5 * 1024 * 1024) {
                Alert.alert('File too large', 'Please select an image under 5MB');
                return;
              }
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result);
              reader.readAsDataURL(file);
            }
          };
        });

        input.click();

        const imageUri = await fileSelected;
        if (imageUri) {
          await handleImageUpload(imageUri as string);
        }
      } else {
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });

        if (!result.canceled && result.assets[0]) {
          const asset = result.assets[0];
          await handleImageUpload(asset.uri);
        }
      }
    } catch (err) {
      console.error('Error picking image:', err);
      Alert.alert('Error', 'Failed to select image. Please try again.');
    }
  };

  const handleImageUpload = async (uri: string) => {
    try {
      setSaving(true);
      setError(null);

      const fileName = `avatar-${session?.user?.id}-${Date.now()}`;
      const filePath = `${fileName}.jpg`;

      let file;
      if (Platform.OS === 'web' && uri.startsWith('data:')) {
        const response = await fetch(uri);
        file = await response.blob();
      } else {
        const response = await fetch(uri);
        file = await response.blob();
      }

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      if (!data?.publicUrl) {
        throw new Error('Failed to retrieve public URL for the uploaded image.');
      }

      const publicUrl = data.publicUrl;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', session?.user?.id);

      if (updateError) throw updateError;

      setProfile(prev => prev ? { ...prev, avatar_url: publicUrl } : null);
      Alert.alert('Success', 'Profile picture updated successfully!');
    } catch (err) {
      console.error('Error uploading image:', err);
      setError('Failed to upload image. Please try again.');
    } finally {
      setSaving(false);
      setUploadProgress(0);
    }
  };

  const handleSave = async () => {
    if (!profile) return;

    try {
      setSaving(true);
      setError(null);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          first_name: profile.first_name,
          last_name: profile.last_name,
          bio: profile.bio,
        })
        .eq('id', session?.user?.id);

      if (updateError) throw updateError;

      router.back();
    } catch (err) {
      console.error('Error updating profile:', err);
      setError('Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FA991C" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Link href="/(tabs)/profile" asChild>
          <TouchableOpacity style={styles.backButton}>
            <ArrowLeft size={24} color="#FBF3F2" />
          </TouchableOpacity>
        </Link>
        <Text style={styles.title}>Edit Profile</Text>
        <TouchableOpacity 
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <RefreshCw size={24} color="#FBF3F2" style={styles.spinningIcon} />
          ) : (
            <Save size={24} color="#FBF3F2" />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.avatarSection}>
          <View style={styles.avatarContainer}>
            <Image
              source={{ 
                uri: profile?.avatar_url || 
                  'https://images.unsplash.com/photo-1511367461989-f85a21fda167?w=400&q=80'
              }}
              style={styles.avatar}
            />
            <TouchableOpacity 
              style={[styles.changeAvatarButton, saving && styles.buttonDisabled]}
              onPress={pickImage}
              disabled={saving}
            >
              <Camera size={20} color="#FBF3F2" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <User size={20} color="#1C768F" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="First Name"
              placeholderTextColor="#1C768F"
              value={profile?.first_name}
              onChangeText={(text) => 
                setProfile(prev => prev ? { ...prev, first_name: text } : null)
              }
            />
          </View>

          <View style={styles.inputContainer}>
            <User size={20} color="#1C768F" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Last Name"
              placeholderTextColor="#1C768F"
              value={profile?.last_name}
              onChangeText={(text) => 
                setProfile(prev => prev ? { ...prev, last_name: text } : null)
              }
            />
          </View>

          <View style={[styles.inputContainer, styles.bioContainer]}>
            <FileText size={20} color="#1C768F" style={styles.inputIcon} />
            <TextInput
              style={[styles.input, styles.bioInput]}
              placeholder="Write something about yourself..."
              placeholderTextColor="#1C768F"
              value={profile?.bio || ''}
              onChangeText={(text) => 
                setProfile(prev => prev ? { ...prev, bio: text } : null)
              }
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#032539',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : Platform.OS === 'android' ? 40 : 20,
    paddingBottom: 16,
    backgroundColor: '#032539',
    borderBottomWidth: 1,
    borderBottomColor: '#1C768F',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1C768F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FBF3F2',
  },
  saveButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FA991C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  spinningIcon: {
    transform: [{ rotate: '45deg' }],
  },
  content: {
    flex: 1,
  },
  errorContainer: {
    margin: 20,
    padding: 16,
    backgroundColor: '#FA991C',
    borderRadius: 8,
  },
  errorText: {
    color: '#032539',
    fontSize: 14,
    textAlign: 'center',
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#FA991C',
  },
  changeAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FA991C',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FBF3F2',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  form: {
    padding: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FBF3F2',
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  bioContainer: {
    alignItems: 'flex-start',
    paddingVertical: 12,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 50,
    color: '#032539',
    fontSize: 16,
  },
  bioInput: {
    height: 120,
    paddingTop: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#032539',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#FBF3F2',
  },
});