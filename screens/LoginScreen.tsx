import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import * as Crypto from 'expo-crypto';

export default function LoginScreen({ navigation }: any) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const hashPassword = async (password: string): Promise<string> => {
    const digest = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      password
    );
    return digest.toLowerCase();
  };

  const handleLogin = async () => {
    if (!username.trim() || !password) {
      Alert.alert('⚠️ Campos requeridos', 'Por favor ingresa usuario y contraseña.');
      return;
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username.trim())
      .single();

    if (error || !user) {
      Alert.alert('❌ Usuario no encontrado', 'Verifica tus datos.');
      return;
    }

    const hashedInput = await hashPassword(password);

    if (hashedInput !== user.password_hash.toLowerCase()) {
      Alert.alert('❌ Contraseña incorrecta');
      return;
    }

    const { data: profileData, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (!profileError) {
      await AsyncStorage.setItem('profile', JSON.stringify(profileData));
    } else {
      await AsyncStorage.removeItem('profile');
      console.warn('⚠️ Perfil no encontrado o error:', profileError.message);
    }

    // 👇 CORREGIDO: guardar con clave 'usuario'
    await AsyncStorage.setItem('usuario', JSON.stringify(user));

    Alert.alert('✅ Bienvenido');
    navigation.replace('UserProfile'); // ajusta si el nombre es diferente
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Iniciar Sesión</Text>
      <Text style={styles.label}>Usuario:</Text>
      <TextInput
        placeholder="Usuario"
        style={styles.input}
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <Text style={styles.label}>Contraseña:</Text>
      <TextInput
        placeholder="Contraseña"
        style={styles.input}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
      />
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
