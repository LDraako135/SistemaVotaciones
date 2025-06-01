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

const validGenders = ['masculino', 'femenino', 'otro'];

const storageSetItem = async (key: string, value: string) => {
  if (Platform.OS === 'web') {
    localStorage.setItem(key, value);
  } else {
    const AsyncStorage = await import('@react-native-async-storage/async-storage').then(mod => mod.default);
    await AsyncStorage.setItem(key, value);
  }
};

const storageGetItem = async (key: string) => {
  if (Platform.OS === 'web') {
    return localStorage.getItem(key);
  } else {
    const AsyncStorage = await import('@react-native-async-storage/async-storage').then(mod => mod.default);
    return await AsyncStorage.getItem(key);
  }
};

export default function UserProfileScreen() {
  const [profile, setProfile] = useState({
    first_name: '',
    last_name: '',
    age: '',
    gender: '', // será 'masculino' | 'femenino' | 'otro' | valor personalizado
  });
  const [loading, setLoading] = useState(true);
  const [genderSelection, setGenderSelection] = useState(''); // 'masculino'|'femenino'|'otro'|'personalizado'

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const userData = await storageGetItem('usuario');
      if (!userData) throw new Error('Usuario no autenticado');
      const user = JSON.parse(userData);
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      if (data) {
        let gen = data.gender || '';
        const lowGen = gen.toLowerCase();
        if (validGenders.includes(lowGen)) {
          setGenderSelection(lowGen);
        } else if (gen.trim() !== '') {
          setGenderSelection('personalizado');
        } else {
          setGenderSelection('');
        }
        setProfile({
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          age: data.age ? data.age.toString() : '',
          gender: gen,
        });
      } else {
        setGenderSelection('');
        setProfile({ first_name: '', last_name: '', age: '', gender: '' });
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Error al cargar perfil');
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async () => {
    try {
      setLoading(true);
      const userData = await storageGetItem('usuario');
      if (!userData) throw new Error('Usuario no autenticado');
      const user = JSON.parse(userData);

      let genderValue = profile.gender.trim();
      if (genderSelection === 'masculino' || genderSelection === 'femenino') {
        genderValue = genderSelection;
      } else if (genderSelection === 'otro') {
        genderValue = 'otro';
      } else if (genderSelection === 'personalizado') {
        if (genderValue === '') {
          Alert.alert('Género personalizado', 'Por favor ingresa tu género.');
          setLoading(false);
          return;
        }
      } else {
        Alert.alert('Género inválido', 'Selecciona un género válido.');
        setLoading(false);
        return;
      }

      const ageNumber = Number(profile.age);
      if (isNaN(ageNumber) || ageNumber <= 0) {
        Alert.alert('Edad inválida', 'Ingresa una edad válida mayor que 0.');
        setLoading(false);
        return;
      }

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
      Alert.alert('Error', error.message || 'Error actualizando perfil');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

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
        <select
          style={styles.select}
          value={genderSelection}
          onChange={(e) => {
            const val = e.target.value;
            setGenderSelection(val);
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

      <Button title="Actualizar Perfil" onPress={updateProfile} />
    </ScrollView>
  );
}

import { Picker } from '@react-native-picker/picker';

const styles = StyleSheet.create({
  container: { padding: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  label: { fontWeight: 'bold', marginTop: 10 ,},
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    borderRadius: 6,
    marginBottom: 10,
    backgroundColor: Platform.OS === 'web' ? 'white' : undefined,
    color: 'black'
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    marginBottom: 10,
    color: 'black'
  },
  picker: {
    height: 50,
    width: '100%',
    color: 'black'
  },
  select: {
    width: '100%',
    padding: 8,
    fontSize: 16,
  },
});
