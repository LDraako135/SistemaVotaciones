// Navigation using React Navigation's bottom tab navigator
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { FontAwesome5 } from '@expo/vector-icons';

// Import screens
import HomeScreen from '../screens/HomeScreen';
import UserManagementScreen from '../screens/UserManagementScreen';
import ElectionManagementScreen from '../screens/ElectionManageScreen';
import CandidatureManagementScreen from '../screens/CandidatureManagementScreen';
import AvailableElectionsScreen from '../screens/AvailableElectionsScreen';
import ElectionResultsScreen from '../screens/ElectionResultsScreen';
import UserProfileScreen from '../screens/UserProfileScreen';

import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, TouchableOpacity, Text } from 'react-native';

// Supabase client
import { supabase } from '../lib/supabase'; // Adjust the path as needed

const Tab = createBottomTabNavigator();

export default function Navigation({ onLogout }: { onLogout: () => void }) {
  const [rol, setRol] = useState<string | null>(null); // User role (ADMIN, ADMINISTRATIVO, etc.)
  const [hasFinalizedElection, setHasFinalizedElection] = useState(false); // Track if there are finished elections

  // Retrieve user role from local storage or AsyncStorage on app load
  useEffect(() => {
    const obtenerRol = async () => {
      let usuarioJSON;

      if (Platform.OS === 'web') {
        usuarioJSON = localStorage.getItem('usuario');
      } else {
        usuarioJSON = await AsyncStorage.getItem('usuario');
      }

      if (usuarioJSON) {
        const usuario = JSON.parse(usuarioJSON);
        setRol(usuario.role); // Set the user role to control tabs visibility
      }
    };

    obtenerRol();
  }, []);

  // Check if any election is marked as "FINALIZADA" (finished)
  useEffect(() => {
    const checkFinalizedElections = async () => {
      const { data, error } = await supabase
        .from('elections')
        .select('id')
        .eq('state', 'FINALIZADA')
        .limit(1); // We just need to know if at least one exists

      if (error) {
        console.error('Error checking finalized elections:', error.message);
        setHasFinalizedElection(false);
      } else {
        setHasFinalizedElection(data?.length > 0);
      }
    };

    checkFinalizedElections();
  }, []);

  // Log out button shown in the header
  const headerRight = () => (
    <TouchableOpacity
      onPress={async () => {
        const confirm = Platform.OS === 'web'
          ? window.confirm('Do you want to log out?')
          : true;

        if (!confirm) return;

        if (Platform.OS === 'web') {
          localStorage.removeItem('usuario');
          sessionStorage.setItem('logoutMessage', '🚪 You have successfully logged out');
          window.location.reload(); // Refresh the page
        } else {
          await AsyncStorage.removeItem('usuario');
          onLogout(); // Trigger logout callback
        }
      }}
      style={{ marginRight: 15 }}
    >
      <Text style={{ color: 'red', fontWeight: 'bold' }}>Logout</Text>
    </TouchableOpacity>
  );

  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ color, size }) => {
            // Set icon based on the route name
            if (route.name === 'Inicio') {
              return <Ionicons name="home" size={size} color={color} />;
            } else if (route.name === 'Usuarios') {
              return <Ionicons name="people" size={size} color={color} />;
            } else if (route.name === 'Perfil') {
              return <FontAwesome5 name="user-circle" size={size} color={color} />;
            } else if (route.name === 'Elecciones Disponibles') {
              return <Ionicons name="list" size={size} color={color} />;
            } else if (route.name === 'Eleccion') {
              return <Ionicons name="create" size={size} color={color} />;
            } else if (route.name === 'Resultados Disponibles') {
              return <Ionicons name="stats-chart" size={size} color={color} />;
            } else if (route.name === 'Candidatura') {
              return <FontAwesome5 name="user-tie" size={size} color={color} />;
            }

            return <Ionicons name="help" size={size} color={color} />;
          },

          headerRight, // Include the logout button in the header
        })}
      >
        {/* Always visible tabs */}
        <Tab.Screen name="Inicio" component={HomeScreen} />
        <Tab.Screen name="Elecciones Disponibles" component={AvailableElectionsScreen} />

        {/* Show "Resultados Disponibles" only if there are finalized elections */}
        {hasFinalizedElection && (
          <Tab.Screen name="Resultados Disponibles" component={ElectionResultsScreen} />
        )}

        {/* Tabs only visible to ADMINISTRATIVO role */}
        {rol === 'ADMINISTRATIVO' && (
          <>
            <Tab.Screen name="Eleccion" component={ElectionManagementScreen} />
            <Tab.Screen name="Candidatura" component={CandidatureManagementScreen} />
          </>
        )}

        {/* Tabs only visible to ADMIN role */}
        {rol === 'ADMIN' && (
          <>
            <Tab.Screen name="Usuarios" component={UserManagementScreen} />
            <Tab.Screen name="Eleccion" component={ElectionManagementScreen} />
            <Tab.Screen name="Candidatura" component={CandidatureManagementScreen} />
          </>
        )}

        {/* User profile tab is always shown */}
        <Tab.Screen name="Perfil" component={UserProfileScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
