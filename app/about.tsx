import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Platform, ImageSourcePropType } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, BookOpen, Users, Sparkles, Heart } from 'lucide-react-native';
import React from 'react';
import { colors, radius, spacing, type } from '@/src/presentation/theme/tokens';
import { Card } from '@/src/presentation/components/ui';

interface TeamMember {
  name: string;
  role: string;
  image: ImageSourcePropType;
}

const TEAM_MEMBERS: TeamMember[] = [
  {
    name: 'Abdulrahman Halabi',
    role: 'Full Stack Developer',
    image: require('../assets/images/halabi.jpg'),
  },
  {
    name: 'Bader Othman',
    role: 'Full Stack Developer',
    image: require('../assets/images/bader.jpg'),
  },
  {
    name: 'Jibril Kabbara',
    role: 'Frontend Developer & Designer',
    image: require('../assets/images/jibril.jpg'),
  },
  {
    name: 'Nour Al Hakam',
    role: 'UI/UX Designer & Frontend Developer',
    image: require('../assets/images/nour.jpg'),
  },
];


export default function AboutScreen() {
  const router = useRouter();

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.push('/settings');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>About Us</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroSection}>
          <Image
            source={{ uri: 'https://images.pexels.com/photos/1907785/pexels-photo-1907785.jpeg?w=800&q=80' }}
            style={styles.heroImage}
          />
          <View style={styles.heroOverlay} />
          <View style={styles.heroContent}>
            <BookOpen size={48} color={colors.foil} />
            <Text style={styles.heroTitle}>Connecting Readers Worldwide</Text>
            <Text style={styles.heroSubtitle}>Share stories, discover books, build community</Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Heart size={24} color={colors.primary} />
            <Text style={styles.sectionTitle}>Our Mission</Text>
          </View>
          <Text style={styles.sectionText}>
            We're on a mission to make discovering, reading, and sharing books easier and more social for everyone. Our platform helps readers find books they love, connect with fellow book enthusiasts, and create meaningful connections through literature.
          </Text>
          <Text style={styles.sectionText}>
            Whether you're searching for your next great read, looking to share your book collection, or hoping to connect with other readers, we're here to make that journey more enjoyable and accessible.
          </Text>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <BookOpen size={24} color={colors.primary} />
            <Text style={styles.sectionTitle}>What We Offer</Text>
          </View>
          <View style={styles.features}>
            <Card style={styles.featureCard}>
              <Text style={styles.featureTitle}>Vast Library</Text>
              <Text style={styles.featureText}>
                Access millions of books through Google Books API, from classics to latest releases.
              </Text>
            </Card>
            <Card style={styles.featureCard}>
              <Text style={styles.featureTitle}>Book Exchange</Text>
              <Text style={styles.featureText}>
                List and discover physical books in your area, building local reading communities.
              </Text>
            </Card>
            <Card style={styles.featureCard}>
              <Text style={styles.featureTitle}>Smart Features</Text>
              <Text style={styles.featureText}>
                Track your reading, create wishlists, and get personalized recommendations.
              </Text>
            </Card>
            <Card style={styles.featureCard}>
              <Text style={styles.featureTitle}>Reader Community</Text>
              <Text style={styles.featureText}>
                Connect with other readers, share recommendations, and discuss your favorite books.
              </Text>
            </Card>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Sparkles size={24} color={colors.primary} />
            <Text style={styles.sectionTitle}>Our Vision</Text>
          </View>
          <Text style={styles.sectionText}>
            We envision a world where books are more than just products — they're experiences shared between readers, bridges that connect people across cultures and distances.
          </Text>
          <Text style={styles.sectionText}>
            Our goal is to make reading more social, engaging, and accessible for everyone, fostering a global community of passionate readers who share, discuss, and discover stories together.
          </Text>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Users size={24} color={colors.primary} />
            <Text style={styles.sectionTitle}>Meet the Team</Text>
          </View>
          <View style={styles.teamGrid}>
            {TEAM_MEMBERS.map((member, index) => (
              <Card key={index} style={styles.teamCard}>
                <Image
                  source={member.image}
                  style={styles.teamMemberImage}
                />
                <Text style={styles.teamMemberName}>{member.name}</Text>
                <Text style={styles.teamMemberRole}>{member.role}</Text>
              </Card>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: Platform.OS === 'ios' ? 60 : Platform.OS === 'android' ? 40 : 20,
    paddingBottom: spacing.md,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    ...type.heading,
    color: colors.text,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  heroSection: {
    height: 300,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.overlay,
  },
  heroContent: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  heroTitle: {
    ...type.title,
    color: colors.text,
    textAlign: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  heroSubtitle: {
    ...type.body,
    color: colors.text,
    textAlign: 'center',
  },
  section: {
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  sectionTitle: {
    ...type.heading,
    color: colors.text,
  },
  sectionText: {
    ...type.body,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  features: {
    gap: spacing.md,
  },
  featureCard: {
    padding: spacing.lg,
  },
  featureTitle: {
    ...type.bodyStrong,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  featureText: {
    ...type.caption,
    color: colors.textMuted,
  },
  teamGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  teamCard: {
    width: '47%',
    alignItems: 'center',
  },
  teamMemberImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: spacing.sm,
    borderWidth: 3,
    borderColor: colors.primary,
  },
  teamMemberName: {
    ...type.label,
    color: colors.text,
    marginBottom: spacing.xxs,
    textAlign: 'center',
  },
  teamMemberRole: {
    ...type.caption,
    color: colors.foil,
    textAlign: 'center',
  },
});
