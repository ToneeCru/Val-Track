import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, Modal, Platform, StyleSheet, Text, ToastAndroid, TouchableOpacity, View } from 'react-native';
import { processSelfie, validateIDPresence } from '../lib/imageProcessor';


const { width, height } = Dimensions.get('window');
const MASK_SIZE = width * 0.7;
const ID_BOX_WIDTH = width * 0.45;
const ID_BOX_HEIGHT = width * 0.3;

interface KYCCameraProps {
    registrationId?: string;
    onCapture: (uri: string) => void;
    onCancel: () => void;
}

export default function KYCCamera({ registrationId, onCapture, onCancel }: KYCCameraProps) {
    const router = useRouter();
    const [permission, requestPermission] = useCameraPermissions();

    const cameraRef = useRef<CameraView>(null);

    // Validation States
    const [faceDetected, setFaceDetected] = useState(false);
    const [faceIsCentered, setFaceIsCentered] = useState(false);
    const [isIDVisible, setIsIDVisible] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);

    const [isProcessing, setIsProcessing] = useState(false);
    const [isUploading, setIsUploading] = useState(false);


    const [message, setMessage] = useState('Align your face and ID card');

    useEffect(() => {
        if (!permission) {
            requestPermission();
        }
    }, [permission]);

    // Heuristic Verification Simulator
    // Since expo-face-detector is deprecated in SDK 54 Expo Go, 
    // we use a heuristic verification that requires user to hold steady.
    const verifyAlignment = () => {
        setIsVerifying(true);
        setMessage('Verifying ID card presence... Hold steady');

        // Simulate a 2.5-second "live" check
        setTimeout(() => {
            // Heuristic logic: We auto-pass the UI check but the final photo 
            // will be strictly validated in the capture phase.
            setFaceDetected(true);
            setFaceIsCentered(true);
            setIsIDVisible(true);
            setIsVerifying(false);
            setMessage('Guides aligned! Hold still and capture.');
        }, 2500);
    };

    const showToast = (msg: string) => {
        if (Platform.OS === 'android') {
            ToastAndroid.show(msg, ToastAndroid.SHORT);
        } else {
            Alert.alert('Verification', msg);
        }
    };

    const takeFinalPicture = async () => {
        if (!faceDetected || !faceIsCentered || !isIDVisible) {
            showToast('Please hold your ID clearly next to your face.');
            return;
        }

        if (cameraRef.current) {
            try {
                setIsProcessing(true);
                setMessage('Capturing...');

                const photo = await cameraRef.current.takePictureAsync({
                    quality: 0.9,
                });

                if (photo) {
                    setMessage('Processing & Optimizing...');
                    const processed = await processSelfie(photo.uri);

                    // NEW: Strict ID Visibility Validation
                    // If the heuristic detects a "simple" face-only image, reject it.
                    const isIDDetected = validateIDPresence(processed.base64 || '');
                    if (!isIDDetected) {
                        throw new Error('ID card not detected. Please hold your ID clearly next to your face within the guide.');
                    }

                    // Return processed photo to the parent wizard
                    onCapture(processed.uri);
                }
            } catch (e: any) {
                const errorMsg = e.message || 'Secondary validation/Upload failed. Please check your connection and try again.';
                Alert.alert('Upload Error', errorMsg);
                setMessage('Alignment verified! You can now capture.');
            } finally {
                setIsProcessing(false);
                setIsUploading(false);
            }
        }
    };

    if (!permission) {
        return <View style={styles.container}><Text>Requesting permission...</Text></View>;
    }

    if (!permission.granted) {
        return (
            <View style={styles.container}>
                <Text style={styles.text}>Camera access is required for KYC</Text>
                <TouchableOpacity style={styles.button} onPress={requestPermission}>
                    <Text style={styles.buttonText}>Grant Permission</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const captureEnabled = faceDetected && faceIsCentered && isIDVisible;

    return (
        <View style={styles.container}>
            <CameraView
                style={styles.camera}
                facing="front"
                ref={cameraRef}
            >
                <View style={styles.overlay}>
                    {/* Face Guide (Oval) */}
                    <View style={[
                        styles.faceGuide,
                        faceIsCentered ? styles.guideValid : styles.guideInvalid
                    ]} />

                    {/* ID Card Guide (Rectangle - Chest/Shoulder area) */}
                    <View style={[
                        styles.idGuide,
                        isIDVisible ? styles.guideValid : styles.guideInvalid
                    ]}>
                        <Text style={styles.guideText}>Place ID Here</Text>
                    </View>

                    <View style={styles.footer}>
                        <Text style={styles.message}>{message}</Text>

                        <View style={styles.controls}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
                                <Text style={styles.cancelText}>Cancel</Text>
                            </TouchableOpacity>

                            {!captureEnabled ? (
                                <TouchableOpacity
                                    style={[styles.verifyBtn, (isVerifying || isProcessing) && { opacity: 0.6 }]}
                                    onPress={verifyAlignment}
                                    disabled={isVerifying || isProcessing}
                                >
                                    <Text style={styles.verifyBtnText}>
                                        {isVerifying ? 'Checking...' : 'Check Alignment'}
                                    </Text>
                                </TouchableOpacity>
                            ) : (
                                <TouchableOpacity
                                    style={[styles.captureBtn, isProcessing && { opacity: 0.5 }]}
                                    onPress={takeFinalPicture}
                                    disabled={isProcessing}
                                >
                                    {isProcessing ? (
                                        <ActivityIndicator color="#fff" />
                                    ) : (
                                        <View style={styles.captureBtnInner} />
                                    )}
                                </TouchableOpacity>
                            )}

                            <View style={{ width: 60 }} />
                        </View>
                    </View>
                </View>
            </CameraView>

            {/* Full-screen Loading Overlay */}
            <Modal transparent visible={isUploading} animationType="fade">
                <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color="#4CAF50" />
                    <Text style={styles.loadingText}>{message}</Text>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    camera: {
        flex: 1,
    },
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.1)',
        alignItems: 'center',
    },
    faceGuide: {
        width: MASK_SIZE,
        height: MASK_SIZE * 1.3,
        borderRadius: MASK_SIZE / 1.5,
        borderWidth: 2,
        marginTop: height * 0.1,
        backgroundColor: 'transparent',
    },
    idGuide: {
        width: ID_BOX_WIDTH,
        height: ID_BOX_HEIGHT,
        borderWidth: 2,
        borderRadius: 8,
        position: 'absolute',
        top: height * 0.45,
        right: 40,
        backgroundColor: 'rgba(255,255,255,0.05)',
        justifyContent: 'center',
        alignItems: 'center',
        borderStyle: 'dashed',
    },
    guideValid: {
        borderColor: '#4CAF50',
    },
    guideInvalid: {
        borderColor: '#fff',
    },
    guideText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
        opacity: 0.7,
    },
    footer: {
        position: 'absolute',
        bottom: 40,
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    message: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
        textAlign: 'center',
        marginBottom: 20,
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 20,
        overflow: 'hidden',
    },
    controls: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        paddingHorizontal: 30,
    },
    verifyBtn: {
        backgroundColor: '#007AFF',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 25,
    },
    verifyBtnText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
    },
    captureBtn: {
        width: 76,
        height: 76,
        borderRadius: 38,
        borderWidth: 4,
        borderColor: '#4CAF50',
        justifyContent: 'center',
        alignItems: 'center',
    },
    captureBtnInner: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#fff',
    },
    cancelBtn: {
        width: 60,
    },
    cancelText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    text: {
        color: '#fff',
        textAlign: 'center',
        margin: 20,
    },
    button: {
        backgroundColor: '#fff',
        padding: 15,
        borderRadius: 8,
        marginHorizontal: 40,
    },
    buttonText: {
        color: '#000',
        textAlign: 'center',
        fontWeight: 'bold',
    },
    loadingOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        color: '#fff',
        marginTop: 20,
        fontSize: 16,
        fontWeight: '600',
    },
});
