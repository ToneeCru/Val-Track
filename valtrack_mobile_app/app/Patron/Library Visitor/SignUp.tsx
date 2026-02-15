import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Dropdown } from 'react-native-element-dropdown';
import KYCCamera from '../../../components/KYCCamera';
import * as AddressService from '../../../lib/addressService';
import { extractDataFromOCR } from '../../../lib/extractorService';
import { processOCR } from '../../../lib/ocrService';
import { createPendingRegistration, updatePendingRegistration, uploadIDToSupabase, uploadSelfie } from '../../../lib/storage';
import { supabase } from '../../../lib/supabase';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

// ... imports

export enum IDType {
  Passport = 'Passport',
  NationalID = 'National ID',
  DriversLicense = 'Drivers License',
  UMID = 'UMID',
  VotersID = 'Voters ID',
  SeniorCitizenID = 'Senior Citizen ID',
  PWDID = 'PWD ID',
  PRCID = 'PRC ID',
  StudentID = 'Student ID',
  Others = 'Others',
}

export const ID_TYPE_LABELS: Record<IDType, string> = {
  [IDType.Passport]: 'Passport',
  [IDType.NationalID]: 'National ID',
  [IDType.DriversLicense]: 'Driver’s License',
  [IDType.UMID]: 'UMID',
  [IDType.VotersID]: 'Voter’s ID',
  [IDType.SeniorCitizenID]: 'Senior Citizen ID',
  [IDType.PWDID]: 'PWD ID',
  [IDType.PRCID]: 'PRC ID',
  [IDType.StudentID]: 'Student ID',
  [IDType.Others]: 'Others',
};

interface SignUpProps {
  onCancel?: () => void;
  onComplete?: (data: any) => void;
}

export default function SignUp({ onCancel, onComplete }: SignUpProps) {
  const router = useRouter();
  const [step, setStep] = useState<number>(1);

  // Step 1
  const [idType, setIdType] = useState<string>('');
  const [idDocument, setIdDocument] = useState<string>('');
  const [registrationId, setRegistrationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [ocrScanning, setOcrScanning] = useState<boolean>(false);
  const [ocrApproved, setOcrApproved] = useState<boolean>(false); // Used to allow proceed after warning
  const [ocrRawText, setOcrRawText] = useState<string>('');
  const [autofillMessage, setAutofillMessage] = useState<string | null>(null);
  const [idTypeModalVisible, setIdTypeModalVisible] = useState(false);
  const [ocrWarningVisible, setOcrWarningVisible] = useState(false);
  const idOptions = Object.values(IDType);

  const runAutofill = (rawText: string, type: string) => {
    const extracted = extractDataFromOCR(rawText, type);
    let filledAny = false;

    if (extracted.firstname) {
      setFirstName(extracted.firstname);
      filledAny = true;
    }
    if (extracted.surname) {
      setLastName(extracted.surname);
      filledAny = true;
    }
    if (extracted.middlename) {
      setMiddleName(extracted.middlename);
      filledAny = true;
    }
    if (extracted.dateofbirth) {
      setDob(extracted.dateofbirth);
      // Try to parse the date for the picker
      try {
        const parsedDate = new Date(extracted.dateofbirth);
        if (!isNaN(parsedDate.getTime())) {
          setDobDate(parsedDate);
        }
      } catch (e) {
        // Keep default date if parsing fails
      }
      filledAny = true;
    }
    if (extracted.id_number) {
      setIdNumber(extracted.id_number);
      filledAny = true;
    }

    if (filledAny) {
      setAutofillMessage("Some fields have been autofilled. Please verify.");
      setTimeout(() => setAutofillMessage(null), 5000);
    }
  };

  const pickImage = async () => {
    if (!idType) {
      Alert.alert('Validation', 'Please select an ID type first');
      return;
    }

    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResult.granted === false) {
      Alert.alert('Permission Required', 'Permission to access camera roll is required!');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 1,
    }); // removed specific MediaTypeOptions enum usage for safety if types differ, passed string array which is widely supported or use ImagePicker.MediaTypeOptions.Images if type checking allows

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setOcrApproved(false);
      setOcrScanning(false);
      setIsLoading(true);
      try {
        let uri = result.assets[0].uri;

        // Compress image to stay under 1MB for OCR/Storage (Fix for 1025kb limit)
        // This allows 5MB+ source files to be processed
        const manipulated = await ImageManipulator.manipulateAsync(
          uri,
          [{ resize: { width: 1200 } }], // Resize to reasonable width for OCR
          { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
        );
        uri = manipulated.uri;

        // 1. Start OCR FIRST (on local uri)
        setOcrScanning(true);
        const ocrResult = await processOCR(uri, idType);
        setOcrScanning(false);

        if (ocrResult.isValid) {
          // 2. ONLY IF VALID, Upload to Storage
          const path = await uploadIDToSupabase(uri, 'pending');

          // 3. Create Registration Record
          const data = await createPendingRegistration(idType, path, ocrResult.text, 'success');

          if (data && data.length > 0) {
            setRegistrationId(data[0].id);
            setIdDocument(uri);
            setOcrRawText(ocrResult.text);
            setOcrApproved(true);

            // Trigger Autofill (Formal Step 2 integration)
            runAutofill(ocrResult.text, idType);
          } else {
            throw new Error('Failed to create registration record');
          }
        } else {
          // 4. IF INVALID, Show modal and don't insert to DB
          setIdDocument(''); // Reset state to force re-upload
          setOcrApproved(false);
          setOcrWarningVisible(true);
        }

      } catch (error: any) {
        console.error(error);
        Alert.alert('Error', error.message || 'An error occurred during upload.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Step 2
  const [firstName, setFirstName] = useState<string>('');
  const [middleName, setMiddleName] = useState<string>('');
  const [lastName, setLastName] = useState<string>('');
  const [dob, setDob] = useState<string>('');
  const [dobDate, setDobDate] = useState<Date>(new Date(2000, 0, 1)); // Default date
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [idNumber, setIdNumber] = useState<string>('');
  const [email, setEmail] = useState<string>('');

  // Step 5: Email Verification
  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const [otpSent, setOtpSent] = useState<boolean>(false);
  const [timer, setTimer] = useState<number>(0);
  const otpInputs = React.useRef<any[]>([]);


  // Step 3 Consolidated State
  const [addressData, setAddressData] = useState({
    region: '',
    regionCode: '',
    province: '',
    provinceCode: '',
    city: '',
    cityCode: '',
    barangay: '',
    barangayCode: '',
    street: '',
  });

  // Step 3 Lists
  const [regionsList, setRegionsList] = useState<AddressService.AddressOption[]>([]);
  const [provincesList, setProvincesList] = useState<AddressService.AddressOption[]>([]);
  const [citiesList, setCitiesList] = useState<AddressService.AddressOption[]>([]);
  const [barangaysList, setBarangaysList] = useState<AddressService.AddressOption[]>([]);

  const [addressIsLoading, setAddressIsLoading] = useState({
    region: false,
    province: false,
    city: false,
    barangay: false,
  });

  // Load Regions on Step 3
  React.useEffect(() => {
    if (step === 3 && regionsList.length === 0) {
      setAddressIsLoading(prev => ({ ...prev, region: true }));
      AddressService.getRegions()
        .then(setRegionsList)
        .catch(err => Alert.alert('Error', 'Failed to load regions'))
        .finally(() => setAddressIsLoading(prev => ({ ...prev, region: false })));
    }
  }, [step]);

  const handleRegionChange = async (item: AddressService.AddressOption) => {
    setAddressData({
      ...addressData,
      region: item.label,
      regionCode: item.value,
      province: '',
      provinceCode: '',
      city: '',
      cityCode: '',
      barangay: '',
      barangayCode: '',
    });

    setAddressIsLoading(prev => ({ ...prev, province: true, city: true }));
    try {
      const provinces = await AddressService.getProvincesByRegion(item.value);
      setProvincesList(provinces);

      if (provinces.length === 0) {
        // NCR Case: Fetch cities directly
        const cities = await AddressService.getCitiesByRegion(item.value);
        setCitiesList(cities);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load provinces/cities');
    } finally {
      setAddressIsLoading(prev => ({ ...prev, province: false, city: false }));
    }
  };

  const handleProvinceChange = async (item: AddressService.AddressOption) => {
    setAddressData({
      ...addressData,
      province: item.label,
      provinceCode: item.value,
      city: '',
      cityCode: '',
      barangay: '',
      barangayCode: '',
    });

    setAddressIsLoading(prev => ({ ...prev, city: true }));
    try {
      const cities = await AddressService.getCitiesByProvince(item.value);
      setCitiesList(cities);
    } catch (error) {
      Alert.alert('Error', 'Failed to load cities');
    } finally {
      setAddressIsLoading(prev => ({ ...prev, city: false }));
    }
  };

  const handleCityChange = async (item: AddressService.AddressOption) => {
    setAddressData({
      ...addressData,
      city: item.label,
      cityCode: item.value,
      barangay: '',
      barangayCode: '',
    });

    setAddressIsLoading(prev => ({ ...prev, barangay: true }));
    try {
      const barangays = await AddressService.getBarangaysByCity(item.value);
      setBarangaysList(barangays);
    } catch (error) {
      Alert.alert('Error', 'Failed to load barangays');
    } finally {
      setAddressIsLoading(prev => ({ ...prev, barangay: false }));
    }
  };

  const handleBarangayChange = (item: AddressService.AddressOption) => {
    setAddressData({
      ...addressData,
      barangay: item.label,
      barangayCode: item.value,
    });
  };

  // Step 4
  const [selfieTaken, setSelfieTaken] = useState<boolean>(false);
  const [selfieUri, setSelfieUri] = useState<string | null>(null);
  const [finalSelfiePath, setFinalSelfiePath] = useState<string>('');
  const [showCamera, setShowCamera] = useState<boolean>(false);

  const next = () => {
    if (step === 1) {
      if (!idType) {
        Alert.alert('Validation', 'Please select an ID type');
        return;
      }
      if (!idDocument) {
        Alert.alert('Validation', 'Please upload your ID document before proceeding');
        return;
      }
      if (ocrScanning) {
        Alert.alert('Validation', 'OCR scanning is in progress. Please wait.');
        return;
      }
      if (!ocrApproved) {
        Alert.alert('Validation', 'ID verification failed. You must upload a valid ID document to proceed.');
        return;
      }
    }
    if (step === 2) {
      if (!firstName || !lastName) {
        Alert.alert('Validation', 'Please enter your name');
        return;
      }

      // Persist Step 2 data to Database
      if (registrationId) {
        setIsLoading(true);
        updatePendingRegistration(registrationId, {
          firstname: firstName,
          surname: lastName,
          middlename: middleName,
          dateofbirth: dob,
          id_number: idNumber,
        }).then(() => {
          setIsLoading(false);
          setStep((s) => s + 1);
        }).catch(err => {
          setIsLoading(false);
          console.error("Failed to save step 2 data", err);
          Alert.alert("Error", "Failed to save your information. Please check your connection.");
        });
        return; // Return because we handle setStep in .then()
      }
    }

    if (step === 3) {
      if (!addressData.region || !addressData.city || !addressData.barangay || !addressData.street) {
        Alert.alert('Validation', 'Please complete all address fields including Street.');
        return;
      }

      // Persist Step 3 data to Database then proceed
      if (registrationId) {
        setIsLoading(true);
        const parts = [
          addressData.street,
          addressData.barangay,
          addressData.city,
          addressData.province,
          addressData.region
        ].filter(Boolean);
        const fullAddress = parts.join(', ');

        updatePendingRegistration(registrationId, {
          address: fullAddress,
          city: addressData.city,
        }).then(() => {
          setIsLoading(false);
          setStep((s) => s + 1);
        }).catch(err => {
          setIsLoading(false);
          console.error("Failed to save address data", err);
          Alert.alert("Error", "Failed to save your address. Please check your connection.");
        });
        return;
      }
    }
    if (step === 4) {
      if (!selfieUri) {
        Alert.alert('Validation', 'Please take a selfie before proceeding');
        return;
      }

      if (registrationId) {
        setIsLoading(true);
        uploadSelfie(selfieUri)
          .then(path => {
            setFinalSelfiePath(path);
            return updatePendingRegistration(registrationId, {
              selfie_with_id_path: path,
            });
          })
          .then(() => {
            setIsLoading(false);
            setStep((s) => s + 1);
          })
          .catch(err => {
            setIsLoading(false);
            console.error("Failed to save selfie data", err);
            Alert.alert("Error", "Failed to save your selfie. Please check your connection.");
          });
        return;
      }
    }

    if (step < 5) setStep((s) => s + 1);
  };

  const back = () => {
    if (step > 1) setStep((s) => s - 1);
    else if (onCancel) onCancel();
  };

  const saveAndContinue = () => {
    next();
  };

  const handleResend = async () => {
    if (timer > 0) return;
    try {
      const { error } = await supabase.auth.signInWithOtp({ email });
      if (error) throw error;
      setTimer(60);
      Alert.alert('Success', 'Verification code resent!');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to resend code');
    }
  };

  const handleVerify = async () => {
    const fullOtp = otp.join('');
    if (fullOtp.length < 6) {
      Alert.alert('Validation', 'Please enter all 6 digits');
      return;
    }

    setIsLoading(true);
    try {
      const { error: authError } = await supabase.auth.verifyOtp({
        email,
        token: fullOtp,
        type: 'email',
      });

      if (authError) throw authError;

      if (registrationId) {
        await updatePendingRegistration(registrationId, {
          email: email,
          email_verified: true,
        });
      }

      // Sign out the user to prevent auto-login
      await supabase.auth.signOut();

      if (onComplete) onComplete({ email, registrationId });
      Alert.alert('Success', 'Registration Complete!', [
        {
          text: 'OK',
          onPress: () => {
            if (onCancel) onCancel(); // Close the signup modal/screen
            router.replace('/'); // Go back to login screen
          }
        }
      ], { cancelable: false });
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Verification failed');
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    let interval: any;
    if (timer > 0) {
      interval = setInterval(() => setTimer((t) => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const submit = async () => {
    if (!email) {
      Alert.alert('Error', 'Email is required.');
      return;
    }

    setIsLoading(true);
    try {
      // Trigger OTP
      const { error } = await supabase.auth.signInWithOtp({ email });
      if (error) throw error;

      // Persist email to database
      if (registrationId) {
        await updatePendingRegistration(registrationId, { email });
      }

      setOtpSent(true);
      setTimer(60);
      Alert.alert('Code Sent', 'Please check your email for the verification code.');
    } catch (error: any) {
      console.error('Error starting verification:', error);
      Alert.alert('Error', error.message || 'Failed to send verification code.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Background Image */}
      <Image
        source={require('../../assets/images/login-bg.png')}
        style={styles.backgroundImage}
        resizeMode="cover"
      />
      <View style={styles.overlay} />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          {/* Header Section */}
          <View style={styles.headerSection}>
            {/* Back Button */}
            <TouchableOpacity onPress={back} style={styles.headerBackButton}>
              <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
            </TouchableOpacity>

            {/* Logo */}
            <View style={styles.logoOuterGlow}>
              <View style={styles.logoContainer}>
                <Image
                  source={require('../../assets/images/loginPageLogo.png')}
                  style={styles.logo}
                  resizeMode="contain"
                />
              </View>
            </View>

            {/* Title */}
            <Text style={styles.headerTitle}>Sign Up (Step {step} of 5)</Text>
          </View>

          {/* White Card Section */}
          <View style={styles.whiteCardContainer}>
            <ScrollView
              contentContainerStyle={[styles.scrollContent, { paddingBottom: 60 }]}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {step === 1 && (
                <View style={styles.stepContent}>
                  <Text style={styles.sectionTitle}>Identity Verification</Text>
                  <Text style={styles.sectionHelp}>To get started, please select your ID type and upload your document</Text>

                  {ocrScanning && (
                    <View style={styles.ocrStatus}>
                      <ActivityIndicator size="small" color="#00104A" />
                      <Text style={styles.ocrText}> Scanning ID... Please wait.</Text>
                    </View>
                  )}

                  <Text style={styles.fieldLabel}>Select ID Type</Text>
                  <TouchableOpacity
                    style={styles.picker}
                    onPress={() => setIdTypeModalVisible(true)}
                  >
                    <Text style={styles.pickerText}>
                      {idType ? ID_TYPE_LABELS[idType as IDType] : 'Choose your identification document'}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color="#666" />
                  </TouchableOpacity>

                  {autofillMessage && (
                    <View style={styles.autofillBanner}>
                      <Text style={styles.autofillText}>{autofillMessage}</Text>
                    </View>
                  )}

                  {/* ID Type Modal */}
                  <Modal
                    transparent={true}
                    visible={idTypeModalVisible}
                    onRequestClose={() => setIdTypeModalVisible(false)}
                  >
                    <TouchableOpacity
                      style={styles.modalOverlay}
                      activeOpacity={1}
                      onPressOut={() => setIdTypeModalVisible(false)}
                    >
                      <View style={styles.modalContent}>
                        <ScrollView>
                          {idOptions.map((option) => (
                            <TouchableOpacity
                              key={option}
                              style={styles.modalOption}
                              onPress={() => {
                                setIdType(option);
                                setIdTypeModalVisible(false);
                                // Reset upload/OCR state when changing ID type
                                setIdDocument('');
                                setRegistrationId(null);
                                setOcrApproved(false);
                              }}
                            >
                              <Text style={styles.modalOptionText}>{ID_TYPE_LABELS[option]}</Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>
                    </TouchableOpacity>
                  </Modal>

                  {/* OCR Warning Modal */}
                  <Modal
                    transparent={true}
                    visible={ocrWarningVisible}
                    onRequestClose={() => setOcrWarningVisible(false)}
                  >
                    <View style={styles.modalOverlay}>
                      <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>❌ Verification Failed</Text>
                        <Text style={styles.modalText}>
                          The uploaded image does not match a {idType ? ID_TYPE_LABELS[idType as IDType] : 'valid ID'}. Please retake the photo and ensure it is clear.
                        </Text>
                        <View style={styles.modalButtons}>
                          <TouchableOpacity style={[styles.primaryButton, { width: '100%', marginTop: 0 }]} onPress={() => {
                            setOcrWarningVisible(false);
                            pickImage(); // Retake
                          }}>
                            <Text style={styles.primaryButtonText}>Retake Photo</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  </Modal>

                  <Text style={styles.fieldLabel}>Upload ID Document</Text>
                  <TouchableOpacity
                    style={styles.uploadBox}
                    onPress={pickImage}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <ActivityIndicator size="large" color="#00104A" />
                    ) : idDocument ? (
                      <Image source={{ uri: idDocument }} style={{ width: '100%', height: '100%', borderRadius: 8 }} resizeMode="contain" />
                    ) : (
                      <View style={{ alignItems: 'center' }}>
                        <Ionicons name="cloud-upload-outline" size={40} color="#ccc" style={{ marginBottom: 8 }} />
                        <Text style={styles.uploadText}>Drag & Drop or Click to Upload</Text>
                      </View>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.primaryButton} onPress={next}>
                    <Text style={styles.primaryButtonText}>Next</Text>
                  </TouchableOpacity>
                </View>
              )}

              {step === 2 && (
                <View style={styles.stepContent}>
                  <Text style={styles.sectionTitle}>Personal Information</Text>

                  <Text style={styles.fieldLabel}>First Name</Text>
                  <TextInput style={styles.input} value={firstName} onChangeText={setFirstName} placeholder="First Name" />

                  <Text style={styles.fieldLabel}>Middle Name</Text>
                  <TextInput style={styles.input} value={middleName} onChangeText={setMiddleName} placeholder="Middle Name" />

                  <Text style={styles.fieldLabel}>Last Name</Text>
                  <TextInput style={styles.input} value={lastName} onChangeText={setLastName} placeholder="Last Name" />

                  <Text style={styles.fieldLabel}>Date of Birth</Text>
                  <TouchableOpacity
                    style={styles.datePickerButton}
                    onPress={() => setShowDatePicker(true)}
                  >
                    <Text style={dob ? styles.datePickerText : styles.datePickerPlaceholder}>
                      {dob || 'Select Date of Birth'}
                    </Text>
                    <Ionicons name="calendar-outline" size={20} color="#666" />
                  </TouchableOpacity>

                  {showDatePicker && (
                    <DateTimePicker
                      value={dobDate}
                      mode="date"
                      display="spinner"
                      maximumDate={new Date()}
                      onChange={(event, selectedDate) => {
                        setShowDatePicker(Platform.OS === 'ios');
                        if (selectedDate) {
                          setDobDate(selectedDate);
                          // Format as MM/DD/YYYY
                          const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
                          const day = String(selectedDate.getDate()).padStart(2, '0');
                          const year = selectedDate.getFullYear();
                          setDob(`${month}/${day}/${year}`);
                        }
                      }}
                    />
                  )}

                  <Text style={styles.fieldLabel}>ID Number</Text>
                  <TextInput style={styles.input} value={idNumber} onChangeText={setIdNumber} placeholder="ID Number" />

                  <TouchableOpacity style={styles.primaryButton} onPress={next}>
                    <Text style={styles.primaryButtonText}>Next</Text>
                  </TouchableOpacity>
                </View>
              )}

              {step === 3 && (
                <View style={styles.stepContent}>
                  <Text style={styles.sectionTitle}>Address Details</Text>

                  <Text style={styles.fieldLabel}>Region</Text>
                  <Dropdown
                    style={styles.dropdown}
                    placeholderStyle={styles.dropdownPlaceholder}
                    selectedTextStyle={styles.dropdownSelectedText}
                    data={regionsList}
                    maxHeight={300}
                    labelField="label"
                    valueField="value"
                    placeholder={addressIsLoading.region ? "Loading regions..." : "Select Region"}
                    value={addressData.regionCode}
                    onChange={handleRegionChange}
                  />

                  {(provincesList.length > 0) && (
                    <>
                      <Text style={styles.fieldLabel}>Province</Text>
                      <Dropdown
                        style={styles.dropdown}
                        placeholderStyle={styles.dropdownPlaceholder}
                        selectedTextStyle={styles.dropdownSelectedText}
                        data={provincesList}
                        maxHeight={300}
                        labelField="label"
                        valueField="value"
                        placeholder={addressIsLoading.province ? "Loading provinces..." : "Select Province"}
                        value={addressData.provinceCode}
                        onChange={handleProvinceChange}
                      />
                    </>
                  )}

                  <Text style={styles.fieldLabel}>City / Municipality</Text>
                  <Dropdown
                    style={styles.dropdown}
                    placeholderStyle={styles.dropdownPlaceholder}
                    selectedTextStyle={styles.dropdownSelectedText}
                    data={citiesList}
                    maxHeight={300}
                    labelField="label"
                    valueField="value"
                    placeholder={addressIsLoading.city ? "Loading cities..." : "Select City/Municipality"}
                    value={addressData.cityCode}
                    onChange={handleCityChange}
                  />

                  <Text style={styles.fieldLabel}>Barangay</Text>
                  <Dropdown
                    style={styles.dropdown}
                    placeholderStyle={styles.dropdownPlaceholder}
                    selectedTextStyle={styles.dropdownSelectedText}
                    data={barangaysList}
                    maxHeight={300}
                    labelField="label"
                    valueField="value"
                    placeholder={addressIsLoading.barangay ? "Loading barangays..." : "Select Barangay"}
                    value={addressData.barangayCode}
                    onChange={handleBarangayChange}
                  />

                  <Text style={styles.fieldLabel}>Street / House Number / Building</Text>
                  <TextInput
                    style={styles.input}
                    value={addressData.street}
                    onChangeText={(txt) => setAddressData({ ...addressData, street: txt })}
                    placeholder="123 Main St, Building Name"
                  />

                  <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={next}
                    disabled={isLoading}
                  >
                    <Text style={styles.primaryButtonText}>{isLoading ? 'Saving...' : 'Next'}</Text>
                  </TouchableOpacity>
                </View>
              )}

              {step === 4 && (
                <View style={styles.stepContent}>
                  <Text style={styles.sectionTitle}>Capture Selfie</Text>
                  <Text style={styles.sectionHelp}>Please take a clear selfie of yourself for identity verification.</Text>

                  <View style={styles.selfieFrame}>
                    {selfieUri ? (
                      <Image source={{ uri: selfieUri }} style={{ width: '100%', height: '100%', borderRadius: 12 }} resizeMode="cover" />
                    ) : (
                      <Text style={styles.selfiePlaceholder}>Position your face in the guide when camera opens</Text>
                    )}
                  </View>

                  <TouchableOpacity
                    style={[styles.primaryButton, { backgroundColor: selfieUri ? '#10B981' : '#00104A' }]}
                    onPress={() => setShowCamera(true)}
                    disabled={isLoading}
                  >
                    <Text style={styles.primaryButtonText}>{selfieUri ? 'Retake Selfie' : 'Take Selfie'}</Text>
                  </TouchableOpacity>

                  {selfieUri && (
                    <TouchableOpacity
                      style={[styles.primaryButton, { marginTop: 15 }]}
                      onPress={next}
                      disabled={isLoading}
                    >
                      <Text style={styles.primaryButtonText}>Next</Text>
                    </TouchableOpacity>
                  )}

                  <Modal visible={showCamera} animationType="slide">
                    <KYCCamera
                      registrationId={registrationId || ''}
                      onCapture={(uri) => {
                        setSelfieUri(uri);
                        setSelfieTaken(true);
                        setShowCamera(false);
                      }}
                      onCancel={() => setShowCamera(false)}
                    />
                  </Modal>
                </View>
              )}

              {step === 5 && (
                <View style={styles.stepContent}>
                  <Text style={styles.sectionTitle}>Email Verification</Text>

                  {!otpSent ? (
                    <>
                      <Text style={styles.sectionHelp}>Enter your email address to receive a verification code.</Text>
                      <Text style={styles.fieldLabel}>Email Address</Text>
                      <TextInput
                        style={styles.input}
                        value={email}
                        onChangeText={setEmail}
                        placeholder="example@mail.com"
                        keyboardType="email-address"
                        autoCapitalize="none"
                      />
                      <TouchableOpacity
                        style={[styles.primaryButton, isLoading && { opacity: 0.7 }]}
                        onPress={submit}
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <ActivityIndicator color="#fff" />
                        ) : (
                          <Text style={styles.primaryButtonText}>Send Verification Code</Text>
                        )}
                      </TouchableOpacity>
                    </>
                  ) : (
                    <>
                      <Text style={styles.sectionHelp}>We've sent a 6-digit code to {email}.</Text>

                      <View style={otpStyles.otpContainer}>
                        {otp.map((digit, index) => (
                          <TextInput
                            key={index}
                            ref={(el) => { otpInputs.current[index] = el; }}
                            style={otpStyles.otpInput}
                            value={digit}
                            onChangeText={(text) => {
                              const newOtp = [...otp];
                              newOtp[index] = text.slice(-1);
                              setOtp(newOtp);
                              if (text && index < 5) otpInputs.current[index + 1].focus();
                            }}
                            onKeyPress={({ nativeEvent }) => {
                              if (nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
                                otpInputs.current[index - 1].focus();
                              }
                            }}
                            keyboardType="number-pad"
                            maxLength={1}
                          />
                        ))}
                      </View>

                      <TouchableOpacity
                        style={[styles.primaryButton, isLoading && { opacity: 0.7 }]}
                        onPress={handleVerify}
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <ActivityIndicator color="#fff" />
                        ) : (
                          <Text style={styles.primaryButtonText}>Verify Email</Text>
                        )}
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={handleResend}
                        disabled={timer > 0}
                        style={{ marginTop: 20, alignItems: 'center' }}
                      >
                        <Text style={{ color: timer > 0 ? '#999' : '#00104A', fontWeight: 'bold' }}>
                          {timer > 0 ? `Resend Code in ${timer}s` : 'Resend Code'}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => setOtpSent(false)}
                        style={{ marginTop: 10, alignItems: 'center' }}
                      >
                        <Text style={{ color: '#666' }}>Change Email</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              )}
            </ScrollView>
          </View>
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
    backgroundColor: 'rgba(0, 16, 74, 0.75)',
  },
  safeArea: {
    flex: 1,
  },

  // Header Section
  headerSection: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 30,
    position: 'relative',
    zIndex: 10,
  },
  headerBackButton: {
    position: 'absolute',
    left: 20,
    top: 10,
    padding: 8,
    zIndex: 20,
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
    shadowOpacity: 0.9,
    shadowRadius: 25,
    elevation: 20,
    marginBottom: 15,
  },
  logoContainer: {
    width: 100,
    height: 100,
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
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1,
    textAlign: 'center',
  },

  // White Card Section
  whiteCardContainer: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: 30,
    paddingHorizontal: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 5,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  stepContent: {
    width: '100%',
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#00104A',
    marginBottom: 8,
    textAlign: 'center',
  },
  sectionHelp: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },

  // Fields & Inputs
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#333',
  },
  picker: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  pickerText: {
    fontSize: 15,
    color: '#333',
  },
  datePickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  datePickerText: {
    fontSize: 15,
    color: '#333',
  },
  datePickerPlaceholder: {
    fontSize: 15,
    color: '#999',
  },
  dropdown: {
    height: 50,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  dropdownPlaceholder: {
    fontSize: 15,
    color: '#999',
  },
  dropdownSelectedText: {
    fontSize: 15,
    color: '#333',
  },

  // Upload Box
  uploadBox: {
    height: 220,
    backgroundColor: '#F1F5F9',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  uploadText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },

  // selfie
  selfieFrame: {
    height: 300,
    backgroundColor: '#F1F5F9',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  selfiePlaceholder: {
    color: '#999',
    textAlign: 'center',
  },

  // Buttons
  primaryButton: {
    backgroundColor: '#00104A',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#00104A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

  // OCR & Banners
  ocrStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E0F2FE',
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
  },
  ocrText: {
    marginLeft: 10,
    color: '#0369A1',
    fontWeight: '600',
    fontSize: 14,
  },
  autofillBanner: {
    backgroundColor: '#DCFCE7',
    padding: 12,
    borderRadius: 12,
    marginTop: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#16A34A',
  },
  autofillText: {
    color: '#15803D',
    fontSize: 14,
    fontWeight: '600',
  },

  // Modals
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: '85%',
    maxHeight: '70%',
    elevation: 5,
  },
  modalOption: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalOptionText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
    color: '#DC2626',
  },
  modalText: {
    fontSize: 15,
    marginBottom: 24,
    textAlign: 'center',
    color: '#4B5563',
    lineHeight: 22,
  },
  modalButtons: {
    width: '100%',
  },
});

const otpStyles = StyleSheet.create({
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginVertical: 24,
  },
  otpInput: {
    width: width * 0.12,
    height: width * 0.12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: 'bold',
    backgroundColor: '#F8FAFC',
    color: '#0F172A',
  }
});
