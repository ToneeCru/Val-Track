import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { supabase } from '../../../lib/supabase';

const valtrackLogo = require('../../assets/images/loginPageLogo.png');



const { height } = Dimensions.get('window');

interface LoginPageProps {
  onLoginSuccess?: (credentials: { userId: string; password: string }) => void;
  onSignUpPress?: () => void;
}

export default function LoginPage({
  onLoginSuccess,
  onSignUpPress,
}: LoginPageProps) {

  const router = useRouter();
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!userId.trim() || !password.trim()) {
      Alert.alert('Validation Error', 'Please enter both Library ID/Email and password');
      return;
    }

    setIsLoading(true);

    try {
      // Check if input is email or library ID
      const isEmail = userId.includes('@');

      let query = supabase
        .from('patrons')
        .select('*')
        .eq('password', password);

      if (isEmail) {
        query = query.eq('email', userId.trim());
      } else {
        query = query.eq('library_id', userId.trim());
      }

      const { data, error } = await query.single();

      if (error || !data) {
        setIsLoading(false);
        Alert.alert(
          'Login Failed',
          'Invalid credentials. Please check your Library ID/Email and password.'
        );
        return;
      }

      // Check account status
      if (data.account_status !== 'active') {
        setIsLoading(false);
        Alert.alert(
          'Account Inactive',
          'Your account is not active. Please contact the library administrator.'
        );
        return;
      }

      // Successful login
      setIsLoading(false);
      setUserId('');
      setPassword('');

      if (onLoginSuccess) {
        onLoginSuccess({ userId, password });
      }

      // Navigate to dashboard
      router.replace('/Patron/Home/Dashboard');
    } catch (error: any) {
      setIsLoading(false);
      console.error('Login error:', error);
      Alert.alert('Error', 'An error occurred during login. Please try again.');
    }
  };

  const handleSignUp = () => {
    if (onSignUpPress) onSignUpPress();
  };

  return (
    <View style={styles.container}>
      {/* Background */}
      <Image
        source={require('../../assets/images/login-bg.png')}
        style={styles.backgroundImage}
        resizeMode="cover"
      />
      <View style={styles.overlay} />

      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >

            {/* HEADER SECTION */}
            <View style={styles.headerSection}>
              <View style={styles.logoOuterGlow}>
                <View style={styles.logoContainer}>
                  <Image
                    source={valtrackLogo}
                    style={styles.logo}
                    resizeMode="contain"
                  />
                </View>
              </View>

              <Text style={styles.appTitle}>Val-Track Go</Text>
            </View>

            {/* FORM CARD */}
            <View style={styles.formCard}>
              <Text style={styles.welcomeTitle}>Welcome Back</Text>

              <View style={styles.subtitleContainer}>
                <Text style={styles.subtitleText}>
                  Don't have an account?{' '}
                </Text>
                <TouchableOpacity onPress={handleSignUp} disabled={isLoading}>
                  <Text style={styles.signUpLink}>Sign Up</Text>
                </TouchableOpacity>
              </View>

              {/* Library ID / Email */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Library ID / Email</Text>
                <View style={styles.inputField}>
                  <Ionicons
                    name="person-outline"
                    size={20}
                    color="#666"
                    style={{ marginRight: 10 }}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your Library ID or Email"
                    placeholderTextColor="#999"
                    value={userId}
                    onChangeText={setUserId}
                    editable={!isLoading}
                    autoCapitalize="none"
                  />
                </View>
              </View>

              {/* Password */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Password</Text>
                <View style={styles.inputField}>
                  <Ionicons
                    name="lock-closed-outline"
                    size={20}
                    color="#666"
                    style={{ marginRight: 10 }}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your password"
                    placeholderTextColor="#999"
                    secureTextEntry={!isPasswordVisible}
                    value={password}
                    onChangeText={setPassword}
                    editable={!isLoading}
                  />
                  <TouchableOpacity
                    onPress={() => setIsPasswordVisible(!isPasswordVisible)}
                    disabled={isLoading}
                  >
                    <Ionicons
                      name={isPasswordVisible ? 'eye-outline' : 'eye-off-outline'}
                      size={20}
                      color="#666"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Remember Me */}
              <TouchableOpacity
                style={styles.rememberMeContainer}
                onPress={() => setRememberMe(!rememberMe)}
              >
                <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                  {rememberMe && (
                    <Ionicons name="checkmark" size={14} color="#fff" />
                  )}
                </View>
                <Text style={styles.rememberMeText}>Remember me</Text>
              </TouchableOpacity>

              {/* Sign In Button */}
              <TouchableOpacity
                style={[styles.loginButton, isLoading && { opacity: 0.7 }]}
                onPress={handleLogin}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.loginButtonText}>Sign In</Text>
                )}
              </TouchableOpacity>
            </View>

          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({

  container: {
    flex: 1,
  },

  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 16, 74, 0.65)',
  },

  safeArea: {
    flex: 1,
  },

  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },

  /* HEADER */
  headerSection: {
    alignItems: 'center',
    marginTop: height * 0.08,
    marginBottom: 40,
  },

  logoOuterGlow: {
    width: 170,
    height: 170,
    borderRadius: 85,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    shadowColor: '#4DA6FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 30,
    elevation: 25,
  },

  logoContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 12,
  },

  logo: {
    width: 125, // Increased to fit better
    height: 125,
    resizeMode: 'cover',
  },

  appTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 20,
    letterSpacing: 1.5,
  },

  /* FORM */
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    elevation: 6,
  },

  welcomeTitle: {
    color: '#00104A',
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },

  subtitleContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 24,
  },

  subtitleText: {
    fontSize: 14,
    color: '#666',
  },

  signUpLink: {
    fontSize: 14,
    color: '#00104A',
    fontWeight: '600',
  },

  inputContainer: {
    marginBottom: 16,
  },

  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },

  inputField: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 50,
  },

  input: {
    flex: 1,
    fontSize: 15,
  },

  rememberMeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },

  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },

  checkboxChecked: {
    backgroundColor: '#00104A',
    borderColor: '#00104A',
  },

  rememberMeText: {
    fontSize: 14,
    color: '#64748B',
  },

  loginButton: {
    backgroundColor: '#00104A',
    borderRadius: 12,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },

  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

});
