import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
// Import AsyncStorage for local data storage
import AsyncStorage from '@react-native-async-storage/async-storage';
// Import Supabase client for backend interaction
import { supabase } from '../lib/supabase';
// Import Crypto module for hashing passwords
import * as Crypto from 'expo-crypto';

export default function LoginScreen({ navigation }: any) {
  // State to store username input
  const [username, setUsername] = useState('');
  // State to store password input
  const [password, setPassword] = useState('');

  // Async function to hash password using SHA256 algorithm
  const hashPassword = async (password: string): Promise<string> => {
    const digest = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      password
    );
    return digest.toLowerCase();
  };

  // Function to handle login button press
  const handleLogin = async () => {
    // Validate inputs: username and password must not be empty
    if (!username.trim() || !password) {
      Alert.alert('⚠️ Campos requeridos', 'Por favor ingresa usuario y contraseña.');
      return;
    }

    // Query the 'users' table for a user with the entered username
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username.trim())
      .single();

    // If user not found or query error, show alert and exit
    if (error || !user) {
      Alert.alert('❌ Usuario no encontrado', 'Verifica tus datos.');
      return;
    }

    // Hash the entered password for comparison
    const hashedInput = await hashPassword(password);

    // Check if the hashed input matches the stored password hash
    if (hashedInput !== user.password_hash.toLowerCase()) {
      Alert.alert('❌ Contraseña incorrecta');
      return;
    }

    // Fetch associated user profile from 'user_profiles' table
    const { data: profileData, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // Store profile data locally if fetched successfully, else remove any stored profile
    if (!profileError) {
      await AsyncStorage.setItem('profile', JSON.stringify(profileData));
    } else {
      await AsyncStorage.removeItem('profile');
      console.warn('⚠️ Perfil no encontrado o error:', profileError.message);
    }

    // Save the authenticated user data locally with key 'usuario'
    await AsyncStorage.setItem('usuario', JSON.stringify(user));

    // Notify user of successful login
    Alert.alert('✅ Bienvenido');
    // Navigate to user profile screen, replacing current screen in stack
    navigation.replace('UserProfile'); // adjust if screen name differs
  };

  return (
    <View style={styles.container}>
      {/* Screen title */}
      <Text style={styles.title}>Iniciar Sesión</Text>
      {/* Label for username input */}
      <Text style={styles.label}>Usuario:</Text>
      {/* Input for username */}
      <TextInput
        placeholder="Usuario"
        style={styles.input}
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
        autoCorrect={false}
      />
      {/* Label for password input */}
      <Text style={styles.label}>Contraseña:</Text>
      {/* Input for password, hides text */}
      <TextInput
        placeholder="Contraseña"
        style={styles.input}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
      />
      {/* Button to trigger login */}
      <Button title="Ingresar" onPress={handleLogin} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#fff' },
  label: { fontWeight: 'bold', marginBottom: 5 },
  title: { fontSize: 24, textAlign: 'center', marginBottom: 20 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    marginBottom: 15,
    backgroundColor: 'white',
  },
});
