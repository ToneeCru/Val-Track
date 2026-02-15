import { Image, StyleSheet, Text, TouchableOpacity, View, Linking } from 'react-native';
import React from 'react';

export default function GlobalFooter() {
    const valtrackLogo = require('../assets/images/valtrackLogo2.png');

    const handleLinkPress = (url: string) => {
        // Placeholder for navigation or linking
        console.log(`Navigating to: ${url}`);
        // Linking.openURL(url).catch(err => console.error("Couldn't load page", err));
    };

    return (
        <View style={styles.footerContainer}>
            <Image source={valtrackLogo} style={styles.footerLogo} resizeMode="contain" />

            <Text style={styles.copyrightText}>© 2026 Valenzuela City Library</Text>

            <View style={styles.linksRow}>
                <TouchableOpacity onPress={() => handleLinkPress('terms')}>
                    <Text style={styles.footerLink}>Terms of Service</Text>
                </TouchableOpacity>

                <Text style={styles.divider}> | </Text>

                <TouchableOpacity onPress={() => handleLinkPress('privacy')}>
                    <Text style={styles.footerLink}>Privacy Policy</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    footerContainer: {
        alignItems: 'center',
        paddingVertical: 32,
        paddingHorizontal: 20,
        backgroundColor: 'transparent',
        width: '100%',
    },
    footerLogo: {
        width: 120,
        height: 60, // Adjusted height for logo2
        marginBottom: 16,
    },
    copyrightText: {
        fontSize: 12,
        color: '#999',
        marginBottom: 12,
        textAlign: 'center',
    },
    linksRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    footerLink: {
        fontSize: 12,
        color: '#5B67CA', // Actionable color
        fontWeight: '500',
    },
    divider: {
        fontSize: 12,
        color: '#ccc',
        marginHorizontal: 8,
    },
});
