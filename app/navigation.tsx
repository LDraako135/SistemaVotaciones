import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import HomeScreen from '../screens/HomeScreen';
import UserManagementScreen from '../screens/UserManagementScreen';
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, TouchableOpacity, Text } from 'react-native';
import ElectionManagementScreen from '../screens/ElectionManageScreen';
import CandidatureManagementScreen from '../screens/CandidatureManagementScreen';
import { FontAwesome5 } from '@expo/vector-icons';
import AvailableElectionsScreen from '../screens/AvailableElectionsScreen';
import ElectionResultsScreen from '../screens/ElectionResultsScreen';

// IMPORTA supabase
import { supabase } from '../lib/supabase';  // Ajusta la ruta según tu proyecto
import UserProfileScreen from '../screens/UserProfileScreen';

const Tab = createBottomTabNavigator();

export default function Navigation({ onLogout }: { onLogout: () => void }) {
  const [rol, setRol] = useState<string | null>(null);
  const [hasFinalizedElection, setHasFinalizedElection] = useState(false);

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
        setRol(usuario.role);
      }
    };

    obtenerRol();
  }, []);

  useEffect(() => {
    // Verificar si hay elecciones finalizadas para mostrar el tab de resultados
    const checkFinalizedElections = async () => {
      const { data, error } = await supabase
        .from('elections')
        .select('id')
        .eq('state', 'FINALIZADA')
        .limit(1);

      if (error) {
        console.error('Error al verificar elecciones finalizadas:', error.message);
        setHasFinalizedElection(false);
      } else {
        setHasFinalizedElection(data?.length > 0);
      }
    };

    checkFinalizedElections();
  }, []);

  const headerRight = () => (
    <TouchableOpacity
      onPress={async () => {
        const confirmar = Platform.OS === 'web'
          ? window.confirm('¿Deseas salir de la aplicación?')
          : true;

        if (!confirmar) return;

        if (Platform.OS === 'web') {
          localStorage.removeItem('usuario');
          sessionStorage.setItem('logoutMessage', '🚪 Has cerrado sesión exitosamente');
          window.location.reload();
        } else {
          await AsyncStorage.removeItem('usuario');
          onLogout();
        }
      }}
      style={{ marginRight: 15 }}
    >
      <Text style={{ color: 'red', fontWeight: 'bold' }}>Salir</Text>
    </TouchableOpacity>
  );

  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ color, size }) => {
            if (route.name === 'Inicio') {
              return <Ionicons name="home" size={size} color={color} />;
            } else if (route.name === 'Usuarios') {
              return <Ionicons name="people" size={size} color={color} />;
            } else if (route.name === 'Perfil') {
              return <Ionicons name="person-circle" size={size} color={color} />;
            } else if (route.name === 'Elecciones Disponibles') {
              return <Ionicons name="list" size={size} color={color} />; 
            } else if (route.name === 'Eleccion') {
              return <Ionicons name="create" size={size} color={color} />;
            } else if (route.name === 'Resultados Disponibles') {
              return <Ionicons name="stats-chart" size={size} color={color} />;
            } else if (route.name === 'Candidatura') {
              return <FontAwesome5 name="user-tie" size={size} color={color} />;
            }else if (route.name === 'Perfil') {
              return <FontAwesome5 name="user-circle" size={size} color={color} />;
            }
            return <Ionicons name="help" size={size} color={color} />;
          },

          headerRight,
        })}

      >
        <Tab.Screen name="Inicio" component={HomeScreen} />
        <Tab.Screen name="Elecciones Disponibles" component={AvailableElectionsScreen} />
        <Tab.Screen name="Resultados Disponibles" component={ElectionResultsScreen} />

        {rol === 'ADMINISTRATIVO' && (
          <>
            <Tab.Screen name="Eleccion" component={ElectionManagementScreen} />
            <Tab.Screen name="Candidatura" component={CandidatureManagementScreen} />
          </>
        )}
        {rol === 'ADMIN' && (
          <>
            <Tab.Screen name="Usuarios" component={UserManagementScreen} />
            <Tab.Screen name="Eleccion" component={ElectionManagementScreen} />
            <Tab.Screen name="Candidatura" component={CandidatureManagementScreen} />

          </>
        )}
        <Tab.Screen name="Perfil" component={UserProfileScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
