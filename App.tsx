import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Platform, } from 'react-native';  // Importa DevSettings
import AppNavigation from './app/navigation';
import LoginScreen from './screens/LoginScreen';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function App() {
  const [logueado, setLogueado] = useState(false);
  const [mensajeLogout, setMensajeLogout] = useState('');

  useEffect(() => {
    const verificarSesion = async () => {
      if (Platform.OS === 'web') {
        const usuario = localStorage.getItem('usuario');
        if (usuario) setLogueado(true);
      } else {
        const usuario = await AsyncStorage.getItem('usuario');
        if (usuario) setLogueado(true);
      }
    };
    verificarSesion();
  }, []);


  const cerrarSesion = () => {
    setLogueado(false);
    setMensajeLogout('🚪 Has cerrado sesión exitosamente');
    setTimeout(() => setMensajeLogout(''), 3000);
  };

  return (
    <View style={{ flex: 1 }}>
      {mensajeLogout !== '' && (
        <View style={styles.flash}>
          <Text style={styles.flashText}>{mensajeLogout}</Text>
        </View>
      )}

      {logueado ? (
        <AppNavigation onLogout={cerrarSesion} />
      ) : (
        <LoginScreen navigation={{ replace: () => setLogueado(true) }} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flash: {
    backgroundColor: '#d4edda',
    padding: 10,
    borderRadius: 6,
    margin: 10,
    borderColor: '#c3e6cb',
    borderWidth: 1,
  },
  flashText: {
    color: '#155724',
    textAlign: 'center',
    fontWeight: 'bold',
  },
});
