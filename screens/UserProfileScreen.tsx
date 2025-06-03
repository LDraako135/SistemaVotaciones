import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  Alert,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Platform,
} from 'react-native';
import { supabase } from '../lib/supabase';

// Valid gender options predefined
const validGenders = ['masculino', 'femenino', 'otro'];

// Helper function to set an item in storage depending on platform (web or native)
const storageSetItem = async (key: string, value: string) => {
  if (Platform.OS === 'web') {
    localStorage.setItem(key, value);
  } else {
    const AsyncStorage = await import('@react-native-async-storage/async-storage').then(mod => mod.default);
    await AsyncStorage.setItem(key, value);
  }
};

// Helper function to get an item from storage depending on platform (web or native)
const storageGetItem = async (key: string) => {
  if (Platform.OS === 'web') {
    return localStorage.getItem(key);
  } else {
    const AsyncStorage = await import('@react-native-async-storage/async-storage').then(mod => mod.default);
    return await AsyncStorage.getItem(key);
  }
};

export default function UserProfileScreen() {
  // Profile state to hold user's profile data: first name, last name, age, and gender
  const [profile, setProfile] = useState({
    first_name: '',
    last_name: '',
    age: '',
    gender: '', // can be 'masculino', 'femenino', 'otro' or a custom value
  });
  
  // Loading state to handle loading spinner
  const [loading, setLoading] = useState(true);
  
  // State to track the gender selection dropdown/picker value
  const [genderSelection, setGenderSelection] = useState(''); // 'masculino'|'femenino'|'otro'|'personalizado'

  // Fetch profile data from Supabase and local storage on component mount
  const fetchProfile = async () => {
    try {
      setLoading(true);
      
      // Get user data stored locally (e.g., logged in user)
      const userData = await storageGetItem('usuario');
      if (!userData) throw new Error('Usuario no autenticado');
      
      const user = JSON.parse(userData);
      
      // Query user profile from Supabase by user_id
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      // Ignore error if no profile found (code 'PGRST116'), otherwise throw
      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        // Normalize gender value to lowercase for consistent handling
        let gen = data.gender || '';
        const lowGen = gen.toLowerCase();
        
        // Check if gender is one of the valid options
        if (validGenders.includes(lowGen)) {
          setGenderSelection(lowGen);
        } else if (gen.trim() !== '') {
          // If gender is non-empty but not in valid list, consider it 'personalizado'
          setGenderSelection('personalizado');
        } else {
          // Empty gender selection
          setGenderSelection('');
        }
        
        // Update profile state with retrieved data, converting age to string for TextInput
        setProfile({
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          age: data.age ? data.age.toString() : '',
          gender: gen,
        });
      } else {
        // If no profile data, reset state
        setGenderSelection('');
        setProfile({ first_name: '', last_name: '', age: '', gender: '' });
      }
    } catch (error: any) {
      // Show alert if any error occurs during fetch
      Alert.alert('Error', error.message || 'Error al cargar perfil');
    } finally {
      setLoading(false);
    }
  };

  // Update or insert profile data into Supabase
  const updateProfile = async () => {
    try {
      setLoading(true);

      // Get logged-in user data
      const userData = await storageGetItem('usuario');
      if (!userData) throw new Error('Usuario no autenticado');
      const user = JSON.parse(userData);

      // Determine gender value based on selection and input
      let genderValue = profile.gender.trim();
      if (genderSelection === 'masculino' || genderSelection === 'femenino') {
        genderValue = genderSelection;
      } else if (genderSelection === 'otro') {
        genderValue = 'otro';
      } else if (genderSelection === 'personalizado') {
        // For custom gender, ensure input is not empty
        if (genderValue === '') {
          Alert.alert('Género personalizado', 'Por favor ingresa tu género.');
          setLoading(false);
          return;
        }
      } else {
        // Invalid gender selection fallback
        Alert.alert('Género inválido', 'Selecciona un género válido.');
        setLoading(false);
        return;
      }

      // Validate age is a positive number
      const ageNumber = Number(profile.age);
      if (isNaN(ageNumber) || ageNumber <= 0) {
        Alert.alert('Edad inválida', 'Ingresa una edad válida mayor que 0.');
        setLoading(false);
        return;
      }

      // Upsert profile data in Supabase (insert or update on conflict by user_id)
      const { error } = await supabase
        .from('user_profiles')
        .upsert(
          {
            user_id: user.id,
            first_name: profile.first_name.trim(),
            last_name: profile.last_name.trim(),
            age: ageNumber,
            gender: genderValue.toLowerCase(),
          },
          { onConflict: 'user_id' }
        );

      if (error) throw error;

      Alert.alert('Perfil actualizado correctamente');
    } catch (error: any) {
      // Show alert if update fails
      Alert.alert('Error', error.message || 'Error actualizando perfil');
    } finally {
      setLoading(false);
    }
  };

  // Fetch profile when component mounts
  useEffect(() => {
    fetchProfile();
  }, []);

  // Show loading spinner while data is loading
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // Render profile form with inputs and gender picker
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.label}>Nombre:</Text>
      <TextInput
        style={styles.input}
        value={profile.first_name}
        onChangeText={(text) => setProfile({ ...profile, first_name: text })}
        autoCapitalize="words"
      />
      <Text style={styles.label}>Apellido:</Text>
      <TextInput
        style={styles.input}
        value={profile.last_name}
        onChangeText={(text) => setProfile({ ...profile, last_name: text })}
        autoCapitalize="words"
      />
      <Text style={styles.label}>Edad:</Text>
      <TextInput
        style={styles.input}
        value={profile.age}
        onChangeText={(text) => setProfile({ ...profile, age: text })}
        keyboardType="numeric"
      />
      <Text style={styles.label}>Género:</Text>
      {Platform.OS === 'web' ? (
        // Web platform uses native HTML select element
        <select
          style={styles.select}
          value={genderSelection}
          onChange={(e) => {
            const val = e.target.value;
            setGenderSelection(val);
            // Update profile gender state accordingly when gender selection changes
            if (val !== 'personalizado') {
              setProfile({ ...profile, gender: val === 'otro' ? 'otro' : val });
            } else {
              setProfile({ ...profile, gender: '' });
            }
          }}
        >
          <option value="">Selecciona</option>
          <option value="masculino">Masculino</option>
          <option value="femenino">Femenino</option>
          <option value="otro">Otro</option>
          <option value="personalizado">Personalizado</option>
        </select>
      ) : (
        // Native platforms use React Native Picker component
        <View style={styles.pickerWrapper}>
          <Picker
            selectedValue={genderSelection}
            onValueChange={(val) => {
              setGenderSelection(val);
              if (val !== 'personalizado') {
                setProfile({ ...profile, gender: val === 'otro' ? 'otro' : val });
              } else {
                setProfile({ ...profile, gender: '' });
              }
            }}
            style={styles.picker}
          >
            <Picker.Item label="Selecciona" value="" />
            <Picker.Item label="Masculino" value="masculino" />
            <Picker.Item label="Femenino" value="femenino" />
            <Picker.Item label="Otro" value="otro" />
            <Picker.Item label="Personalizado" value="personalizado" />
          </Picker>
        </View>
      )}

      {/* If "personalizado" (custom) gender is selected, show an input for custom gender */}
      {genderSelection === 'personalizado' && (
        <>
          <Text style={styles.label}>Escribe tu género:</Text>
          <TextInput
            style={styles.input}
            value={profile.gender}
            onChangeText={(text) => setProfile({ ...profile, gender: text })}
            autoCapitalize="words"
          />
        </>
      )}

      {/* Button to update the profile */}
      <Button title="Actualizar Perfil" onPress={updateProfile} />
    </ScrollView>
  );
}

import { Picker } from '@react-native-picker/picker';

// Styles for the component
const styles = StyleSheet.create({
  container: { padding: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  label: { fontWeight: 'bold', marginTop: 10 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    borderRadius: 6,
    marginBottom: 10,
    backgroundColor: Platform.OS === 'web' ? 'white' : undefined,
    color: 'black',
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    marginBottom: 10,
    color: 'black',
  },
  picker: {
    height: 50,
    width: '100%',
    color: 'black',
  },
  select: {
    width: '100%',
    padding: 8,
    fontSize: 16,
  },
});
