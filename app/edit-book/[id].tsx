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
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Camera, Save, Trash2, BookOpen, User, Globe as Globe2, DollarSign, Info, Languages, LayoutGrid } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import * as ImagePicker from 'expo-image-picker';
import React from 'react';

interface Book {
  id: string;
  title: string;
  author: string;
  description: string;
  category: string;
  language: string;
  condition: string;
  price: number;
  pages: number | null;
  isbn: string | null;
  location: string | null;
  images: string[];
}

const CONDITIONS = [
  'New',
  'Like New',
  'Very Good',
  'Good',
  'Fair',
  'Poor',
];

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

export default function EditBookScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { session } = useAuth();
  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [images, setImages] = useState<string[]>([]);

  useEffect(() => {
    if (session?.user?.id && id) {
      loadBook();
    }
  }, [session?.user?.id, id]);

  const loadBook = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('books')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;
      if (!data) throw new Error('Book not found');

      setBook(data);
      setImages(data.images || []);
    } catch (err) {
      console.error('Error loading book:', err);
      setError('Failed to load book details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    try {
      if (images.length >= 5) {
        Alert.alert('Limit Reached', 'You can only upload up to 5 images');
        return;
      }

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
          aspect: [4, 3],
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
      const fileName = `book-${Date.now()}-${Math.random().toString(36).substring(7)}`;
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
        .from('books')
        .upload(filePath, file, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('books')
        .getPublicUrl(filePath);

      if (!data || !data.publicUrl) {
        throw new Error('Failed to retrieve public URL for the uploaded image');
      }

      const publicUrl = data.publicUrl;

      setImages(prev => [...prev, publicUrl]);
    } catch (err) {
      console.error('Error uploading image:', err);
      Alert.alert('Error', 'Failed to upload image. Please try again.');
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!book) return;

    try {
      setSaving(true);
      setError(null);

      if (!book.title || !book.author || !book.price || !book.category || !book.language || !book.condition) {
        setError('Please fill in all required fields');
        return;
      }

      if (images.length === 0) {
        setError('Please add at least one image');
        return;
      }

      const { error: updateError } = await supabase
        .from('books')
        .update({
          ...book,
          images,
        })
        .eq('id', id);

      if (updateError) throw updateError;

      Alert.alert(
        'Success',
        'Book updated successfully!',
        [
          { 
            text: 'View Library', 
            onPress: () => router.push('/library') 
          }
        ]
      );
    } catch (err) {
      console.error('Error updating book:', err);
      setError('Failed to update book. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FA991C" />
        <Text style={styles.loadingText}>Loading book details...</Text>
      </View>
    );
  }

  if (!book) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Book not found</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color="#FBF3F2" />
        </TouchableOpacity>
        <Text style={styles.title}>Edit Book</Text>
        <TouchableOpacity 
          style={[styles.saveButton, saving && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          <Save size={24} color="#FBF3F2" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {error && (
          <View style={styles.errorAlert}>
            <Text style={styles.errorAlertText}>{error}</Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Book Details</Text>

          <View style={styles.inputContainer}>
            <BookOpen size={20} color="#1C768F" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Book Title"
              placeholderTextColor="#1C768F"
              value={book.title}
              onChangeText={(text) => setBook({ ...book, title: text })}
            />
          </View>

          <View style={styles.inputContainer}>
            <User size={20} color="#1C768F" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Author"
              placeholderTextColor="#1C768F"
              value={book.author}
              onChangeText={(text) => setBook({ ...book, author: text })}
            />
          </View>

          <View style={[styles.inputContainer, styles.textAreaContainer]}>
            <Info size={20} color="#1C768F" style={styles.inputIcon} />
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Description"
              placeholderTextColor="#1C768F"
              value={book.description}
              onChangeText={(text) => setBook({ ...book, description: text })}
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
                  book.category === category && styles.categoryButtonActive
                ]}
                onPress={() => setBook({ ...book, category })}
              >
                <LayoutGrid 
                  size={16} 
                  color={book.category === category ? '#FBF3F2' : '#1C768F'} 
                />
                <Text 
                  style={[
                    styles.categoryButtonText,
                    book.category === category && styles.categoryButtonTextActive
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
          
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.optionsContainer}
          >
            {LANGUAGES.map((lang) => (
              <TouchableOpacity
                key={lang.code}
                style={[
                  styles.optionButton,
                  book.language === lang.code && styles.optionButtonActive
                ]}
                onPress={() => setBook({ ...book, language: lang.code })}
              >
                <Languages 
                  size={16} 
                  color={book.language === lang.code ? '#FBF3F2' : '#1C768F'} 
                />
                <Text 
                  style={[
                    styles.optionButtonText,
                    book.language === lang.code && styles.optionButtonTextActive
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
            style={styles.optionsContainer}
          >
            {CONDITIONS.map((condition) => (
              <TouchableOpacity
                key={condition}
                style={[
                  styles.optionButton,
                  book.condition === condition && styles.optionButtonActive
                ]}
                onPress={() => setBook({ ...book, condition })}
              >
                <Info 
                  size={16} 
                  color={book.condition === condition ? '#FBF3F2' : '#1C768F'} 
                />
                <Text 
                  style={[
                    styles.optionButtonText,
                    book.condition === condition && styles.optionButtonTextActive
                  ]}
                >
                  {condition}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Additional Information</Text>

          <View style={styles.inputContainer}>
            <DollarSign size={20} color="#1C768F" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Price"
              placeholderTextColor="#1C768F"
              value={book.price.toString()}
              onChangeText={(text) => setBook({ ...book, price: parseFloat(text) || 0 })}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputContainer}>
            <BookOpen size={20} color="#1C768F" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Number of Pages"
              placeholderTextColor="#1C768F"
              value={book.pages?.toString() || ''}
              onChangeText={(text) => setBook({ ...book, pages: parseInt(text) || null })}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputContainer}>
            <Info size={20} color="#1C768F" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="ISBN (optional)"
              placeholderTextColor="#1C768F"
              value={book.isbn || ''}
              onChangeText={(text) => setBook({ ...book, isbn: text })}
            />
          </View>

          <View style={styles.inputContainer}>
            <Globe2 size={20} color="#1C768F" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Location"
              placeholderTextColor="#1C768F"
              value={book.location || ''}
              onChangeText={(text) => setBook({ ...book, location: text })}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Photos</Text>
          <Text style={styles.sectionSubtitle}>Add up to 5 photos of your book</Text>

          <View style={styles.imageGrid}>
            {images.map((uri, index) => (
              <View key={index} style={styles.imageContainer}>
                <Image source={{ uri }} style={styles.image} />
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={() => removeImage(index)}
                >
                  <Trash2 size={16} color="#FBF3F2" />
                </TouchableOpacity>
              </View>
            ))}
            {images.length < 5 && (
              <TouchableOpacity 
                style={styles.addImageButton}
                onPress={pickImage}
              >
                <Camera size={24} color="#1C768F" />
                <Text style={styles.addImageText}>Add Photo</Text>
              </TouchableOpacity>
            )}
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
  buttonDisabled: {
    opacity: 0.7,
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FBF3F2',
    marginBottom: 12,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#FBF3F2',
    opacity: 0.8,
    marginBottom: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FBF3F2',
    borderRadius: 12,
    marginBottom: 12,
    paddingHorizontal: 16,
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
    backgroundColor: '#FBF3F2',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  categoryButtonActive: {
    backgroundColor: '#1C768F',
  },
  categoryButtonText: {
    color: '#1C768F',
    fontSize: 14,
    marginLeft: 6,
  },
  categoryButtonTextActive: {
    color: '#FBF3F2',
  },
  optionsContainer: {
    marginBottom: 12,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FBF3F2',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  optionButtonActive: {
    backgroundColor: '#1C768F',
  },
  optionButtonText: {
    color: '#1C768F',
    fontSize: 14,
    marginLeft: 6,
  },
  optionButtonTextActive: {
    color: '#FBF3F2',
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  imageContainer: {
    width: 100,
    height: 100,
    borderRadius: 12,
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
    backgroundColor: '#DC2626',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addImageButton: {
    width: 100,
    height: 100,
    backgroundColor: '#FBF3F2',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addImageText: {
    color: '#1C768F',
    fontSize: 14,
    marginTop: 8,
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#032539',
  },
  errorText: {
    fontSize: 18,
    color: '#FA991C',
    marginBottom: 20,
    textAlign: 'center',
  },
  backButtonText: {
    color: '#FBF3F2',
    fontSize: 16,
    fontWeight: '600',
  },
  errorAlert: {
    margin: 20,
    padding: 16,
    backgroundColor: '#FA991C',
    borderRadius: 8,
  },
  errorAlertText: {
    color: '#032539',
    fontSize: 14,
    textAlign: 'center',
  },
});