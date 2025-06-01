import React, { useState, useEffect } from 'react';
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { supabase } from '../lib/supabase';
import { FontAwesome } from '@expo/vector-icons';

type Usuario = {
  id: number;
  identification: string;
  username: string;
  role: 'ADMIN' | 'ADMINISTRATIVO' | 'CANDIDATO' | 'VOTANTE';
};

export default function UserManagementScreen() {
  const [identification, setIdentification] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Usuario['role']>('ADMINISTRATIVO');
  const [adminValid, setAdminValid] = useState(false);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);

  const hashPassword = async (password: string): Promise<string> => {
    return await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      password
    );
  };

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

  useEffect(() => {
    if (adminValid) {
      cargarUsuarios();
    }
  }, [adminValid]);

  const handleCreateUser = async () => {
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

    // No permitir crear usuarios ADMIN
    if (editingUserId === null && role === 'ADMIN') {
      Alert.alert('❌ No está permitido crear usuarios con rol ADMIN');
      return;
    }

    try {
      let hashed = '';
      if (password) {
        hashed = await hashPassword(password);
      }

      if (editingUserId === null) {
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
        // No permitir editar usuarios ADMIN
        const userToEdit = usuarios.find(u => u.id === editingUserId);
        if (userToEdit?.role === 'ADMIN') {
          Alert.alert('❌ No está permitido editar usuarios ADMIN');
          return;
        }

        const updateData: any = {
          identification,
          username,
          role,
        };
        if (password) {
          updateData.password_hash = hashed;
        }

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

      setIdentification('');
      setUsername('');
      setPassword('');
      setRole('ADMINISTRATIVO');
      setEditingUserId(null);
      cargarUsuarios();
    } catch (e) {
      Alert.alert('❌ Error general', 'No se pudo procesar');
      console.error(e);
    }
  };

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

  if (!adminValid)
    return (
      <Text style={styles.block}>
        ⛔ Acceso denegado. Solo ADMIN puede entrar.
      </Text>
    );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 20 }}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>👤 Gestión de Usuarios</Text>
      <Text style={styles.label}>Identificacion:</Text>
      <TextInput
        placeholder="Identificación"
        style={styles.input}
        value={identification}
        onChangeText={setIdentification}
      />
      <Text style={styles.label}>Nombre de usuario:</Text>
      <TextInput
        placeholder="Nombre de usuario"
        style={styles.input}
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
      />
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

      <Button
        title={editingUserId ? 'Guardar cambios' : 'Crear usuario'}
        onPress={handleCreateUser}
      />

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

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: '#fff', flex: 1 },
  title: { fontSize: 24, textAlign: 'center', marginBottom: 20 },
  subtitle: { fontSize: 18, marginVertical: 10, fontWeight: 'bold' },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    backgroundColor: 'white',
    color: 'black',
  },
  label: { fontWeight: 'bold', marginBottom: 5 },
  pickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  roleButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 5,
  },
  roleButtonSelected: {
    backgroundColor: '#007bff',
  },
  roleButtonUnselected: {
    backgroundColor: '#eee',
  },
  roleButtonTextSelected: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  roleButtonTextUnselected: {
    color: '#555',
    fontSize: 14,
  },
  userRow: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  buttonsRow: { flexDirection: 'row', gap: 10 },
  iconButtons: {
    flexDirection: 'row-reverse',
  },
  icon: {
    marginHorizontal: 5,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  btnText: { color: 'white', fontWeight: 'bold' },
  block: { padding: 20, textAlign: 'center', fontSize: 18, color: 'red' },
});
