import { View, Text, StyleSheet, Button } from 'react-native';
import { useNavigation } from '@react-navigation/native';

export default function HomeScreen() {
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>¡Bienvenido a la App de Votación!</Text>
      <Text style={styles.subtitle}>Aquí puedes consultar las elecciones disponibles y tu perfil.</Text>

      <View style={styles.buttonContainer}>
        <Button
          title="Ver Elecciones Disponibles"
          onPress={() => navigation.navigate('Elecciones Disponibles' as never)}
        />
      </View>

      <View style={styles.buttonContainer}>
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
