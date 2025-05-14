import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Link } from 'expo-router';
import { ArrowLeft, ChevronDown, ChevronUp, BookOpen, MessageSquare, ShoppingBag, Settings, CircleHelp as HelpCircle, User } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import React from 'react';

interface Section {
  id: string;
  title: string;
  icon: any;
  items: {
    question: string;
    answer: string;
  }[];
}

const HELP_SECTIONS: Section[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: User,
    items: [
      {
        question: 'How do I create an account?',
        answer: 'To create an account, tap the "Sign Up" button on the login screen. Enter your email, create a password, and fill in your profile information. You\'ll receive a verification email to confirm your account.',
      },
      {
        question: 'How do I log in and log out?',
        answer: 'To log in, enter your email and password on the login screen. To log out, go to Settings and tap the "Sign Out" button at the bottom of the screen.',
      },
      {
        question: 'How do I edit my profile?',
        answer: 'Go to your Profile tab and tap "Edit Profile". Here you can update your profile picture, name, bio, and other information. Don\'t forget to save your changes.',
      },
    ],
  },
  {
    id: 'using-app',
    title: 'Using the App',
    icon: BookOpen,
    items: [
      {
        question: 'How do I search for books?',
        answer: 'Use the search bar in the Browse tab to find books. You can search by title, author, or ISBN. Toggle between Google Books and user listings using the filters.',
      },
      {
        question: 'How do I use filters?',
        answer: 'Tap the filter icon next to the search bar to access filtering options. You can filter by language, price range, format (physical/digital), and condition.',
      },
      {
        question: 'How do I add books to my lists?',
        answer: 'On any book page, tap the heart icon to add it to your Wishlist, or use the "Add to Library" button for books you own.',
      },
    ],
  },
  {
    id: 'buying-selling',
    title: 'Buying and Selling Books',
    icon: ShoppingBag,
    items: [
      {
        question: 'How do I list a book for sale?',
        answer: 'Tap the "+" tab and select "List a Book". Fill in the book details, add photos, set your price, and specify the condition. Make sure to provide accurate information.',
      },
      {
        question: 'How do I browse user listings?',
        answer: 'In the Browse tab, use the "User Listings" filter to see books listed by other users. You can sort by price, location, or date listed.',
      },
      {
        question: 'Safety tips for transactions',
        answer: 'Always meet in a public place, verify the book\'s condition before purchasing, and use secure payment methods. Never share personal financial information.',
      },
    ],
  },
  {
    id: 'messaging',
    title: 'Messaging and Sharing',
    icon: MessageSquare,
    items: [
      {
        question: 'How do I message other users?',
        answer: 'Visit a user\'s profile or tap the message button on a book listing to start a conversation. You can also access your messages from the Messages tab.',
      },
      {
        question: 'How do I share books in chat?',
        answer: 'While in a chat, tap the share icon and select the book you want to share. The book card will appear in your conversation.',
      },
      {
        question: 'How do I share outside the app?',
        answer: 'On any book page, tap the share icon to copy the link or share directly to other apps.',
      },
    ],
  },
  {
    id: 'activity',
    title: 'Managing My Activity',
    icon: Settings,
    items: [
      {
        question: 'How do I view my lists?',
        answer: 'Access your Wishlist, Reading History, and Library from your Profile tab. Tap on any list to view and manage its contents.',
      },
      {
        question: 'How do I manage my books?',
        answer: 'In your Library, tap on any book to edit its details or remove it. You can also mark books as sold or unavailable.',
      },
      {
        question: 'How do I see my connections?',
        answer: 'Your Profile shows your follower and following counts. Tap either number to see the full list of users.',
      },
    ],
  },
  {
    id: 'troubleshooting',
    title: 'Troubleshooting & FAQ',
    icon: HelpCircle,
    items: [
      {
        question: 'Why can\'t I preview a book?',
        answer: 'Book previews may be unavailable if the publisher hasn\'t provided preview rights. Try using the external link or contact the seller for physical books.',
      },
      {
        question: 'How do I reset my password?',
        answer: 'On the login screen, tap "Forgot Password" and enter your email. You\'ll receive instructions to create a new password.',
      },
      {
        question: 'How do I report issues?',
        answer: 'Go to Settings > Help & Support > Report a Problem. Describe the issue in detail and include screenshots if possible.',
      },
    ],
  },
];

export default function HelpCenter() {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const router = useRouter();

  const toggleSection = (sectionId: string) => {
    setExpandedSection(expandedSection === sectionId ? null : sectionId);
    // Close all items when collapsing section
    if (expandedSection === sectionId) {
      setExpandedItems(new Set());
    }
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.push('/settings');
    }
  };

  const toggleItem = (itemId: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
        >
          <ArrowLeft size={24} color="#FBF3F2" />
        </TouchableOpacity>
        <Text style={styles.title}>Help Center</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {HELP_SECTIONS.map((section) => {
          const Icon = section.icon;
          const isExpanded = expandedSection === section.id;

          return (
            <View key={section.id} style={styles.section}>
              <TouchableOpacity
                style={[
                  styles.sectionHeader,
                  isExpanded && styles.sectionHeaderActive
                ]}
                onPress={() => toggleSection(section.id)}
              >
                <View style={styles.sectionTitle}>
                  <Icon size={24} color={isExpanded ? '#FA991C' : '#FBF3F2'} />
                  <Text style={[
                    styles.sectionTitleText,
                    isExpanded && styles.sectionTitleTextActive
                  ]}>
                    {section.title}
                  </Text>
                </View>
                {isExpanded ? (
                  <ChevronUp size={24} color="#FA991C" />
                ) : (
                  <ChevronDown size={24} color="#FBF3F2" />
                )}
              </TouchableOpacity>

              {isExpanded && (
                <View style={styles.sectionContent}>
                  {section.items.map((item, index) => {
                    const itemId = `${section.id}-${index}`;
                    const isItemExpanded = expandedItems.has(itemId);

                    return (
                      <View key={itemId} style={styles.item}>
                        <TouchableOpacity
                          style={[
                            styles.itemHeader,
                            isItemExpanded && styles.itemHeaderActive
                          ]}
                          onPress={() => toggleItem(itemId)}
                        >
                          <Text style={[
                            styles.itemQuestion,
                            isItemExpanded && styles.itemQuestionActive
                          ]}>
                            {item.question}
                          </Text>
                          {isItemExpanded ? (
                            <ChevronUp size={20} color="#FA991C" />
                          ) : (
                            <ChevronDown size={20} color="#1C768F" />
                          )}
                        </TouchableOpacity>
                        {isItemExpanded && (
                          <Text style={styles.itemAnswer}>
                            {item.answer}
                          </Text>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          );
        })}
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
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1C768F',
    padding: 16,
    borderRadius: 12,
  },
  sectionHeaderActive: {
    backgroundColor: '#032539',
    borderWidth: 2,
    borderColor: '#FA991C',
  },
  sectionTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sectionTitleText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FBF3F2',
  },
  sectionTitleTextActive: {
    color: '#FA991C',
  },
  sectionContent: {
    backgroundColor: '#1C768F',
    marginTop: 2,
    borderRadius: 12,
    overflow: 'hidden',
  },
  item: {
    borderBottomWidth: 1,
    borderBottomColor: '#032539',
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  itemHeaderActive: {
    backgroundColor: '#032539',
  },
  itemQuestion: {
    flex: 1,
    fontSize: 16,
    color: '#FBF3F2',
    marginRight: 8,
  },
  itemQuestionActive: {
    color: '#FA991C',
    fontWeight: '500',
  },
  itemAnswer: {
    fontSize: 14,
    lineHeight: 20,
    color: '#FBF3F2',
    opacity: 0.8,
    padding: 16,
    paddingTop: 0,
  },
});