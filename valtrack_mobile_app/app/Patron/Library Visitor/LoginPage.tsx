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

// Import logo image (use require for RN bundler)
const valtrackLogo = require('../../assets/images/valtrackLogo.png');

// Test Account Credentials
const TEST_CREDENTIALS = {
  userId: '23-2970',
  password: 'admin123',
};

const { width, height } = Dimensions.get('window');

interface LoginPageProps {
  onLoginSuccess?: (credentials: { userId: string; password: string }) => void;
  onSignUpPress?: () => void;
  onForgotPasswordPress?: () => void;
}

export default function LoginPage({
  onLoginSuccess,
  onSignUpPress,
  onForgotPasswordPress,
}: LoginPageProps) {
  const router = useRouter();
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Validates credentials and handles login
   * Test Account: userId: 23-2970, password: admin123
   * On successful login, navigates to Dashboard where Navigation component
   * manages all subsequent screen transitions (Home, In/Out, Profile)
   */
  const handleLogin = () => {
    // Validation: Check for empty fields
    if (!userId.trim() || !password.trim()) {
      Alert.alert('Validation Error', 'Please enter both User ID and password');
      return;
    }

    setIsLoading(true);

    // Simulate API call with timeout
    setTimeout(() => {
      setIsLoading(false);

      // Check if test credentials match
      const isValidCredentials =
        userId === TEST_CREDENTIALS.userId && password === TEST_CREDENTIALS.password;

      if (isValidCredentials) {
        // Clear inputs on successful login
        setUserId('');
        setPassword('');

        // Navigate to Dashboard home screen
        // Navigation component will handle all screen transitions from here
        router.replace('/Patron/Home/Dashboard');
        return;
      }

      // Invalid credentials
      Alert.alert(
        'Login Failed',
        'Invalid User ID or password. Please try again.\n\nTest Account: 23-2970 / admin123'
      );

      // Optional callback for custom login handling (can be used for real API integration later)
      if (onLoginSuccess) {
        onLoginSuccess({ userId, password });
      }
    }, 1500);
  };

  /**
   * Handles forgot password action
   */
  const handleForgotPassword = () => {
    if (onForgotPasswordPress) {
      onForgotPasswordPress();
    }
  };

  /**
   * Handles sign up navigation
   */
  const handleSignUp = () => {
    if (onSignUpPress) {
      onSignUpPress();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
        >
          <View style={styles.loginCard}>
            {/* App Logo */}
            <View style={styles.logoContainer}>
              <Image
                source={valtrackLogo}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>

            {/* User ID Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>User ID</Text>
              <View style={styles.inputField}>
                <Ionicons
                  name="person-outline"
                  size={20}
                  color="#666"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your User ID"
                  placeholderTextColor="#999"
                  value={userId}
                  onChangeText={setUserId}
                  editable={!isLoading}
                  accessibilityLabel="User ID input"
                />
              </View>
            </View>

            {/* Password Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputField}>
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color="#666"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your password"
                  placeholderTextColor="#999"
                  secureTextEntry={!isPasswordVisible}
                  value={password}
                  onChangeText={setPassword}
                  editable={!isLoading}
                  accessibilityLabel="Password input"
                />
                <TouchableOpacity
                  onPress={() => setIsPasswordVisible(!isPasswordVisible)}
                  disabled={isLoading}
                  style={styles.visibilityButton}
                >
                  <Ionicons
                    name={isPasswordVisible ? 'eye-outline' : 'eye-off-outline'}
                    size={20}
                    color="#666"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Forgot Password */}
            <TouchableOpacity
              onPress={handleForgotPassword}
              disabled={isLoading}
              style={styles.forgotPasswordContainer}
            >
              <Text style={styles.forgotPasswordText}>Forgot password?</Text>
            </TouchableOpacity>

            {/* Login Button */}
            <TouchableOpacity
              style={[
                styles.loginButton,
                isLoading && styles.loginButtonDisabled,
              ]}
              onPress={handleLogin}
              disabled={isLoading}
              activeOpacity={0.7}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.loginButtonText}>Login</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Sign Up */}
          <View style={styles.signUpContainer}>
            <Text style={styles.signUpText}>Don't have an account? </Text>
            <TouchableOpacity
              onPress={handleSignUp}
              disabled={isLoading}
              activeOpacity={0.7}
            >
              <Text style={styles.signUpLink}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: width * 0.05,
    paddingVertical: height * 0.05,
  },
  loginCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: width * 0.08,
    paddingVertical: height * 0.05,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
    height: 120,
  },
  logo: {
    width: 200,
    height: 200,
  },
  inputContainer: {
    marginBottom: 20 ,
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  inputField: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderWidth: 1.5,
    borderColor: '#ddd',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  visibilityButton: {
    padding: 8,
    marginLeft: 4,
  },
  forgotPasswordContainer: {
    alignItems: 'center',
    marginBottom: height * 0.04,
  },
  forgotPasswordText: {
    fontSize: 13,
    color: '#333',
    fontWeight: '600',
  },
  loginButton: {
    backgroundColor: '#001a4d',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: height * 0.05,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  signUpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: height * 0.03,
  },
  signUpText: {
    fontSize: 13,
    color: '#666',
  },
  signUpLink: {
    fontSize: 13,
    color: '#001a4d',
    fontWeight: '700',
  },
});
