import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View, Image, SafeAreaView } from 'react-native';

const { width, height } = Dimensions.get('window');

export default function VerificationSubmitted() {
    const router = useRouter();

    const handleBackToLogin = () => {
        // Navigate back to the start or login
        router.replace('/');
    };

    return (
        <View style={styles.mainContainer}>
            {/* Background */}
            <Image
                source={require('../../assets/images/login-bg.png')}
                style={styles.backgroundImage}
                resizeMode="cover"
            />
            <View style={styles.overlay} />

            <SafeAreaView style={styles.safeArea}>
                {/* Header Section */}
                <View style={styles.headerSection}>
                    <View style={styles.logoOuterGlow}>
                        <View style={styles.logoContainer}>
                            <Image
                                source={require('../../assets/images/loginPageLogo.png')}
                                style={styles.logo}
                                resizeMode="cover"
                            />
                        </View>
                    </View>
                    <Text style={styles.headerTitle}>Val-Track Go</Text>
                </View>

                {/* White Container */}
                <View style={styles.whiteContainer}>
                    <View style={styles.contentWrapper}>
                        <View style={styles.iconContainer}>
                            <Ionicons name="checkmark-circle" size={100} color="#00104A" />
                        </View>

                        <Text style={styles.title}>Verification Submitted</Text>
                        <Text style={styles.description}>
                            Your selfie and ID have been securely uploaded. Our team will review your application within 24-48 hours.
                        </Text>

                        <TouchableOpacity style={styles.primaryButton} onPress={handleBackToLogin}>
                            <Text style={styles.primaryButtonText}>Back to Login</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    mainContainer: {
        flex: 1,
    },
    backgroundImage: {
        ...StyleSheet.absoluteFillObject,
        width: '100%',
        height: '100%',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 16, 74, 0.70)',
    },
    safeArea: {
        flex: 1,
    },

    /* Header (Matching SignUp/Login) */
    headerSection: {
        alignItems: 'center',
        paddingTop: height * 0.05,
        paddingBottom: 30,
    },
    logoOuterGlow: {
        width: 140,
        height: 140,
        borderRadius: 70,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.08)',
        shadowColor: '#4DA6FF',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 25,
        elevation: 20,
        marginBottom: 15,
    },
    logoContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 10,
    },
    logo: {
        width: 100,
        height: 100,
    },
    headerTitle: {
        fontSize: 32,
        fontWeight: '800',
        color: '#FFFFFF',
        letterSpacing: 1.5,
    },

    /* White Container */
    whiteContainer: {
        flex: 1,
        backgroundColor: '#fff',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        paddingHorizontal: 30,
        paddingTop: 50,
        alignItems: 'center',
    },
    contentWrapper: {
        width: '100%',
        alignItems: 'center',
    },
    iconContainer: {
        marginBottom: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        color: '#00104A',
        marginBottom: 15,
        textAlign: 'center',
    },
    description: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 40,
        paddingHorizontal: 10,
    },
    primaryButton: {
        backgroundColor: '#00104A',
        borderRadius: 12,
        height: 55,
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#00104A',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    primaryButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
});
