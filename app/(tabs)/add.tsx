import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  BookPlus,
  Camera,
  DollarSign,
  FileText,
  Globe as Globe2,
  Info,
  Languages,
  LayoutGrid,
  LibraryBig,
  Upload,
  User,
} from 'lucide-react-native';
import { useAuth } from '@/src/presentation/providers/AuthProvider';
import * as ImagePicker from 'expo-image-picker';
import { dataClient } from '@/src/infrastructure/local-api/client';
import React from 'react';
import { colors, radius, touchTarget, type } from '@/src/presentation/theme/tokens';
import { Button } from '@/src/presentation/components/ui';

const CATEGORIES = [
  'Fiction',
  'Non-fiction',
  'Mystery',
  'Science Fiction',
  'Romance',
  'Biography',
  'History',
  'Business',
  'Children',
  'Technology',
];

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ru', name: 'Russian' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
];

const CONDITIONS = [
  'New',
  'Like New',
  'Very Good',
  'Good',
  'Fair',
  'Poor',
];

export default function AddScreen() {
  const router = useRouter();
  const { session, isGuest } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    author: '',
    description: '',
    category: '',
    language: '',
    condition: '',
    price: '',
    pages: '',
    isbn: '',
    location: '',
  });

  const [images, setImages] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('');
  const [selectedCondition, setSelectedCondition] = useState<string>('');

  useEffect(() => {
    (async () => {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Permission Required',
            'Sorry, we need camera roll permissions to upload images!'
          );
        }
      }
    })();
  }, []);

  const pickImage = async () => {
    try {
      if (loading) return;
      setLoading(true);

      if (images.length >= 1) {
        Alert.alert('Limit Reached', 'You can only add one image at a time.');
        return;
      }

      let result: ImagePicker.ImagePickerResult;

      if (Platform.OS === 'web') {
        // Web implementation
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.multiple = false;

        const imageUri = await new Promise<string | null>((resolve) => {
          input.onchange = (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) {
              if (file.size > 5 * 1024 * 1024) {
                Alert.alert('File too large', 'Please select an image under 5MB');
                resolve(null);
                return;
              }
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as string);
              reader.readAsDataURL(file);
            } else {
              resolve(null);
            }
          };
          input.click();
        });

        if (imageUri) {
          setImages(prev => [...prev, imageUri]);
        }
        return;
      }

      // Mobile implementation
      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
        ...(Platform.OS === 'android' && {
          // Android-specific options
          compressImageQuality: 0.7,
          compressImageMaxWidth: 1000,
          compressImageMaxHeight: 1000,
        }),
      };

      // For Android, we need to ensure mediaTypes is properly handled
      if (Platform.OS === 'android') {
        // This is the key fix for Android
        options.mediaTypes = ImagePicker.MediaTypeOptions.Images as any;
      }

      result = await ImagePicker.launchImageLibraryAsync(options);

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];

      // Check file size
      if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
        Alert.alert('Image too large', 'Please select an image under 5MB');
        return;
      }

      // Fallback size estimation
      if (!asset.fileSize && asset.width && asset.height) {
        const approximateSize = (asset.width * asset.height * 4) / (1024 * 1024);
        if (approximateSize > 5) {
          Alert.alert('Image too large', 'Please select a smaller image');
          return;
        }
      }

      setImages(prev => [...prev, asset.uri]);
    } catch (err) {
      console.error('Error picking image:', err);
      Alert.alert('Error', 'Failed to select image. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (uri: string): Promise<string> => {
    try {
      const fileName = `book-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      const filePath = `${fileName}.jpg`;

      // Handle different URI formats
      let blob;
      if (Platform.OS === 'web') {
        // Web - handle data URLs
        const response = await fetch(uri);
        blob = await response.blob();
      } else {
        // Mobile - handle file URIs
        const response = await fetch(uri);
        blob = await response.blob();
      }

      // Upload through the local API.
      const { error: uploadError } = await dataClient.storage
        .from('books')
        .upload(filePath, blob, {
          contentType: 'image/jpeg',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = dataClient.storage
        .from('books')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (err) {
      console.error('Error uploading image:', err);
      throw new Error('Failed to upload image');
    }
  };

  const handleSubmit = async () => {
    if (isGuest) {
      Alert.alert(
        'Sign in Required',
        'Please sign in to list books.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign In', onPress: () => router.push('/login') }
        ]
      );
      return;
    }

    try {
      setLoading(true);
      setError(null);

      if (!formData.title || !formData.author || !formData.price || !selectedCategory || !selectedLanguage || !selectedCondition) {
        setError('Please fill in all required fields');
        return;
      }

      if (images.length === 0) {
        setError('Please add at least one image');
        return;
      }

      const uploadedUrls = await Promise.all(
        images.map(uri => handleImageUpload(uri))
      );

      const { error: insertError } = await dataClient
        .from('books')
        .insert({
          user_id: session?.user?.id,
          title: formData.title,
          author: formData.author,
          description: formData.description,
          category: selectedCategory,
          language: selectedLanguage,
          condition: selectedCondition,
          price: parseFloat(formData.price),
          pages: formData.pages ? parseInt(formData.pages) : null,
          isbn: formData.isbn || null,
          location: formData.location,
          images: uploadedUrls,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setFormData({
        title: '',
        author: '',
        description: '',
        category: '',
        language: '',
        condition: '',
        price: '',
        pages: '',
        isbn: '',
        location: '',
      });
      setImages([]);
      setSelectedCategory('');
      setSelectedLanguage('');
      setSelectedCondition('');

      Alert.alert(
        'Success',
        'Your book has been listed successfully!',
        [
          {
            text: 'View My Library',
            onPress: () => router.push('/library')
          },
          {
            text: 'List Another Book',
            onPress: () => { }
          }
        ]
      );
    } catch (err) {
      console.error('Error submitting form:', err);
      setError('Failed to list book. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <BookPlus size={32} color={colors.primary} />
        <Text style={styles.title}>List Your Book</Text>
        <Text style={styles.subtitle}>Share your books with other readers</Text>
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <View style={styles.form}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Book Details</Text>

          <View style={styles.inputContainer}>
            <LibraryBig size={20} color={colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Book Title"
              placeholderTextColor={colors.textMuted}
              value={formData.title}
              onChangeText={(text) => setFormData({ ...formData, title: text })}
            />
          </View>

          <View style={styles.inputContainer}>
            <User size={20} color={colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Author"
              placeholderTextColor={colors.textMuted}
              value={formData.author}
              onChangeText={(text) => setFormData({ ...formData, author: text })}
            />
          </View>

          <View style={[styles.inputContainer, styles.textAreaContainer]}>
            <FileText size={20} color={colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Description"
              placeholderTextColor={colors.textMuted}
              value={formData.description}
              onChangeText={(text) => setFormData({ ...formData, description: text })}
              multiline
              numberOfLines={4}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Categories</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoriesContainer}
          >
            {CATEGORIES.map((category) => (
              <TouchableOpacity
                key={category}
                style={[
                  styles.categoryButton,
                  selectedCategory === category && styles.categoryButtonActive
                ]}
                onPress={() => setSelectedCategory(category)}
                accessibilityRole="radio"
                accessibilityLabel={category}
                accessibilityState={{ checked: selectedCategory === category }}
              >
                <LayoutGrid
                  size={16}
                  color={selectedCategory === category ? colors.onPrimary : colors.textMuted}
                />
                <Text
                  style={[
                    styles.categoryButtonText,
                    selectedCategory === category && styles.categoryButtonTextActive
                  ]}
                >
                  {category}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Language & Condition</Text>

          <View style={styles.optionsGrid}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.languagesContainer}
            >
              {LANGUAGES.map((lang) => (
                <TouchableOpacity
                  key={lang.code}
                  style={[
                    styles.optionButton,
                    selectedLanguage === lang.code && styles.optionButtonActive
                  ]}
                  onPress={() => setSelectedLanguage(lang.code)}
                  accessibilityRole="radio"
                  accessibilityLabel={lang.name}
                  accessibilityState={{ checked: selectedLanguage === lang.code }}
                >
                  <Languages
                    size={16}
                    color={selectedLanguage === lang.code ? colors.onPrimary : colors.textMuted}
                  />
                  <Text
                    style={[
                      styles.optionButtonText,
                      selectedLanguage === lang.code && styles.optionButtonTextActive
                    ]}
                  >
                    {lang.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.conditionsContainer}
            >
              {CONDITIONS.map((condition) => (
                <TouchableOpacity
                  key={condition}
                  style={[
                    styles.optionButton,
                    selectedCondition === condition && styles.optionButtonActive
                  ]}
                  onPress={() => setSelectedCondition(condition)}
                  accessibilityRole="radio"
                  accessibilityLabel={condition}
                  accessibilityState={{ checked: selectedCondition === condition }}
                >
                  <Info
                    size={16}
                    color={selectedCondition === condition ? colors.onPrimary : colors.textMuted}
                  />
                  <Text
                    style={[
                      styles.optionButtonText,
                      selectedCondition === condition && styles.optionButtonTextActive
                    ]}
                  >
                    {condition}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Additional Information</Text>

          <View style={styles.inputContainer}>
            <DollarSign size={20} color={colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Price"
              placeholderTextColor={colors.textMuted}
              value={formData.price}
              onChangeText={(text) => setFormData({ ...formData, price: text })}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputContainer}>
            <LibraryBig size={20} color={colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Number of Pages"
              placeholderTextColor={colors.textMuted}
              value={formData.pages}
              onChangeText={(text) => setFormData({ ...formData, pages: text })}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputContainer}>
            <Info size={20} color={colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="ISBN (optional)"
              placeholderTextColor={colors.textMuted}
              value={formData.isbn}
              onChangeText={(text) => setFormData({ ...formData, isbn: text })}
            />
          </View>

          <View style={styles.inputContainer}>
            <Globe2 size={20} color={colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Location"
              placeholderTextColor={colors.textMuted}
              value={formData.location}
              onChangeText={(text) => setFormData({ ...formData, location: text })}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Photos</Text>
          <Text style={styles.sectionSubtitle}>Upload an image for the Book</Text>

          <View style={styles.imageGrid}>
            {images.map((uri, index) => (
              <View key={index} style={styles.imageContainer}>
                <Image source={{ uri }} style={styles.image} />
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={() => setImages(images.filter((_, i) => i !== index))}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove photo ${index + 1}`}
                >
                  <Text style={styles.removeImageText}>×</Text>
                </TouchableOpacity>
              </View>
            ))}
            {images.length < 1 && (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Choose a book photo"
                style={styles.addImageButton}
                onPress={pickImage}
                disabled={loading}>
                <Camera size={24} color={colors.textMuted} />
                <Text style={styles.addImageText}>Choose photo</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <Button
          label={loading ? 'Listing book' : 'List Book'}
          onPress={handleSubmit}
          disabled={loading}
          loading={loading}
          icon={!loading ? <Upload size={20} color={colors.onPrimary} /> : undefined}
          accessibilityLabel={loading ? 'Listing book' : 'List book'}
          style={styles.submitButton}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: 20,
    alignItems: 'center',
  },
  title: {
    ...type.title,
    color: colors.text,
    marginTop: 12,
  },
  subtitle: {
    ...type.body,
    color: colors.textMuted,
    marginTop: 4,
  },
  form: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    ...type.bodyStrong,
    color: colors.text,
    marginBottom: 12,
  },
  sectionSubtitle: {
    ...type.caption,
    color: colors.textMuted,
    marginBottom: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: touchTarget.minHeight,
    color: colors.text,
    ...type.body,
  },
  textAreaContainer: {
    alignItems: 'flex-start',
    paddingVertical: 12,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  categoriesContainer: {
    marginBottom: 12,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.pill,
    marginRight: 8,
  },
  categoryButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryButtonText: {
    color: colors.textMuted,
    ...type.caption,
    marginLeft: 6,
  },
  categoryButtonTextActive: {
    color: colors.onPrimary,
  },
  optionsGrid: {
    gap: 12,
  },
  languagesContainer: {
    marginBottom: 12,
  },
  conditionsContainer: {
    marginBottom: 12,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.pill,
    marginRight: 8,
  },
  optionButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  optionButtonText: {
    color: colors.textMuted,
    ...type.caption,
    marginLeft: 6,
  },
  optionButtonTextActive: {
    color: colors.onPrimary,
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  imageContainer: {
    width: 100,
    height: 100,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  removeImageButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: colors.overlay,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeImageText: {
    color: colors.onDark,
    ...type.bodyStrong,
  },
  addImageButton: {
    width: 100,
    height: 100,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addImageText: {
    color: colors.textMuted,
    ...type.caption,
    marginTop: 8,
  },
  errorContainer: {
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.danger,
    margin: 20,
    padding: 12,
    borderRadius: radius.sm,
  },
  errorText: {
    color: colors.danger,
    ...type.caption,
    textAlign: 'center',
  },
  submitButton: {
    marginTop: 24,
  },
});
