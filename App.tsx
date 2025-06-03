import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Platform, } from 'react-native';  // Import DevSettings
import AppNavigation from './app/navigation';
import LoginScreen from './screens/LoginScreen';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function App() {
  // State to track if user is logged in
  const [logueado, setLogueado] = useState(false);
  // State to show a logout success message temporarily
  const [mensajeLogout, setMensajeLogout] = useState('');

  useEffect(() => {
    // Function to verify if user session exists on app load
    const verificarSesion = async () => {
      if (Platform.OS === 'web') {
        // On web, get 'usuario' from localStorage
        const usuario = localStorage.getItem('usuario');
        if (usuario) setLogueado(true);
      } else {
        // On native platforms, get 'usuario' from AsyncStorage
        const usuario = await AsyncStorage.getItem('usuario');
        if (usuario) setLogueado(true);
      }
    };
    // Run session verification once when component mounts
    verificarSesion();
  }, []);

  // Function to handle user logout
  const cerrarSesion = () => {
    setLogueado(false); // Update state to logged out
    setMensajeLogout('🚪 Has cerrado sesión exitosamente'); // Show logout message
    // Clear logout message after 3 seconds
    setTimeout(() => setMensajeLogout(''), 3000);
  };

  return (
    <View style={{ flex: 1 }}>
      {/* Show flash message when logout occurs */}
      {mensajeLogout !== '' && (
        <View style={styles.flash}>
          <Text style={styles.flashText}>{mensajeLogout}</Text>
        </View>
      )}

      {/* Conditional rendering based on logged-in status */}
      {logueado ? (
        // If logged in, show app navigation and pass logout function as prop
        <AppNavigation onLogout={cerrarSesion} />
      ) : (
        // If not logged in, show login screen and simulate navigation on login success
        <LoginScreen navigation={{ replace: () => setLogueado(true) }} />
      )}
    </View>
  );
}

// Styles for flash message container and text
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
