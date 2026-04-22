import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import { API_URL } from '../config/api';

export default function SignupScreen({ navigation }) {
  // Form state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [userType, setUserType] = useState('patient'); // 'patient', 'nurse', 'caretaker'
  const [cnicNumber, setCnicNumber] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [loading, setLoading] = useState(false);

  // Image state
  const [images, setImages] = useState({
    cnicFront: null,
    cnicBack: null,
    licensePhoto: null,
    experienceLetter: null,
    experienceImage: null,
  });

  // Function to pick image
  const pickImage = async (field) => {
    try {
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Please grant camera roll permissions');
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
        aspect: [4, 3],
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImages({ ...images, [field]: result.assets[0].uri });
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  // Function to handle registration
  const handleRegister = async () => {
    try {
      // Validation
      if (!fullName || !email || !password || !phone) {
        Alert.alert('Error', 'Please fill all required fields');
        return;
      }

      if (userType !== 'patient') {
        if (!images.cnicFront || !images.cnicBack) {
          Alert.alert('Error', 'Please upload CNIC front and back images');
          return;
        }
        
        if (userType === 'nurse' && (!licenseNumber || !images.licensePhoto)) {
          Alert.alert('Error', 'Please provide license number and photo');
          return;
        }
      }

      setLoading(true);

      // Create FormData
      const formData = new FormData();

      // Add text fields
      formData.append('fullName', fullName);
      formData.append('email', email);
      formData.append('password', password);
      formData.append('phone', phone);
      formData.append('userType', userType);
      formData.append('cnicNumber', cnicNumber);

      // Add specialty for nurse/caretaker
      if (userType !== 'patient') {
        formData.append('specialty', specialty);
      }

      // Add license number for nurse
      if (userType === 'nurse') {
        formData.append('licenseNumber', licenseNumber);
      }

      // Add image files
      if (images.cnicFront) {
        formData.append('cnicFront', {
          uri: images.cnicFront,
          type: 'image/jpeg',
          name: 'cnicFront.jpg',
        });
      }

      if (images.cnicBack) {
        formData.append('cnicBack', {
          uri: images.cnicBack,
          type: 'image/jpeg',
          name: 'cnicBack.jpg',
        });
      }

      if (images.licensePhoto && userType === 'nurse') {
        formData.append('licensePhoto', {
          uri: images.licensePhoto,
          type: 'image/jpeg',
          name: 'licensePhoto.jpg',
        });
      }

      if (images.experienceLetter && userType === 'nurse') {
        formData.append('experienceLetter', {
          uri: images.experienceLetter,
          type: 'image/jpeg',
          name: 'experienceLetter.jpg',
        });
      }

      if (images.experienceImage && userType === 'caretaker') {
        formData.append('experienceImage', {
          uri: images.experienceImage,
          type: 'image/jpeg',
          name: 'experienceImage.jpg',
        });
      }

      // Send to backend
      console.log('Sending registration request...');
      const response = await axios.post(`${API_URL}/auth/register`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 30000, // 30 second timeout for image upload
      });

      console.log('Registration success:', response.data);

      setLoading(false);

      // Show success message
      Alert.alert(
        'Success',
        response.data.msg || 'Registration successful! Please check your email for OTP.',
        [
          {
            text: 'OK',
            onPress: () => {
              // Navigate to OTP screen
              navigation.navigate('OTP', { email });
            },
          },
        ]
      );
    } catch (error) {
      setLoading(false);
      console.error('Registration error:', error.response?.data || error.message);
      Alert.alert(
        'Registration Failed',
        error.response?.data?.message || error.message || 'An error occurred during registration'
      );
    }
  };

  return (
    <ScrollView className="flex-1 bg-white p-4">
      <Text className="text-2xl font-bold mb-4">Create Account</Text>

      {/* User Type Selection */}
      <Text className="text-sm font-medium mb-2">I am a:</Text>
      <View className="flex-row gap-2 mb-4">
        {['patient', 'nurse', 'caretaker'].map((type) => (
          <TouchableOpacity
            key={type}
            onPress={() => setUserType(type)}
            className={`flex-1 py-3 rounded-lg border-2 ${
              userType === type ? 'bg-blue-500 border-blue-500' : 'bg-white border-gray-300'
            }`}
          >
            <Text
              className={`text-center font-semibold capitalize ${
                userType === type ? 'text-white' : 'text-gray-700'
              }`}
            >
              {type}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Basic Info */}
      <TextInput
        placeholder="Full Name *"
        value={fullName}
        onChangeText={setFullName}
        className="border border-gray-300 rounded-lg px-4 py-3 mb-3"
      />
      <TextInput
        placeholder="Email *"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        className="border border-gray-300 rounded-lg px-4 py-3 mb-3"
      />
      <TextInput
        placeholder="Password *"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        className="border border-gray-300 rounded-lg px-4 py-3 mb-3"
      />
      <TextInput
        placeholder="Phone *"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        className="border border-gray-300 rounded-lg px-4 py-3 mb-3"
      />
      <TextInput
        placeholder="CNIC Number"
        value={cnicNumber}
        onChangeText={setCnicNumber}
        keyboardType="numeric"
        className="border border-gray-300 rounded-lg px-4 py-3 mb-3"
      />

      {/* Nurse/Caretaker specific fields */}
      {userType !== 'patient' && (
        <>
          <TextInput
            placeholder="Specialty (e.g., Pediatrics, Elderly Care)"
            value={specialty}
            onChangeText={setSpecialty}
            className="border border-gray-300 rounded-lg px-4 py-3 mb-3"
          />

          {userType === 'nurse' && (
            <TextInput
              placeholder="License Number *"
              value={licenseNumber}
              onChangeText={setLicenseNumber}
              className="border border-gray-300 rounded-lg px-4 py-3 mb-3"
            />
          )}

          {/* CNIC Images */}
          <Text className="text-sm font-medium mb-2">CNIC Front *</Text>
          <TouchableOpacity
            onPress={() => pickImage('cnicFront')}
            className="border-2 border-dashed border-gray-300 rounded-lg py-4 mb-3 items-center"
          >
            {images.cnicFront ? (
              <Image source={{ uri: images.cnicFront }} className="w-full h-40" resizeMode="contain" />
            ) : (
              <Text className="text-gray-500">Tap to upload CNIC Front</Text>
            )}
          </TouchableOpacity>

          <Text className="text-sm font-medium mb-2">CNIC Back *</Text>
          <TouchableOpacity
            onPress={() => pickImage('cnicBack')}
            className="border-2 border-dashed border-gray-300 rounded-lg py-4 mb-3 items-center"
          >
            {images.cnicBack ? (
              <Image source={{ uri: images.cnicBack }} className="w-full h-40" resizeMode="contain" />
            ) : (
              <Text className="text-gray-500">Tap to upload CNIC Back</Text>
            )}
          </TouchableOpacity>

          {/* Nurse specific images */}
          {userType === 'nurse' && (
            <>
              <Text className="text-sm font-medium mb-2">License Photo *</Text>
              <TouchableOpacity
                onPress={() => pickImage('licensePhoto')}
                className="border-2 border-dashed border-gray-300 rounded-lg py-4 mb-3 items-center"
              >
                {images.licensePhoto ? (
                  <Image source={{ uri: images.licensePhoto }} className="w-full h-40" resizeMode="contain" />
                ) : (
                  <Text className="text-gray-500">Tap to upload License Photo</Text>
                )}
              </TouchableOpacity>

              <Text className="text-sm font-medium mb-2">Experience Letter (Optional)</Text>
              <TouchableOpacity
                onPress={() => pickImage('experienceLetter')}
                className="border-2 border-dashed border-gray-300 rounded-lg py-4 mb-3 items-center"
              >
                {images.experienceLetter ? (
                  <Image source={{ uri: images.experienceLetter }} className="w-full h-40" resizeMode="contain" />
                ) : (
                  <Text className="text-gray-500">Tap to upload Experience Letter</Text>
                )}
              </TouchableOpacity>
            </>
          )}

          {/* Caretaker specific images */}
          {userType === 'caretaker' && (
            <>
              <Text className="text-sm font-medium mb-2">Experience Image (Optional)</Text>
              <TouchableOpacity
                onPress={() => pickImage('experienceImage')}
                className="border-2 border-dashed border-gray-300 rounded-lg py-4 mb-3 items-center"
              >
                {images.experienceImage ? (
                  <Image source={{ uri: images.experienceImage }} className="w-full h-40" resizeMode="contain" />
                ) : (
                  <Text className="text-gray-500">Tap to upload Experience Image</Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </>
      )}

      {/* Submit Button */}
      <TouchableOpacity
        onPress={handleRegister}
        disabled={loading}
        className={`py-4 rounded-lg items-center ${loading ? 'bg-gray-400' : 'bg-blue-500'}`}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className="text-white font-bold text-lg">Register</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Login')} className="mt-4">
        <Text className="text-center text-blue-500">Already have an account? Login</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
