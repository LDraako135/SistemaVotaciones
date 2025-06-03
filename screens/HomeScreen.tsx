import { View, Text, StyleSheet, Button } from 'react-native';
// Importing navigation hook from React Navigation
import { useNavigation } from '@react-navigation/native';

export default function HomeScreen() {
  // Get the navigation object to enable screen transitions
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      {/* Main welcome title */}
      <Text style={styles.title}>¡Bienvenido a la App de Votación!</Text>
      {/* Subtitle describing the main options */}
      <Text style={styles.subtitle}>Aquí puedes consultar las elecciones disponibles y tu perfil.</Text>

      <View style={styles.buttonContainer}>
        {/* Button to navigate to Available Elections screen */}
        <Button
          title="Ver Elecciones Disponibles"
          onPress={() => navigation.navigate('Elecciones Disponibles' as never)}
        />
      </View>

      <View style={styles.buttonContainer}>
        {/* Button to navigate to Profile screen */}
        <Button
          title="Ir a Mi Perfil"
          onPress={() => navigation.navigate('Perfil' as never)}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  title: { 
    fontSize: 28, 
    fontWeight: 'bold', 
    marginBottom: 12, 
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16, 
    color: '#555',
    marginBottom: 24,
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
    marginVertical: 8,
  },
});
