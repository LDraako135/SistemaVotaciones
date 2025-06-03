import React, { useState, useEffect } from 'react';
// Import React Native components
import {
  View,
  Text,
  TextInput,
  Button,
  Alert,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  ScrollView,
} from 'react-native';
// AsyncStorage to persist data locally
import AsyncStorage from '@react-native-async-storage/async-storage';
// Crypto for hashing passwords securely
import * as Crypto from 'expo-crypto';
// Supabase client for backend communication
import { supabase } from '../lib/supabase';
// Icon set from Expo
import { FontAwesome } from '@expo/vector-icons';

// Define user type with expected fields
type Usuario = {
  id: number;
  identification: string;
  username: string;
  role: 'ADMIN' | 'ADMINISTRATIVO' | 'CANDIDATO' | 'VOTANTE';
};

// Main component to manage users
export default function UserManagementScreen() {
  // State variables for form inputs
  const [identification, setIdentification] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  // Role state with default role ADMINISTRATIVO
  const [role, setRole] = useState<Usuario['role']>('ADMINISTRATIVO');
  // Flag to verify if current user is ADMIN
  const [adminValid, setAdminValid] = useState(false);
  // List of users fetched from database
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  // Id of user currently being edited (null if creating)
  const [editingUserId, setEditingUserId] = useState<number | null>(null);

  // Hash password using SHA256 algorithm asynchronously
  const hashPassword = async (password: string): Promise<string> => {
    return await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      password
    );
  };

  // On mount, verify if stored user role is ADMIN to grant access
  useEffect(() => {
    const verificarRol = async () => {
      const usuario = await AsyncStorage.getItem('usuario');
      if (usuario) {
        const parsed = JSON.parse(usuario);
        setAdminValid(parsed.role === 'ADMIN');
      }
    };
    verificarRol();
  }, []);

  // Load users from Supabase database
  const cargarUsuarios = async () => {
    const { data, error } = await supabase
      .from('users')
      .select('id, identification, username, role');
    if (!error && data) {
      setUsuarios(data as Usuario[]);
    } else {
      Alert.alert('Error al cargar usuarios', error?.message || '');
    }
  };

  // When admin is validated, fetch user list
  useEffect(() => {
    if (adminValid) {
      cargarUsuarios();
    }
  }, [adminValid]);

  // Handle user creation or edition logic
  const handleCreateUser = async () => {
    // Validate required fields; password required only for new users
    if (
      !identification ||
      !username ||
      (!password && editingUserId === null) ||
      !role
    ) {
      Alert.alert(
        '⚠️ Todos los campos son obligatorios (Contraseña solo para nuevo usuario)'
      );
      return;
    }

    // Prevent creation of users with ADMIN role
    if (editingUserId === null && role === 'ADMIN') {
      Alert.alert('❌ No está permitido crear usuarios con rol ADMIN');
      return;
    }

    try {
      // Hash password if provided
      let hashed = '';
      if (password) {
        hashed = await hashPassword(password);
      }

      if (editingUserId === null) {
        // Insert new user in database
        const { error } = await supabase.from('users').insert([
          {
            identification,
            username,
            password_hash: hashed,
            role,
          },
        ]);
        if (error) {
          Alert.alert('❌ Error creando usuario', error.message);
          return;
        }
        Alert.alert('✅ Usuario creado exitosamente');
      } else {
        // Prevent editing ADMIN users
        const userToEdit = usuarios.find(u => u.id === editingUserId);
        if (userToEdit?.role === 'ADMIN') {
          Alert.alert('❌ No está permitido editar usuarios ADMIN');
          return;
        }

        // Prepare update data
        const updateData: any = {
          identification,
          username,
          role,
        };
        if (password) {
          updateData.password_hash = hashed;
        }

        // Update user in database
        const { error } = await supabase
          .from('users')
          .update(updateData)
          .eq('id', editingUserId);

        if (error) {
          Alert.alert('❌ Error editando usuario', error.message);
          return;
        }
        Alert.alert('✅ Usuario editado exitosamente');
      }

      // Reset form after operation
      setIdentification('');
      setUsername('');
      setPassword('');
      setRole('ADMINISTRATIVO');
      setEditingUserId(null);
      // Refresh user list
      cargarUsuarios();
    } catch (e) {
      Alert.alert('❌ Error general', 'No se pudo procesar');
      console.error(e);
    }
  };

  // Populate form with user data for editing
  const handleEditUser = (user: Usuario) => {
    if (user.role === 'ADMIN') {
      Alert.alert('❌ No está permitido editar usuarios ADMIN');
      return;
    }
    setEditingUserId(user.id);
    setIdentification(user.identification);
    setUsername(user.username);
    setPassword('');
    setRole(user.role);
  };

  // Handle user deletion with confirmation
  const handleDeleteUser = async (userId: number) => {
    const userToDelete = usuarios.find(u => u.id === userId);
    if (userToDelete?.role === 'ADMIN') {
      Alert.alert('❌ No está permitido eliminar usuarios ADMIN');
      return;
    }

    Alert.alert('Confirmar', '¿Eliminar este usuario?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          // Delete user from database
          const { error } = await supabase.from('users').delete().eq('id', userId);
          if (error) {
            Alert.alert('Error al eliminar', error.message);
          } else {
            Alert.alert('Usuario eliminado');
            cargarUsuarios();
          }
        },
      },
    ]);
  };

  // Render access denied message if not ADMIN
  if (!adminValid)
    return (
      <Text style={styles.block}>
        ⛔ Acceso denegado. Solo ADMIN puede entrar.
      </Text>
    );

  // Main render of user management UI
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 20 }}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>👤 Gestión de Usuarios</Text>

      {/* Identification input */}
      <Text style={styles.label}>Identificacion:</Text>
      <TextInput
        placeholder="Identificación"
        style={styles.input}
        value={identification}
        onChangeText={setIdentification}
      />

      {/* Username input */}
      <Text style={styles.label}>Nombre de usuario:</Text>
      <TextInput
        placeholder="Nombre de usuario"
        style={styles.input}
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
      />

      {/* Password input with conditional label */}
      <Text style={styles.label}>
        {editingUserId ? 'Nueva contraseña (opcional)' : 'Contraseña'}
      </Text>
      <TextInput
        placeholder={editingUserId ? 'Nueva contraseña (opcional)' : 'Contraseña'}
        style={styles.input}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      {/* Role selection buttons */}
      <Text style={styles.label}>Rol del usuario:</Text>
      <View style={styles.pickerRow}>
        {['ADMINISTRATIVO', 'CANDIDATO', 'VOTANTE'].map(r => (
          <Pressable
            key={r}
            style={[
              styles.roleButton,
              role === r ? styles.roleButtonSelected : styles.roleButtonUnselected,
            ]}
            onPress={() => setRole(r as Usuario['role'])}
          >
            <Text
              style={
                role === r
                  ? styles.roleButtonTextSelected
                  : styles.roleButtonTextUnselected
              }
            >
              {r}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Button to create or save user */}
      <Button
        title={editingUserId ? 'Guardar cambios' : 'Crear usuario'}
        onPress={handleCreateUser}
      />

      {/* Button to cancel edit mode */}
      {editingUserId !== null && (
        <Button
          title="Cancelar edición"
          color="gray"
          onPress={() => {
            setEditingUserId(null);
            setIdentification('');
            setUsername('');
            setPassword('');
            setRole('ADMINISTRATIVO');
          }}
        />
      )}

      {/* List of registered users */}
      <Text style={styles.subtitle}>📋 Usuarios registrados:</Text>
      <FlatList
        data={usuarios}
        keyExtractor={item => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.userRow}>
            <View>
              <Text>🆔 {item.identification}</Text>
              <Text>👤 {item.username}</Text>
              <Text>
                🎓 {item.role}
                {item.role === 'ADMIN' && ' 🔒'}
              </Text>
            </View>
            {/* Edit and delete buttons */}
            <View style={styles.buttonsRow}>
              <TouchableOpacity
                onPress={() => handleEditUser(item)}
                style={[item.role === 'ADMIN' && styles.btnDisabled]}
                disabled={item.role === 'ADMIN'}
              >
                <FontAwesome name="edit" size={24} color="blue" style={styles.icon} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleDeleteUser(item.id)}
                style={[item.role === 'ADMIN' && styles.btnDisabled]}
                disabled={item.role === 'ADMIN'}
              >
                <FontAwesome name="trash" size={24} color="red" style={styles.icon} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </ScrollView>
  );
}

// Styles for components and layout
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  block: {
    margin: 20,
    fontSize: 18,
    fontWeight: 'bold',
    color: 'red',
    textAlign: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  label: {
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#999',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 4,
  },
  pickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 10,
  },
  roleButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  roleButtonSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  roleButtonUnselected: {
    backgroundColor: 'white',
    borderColor: '#999',
  },
  roleButtonTextSelected: {
    color: 'white',
    fontWeight: '700',
  },
  roleButtonTextUnselected: {
    color: '#555',
    fontWeight: '500',
  },
  subtitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 25,
    marginBottom: 10,
  },
  userRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderColor: '#ddd',
    paddingVertical: 10,
    paddingHorizontal: 5,
  },
  buttonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginHorizontal: 6,
  },
  btnDisabled: {
    opacity: 0.3,
  },
});
