import React, { useState, useEffect } from 'react';
import {
  ScrollView,
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  Alert,
  FlatList,
  Pressable,
  TouchableOpacity,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { FontAwesome } from '@expo/vector-icons';

// Define the Election type to match the structure of election records
type Election = {
  id: number;
  name: string;
  description: string;
  representation_type: string;
  start_date: string;
  end_date: string;
  state: string;
  created_at: string;
  updated_at: string;
};

// DatePicker component for selecting dates differently on web and mobile platforms
function DatePicker({ date, onChange }: { date: Date | null; onChange: (d: Date) => void }) {
  if (Platform.OS === 'web') {
    // For web, use native input type="date" element
    const formattedDate = date ? date.toISOString().substring(0, 10) : '';
    return (
      <input
        type="date"
        value={formattedDate}
        onChange={(e) => {
          // Parse the selected date and call onChange
          const newDate = e.target.value ? new Date(e.target.value) : null;
          if (newDate) onChange(newDate);
        }}
        style={{
          padding: 10,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: '#ccc',
          marginBottom: 10,
          width: '100%',
          fontSize: 16,
        }}
      />
    );
  } else {
    // For mobile platforms, use the DateTimePicker component with a pressable button
    const [show, setShow] = useState(false);
    return (
      <>
        <Pressable onPress={() => setShow(true)} style={styles.dateButton}>
          <Text>{date ? `📅 ${date.toLocaleDateString()}` : '📅 Selecciona fecha'}</Text>
        </Pressable>
        {show && (
          <DateTimePicker
            value={date || new Date()}
            mode="date"
            display="default"
            onChange={(event, selectedDate) => {
              setShow(false);
              if (selectedDate) onChange(selectedDate);
            }}
          />
        )}
      </>
    );
  }
}

// Main screen component for managing elections
export default function ElectionManagementScreen() {
  // State variables for form inputs and election data
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [representationType, setRepresentationType] = useState('');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [state, setState] = useState('PENDIENTE');
  const [adminValid, setAdminValid] = useState(false);
  const [elections, setElections] = useState<Election[]>([]);
  const [editingElectionId, setEditingElectionId] = useState<number | null>(null);

  // Check user role from AsyncStorage on component mount to verify admin privileges
  useEffect(() => {
    const verificarRol = async () => {
      const usuario = await AsyncStorage.getItem('usuario');
      if (usuario) {
        const parsed = JSON.parse(usuario);
        // Set adminValid to true if role is ADMIN or ADMINISTRATIVO
        setAdminValid(parsed.role === 'ADMIN' || parsed.role === 'ADMINISTRATIVO');
      }
    };
    verificarRol();
  }, []);

  // Fetch elections from the database ordered by start date descending
  const fetchElections = async () => {
    const { data, error } = await supabase
      .from('elections')
      .select('*')
      .order('start_date', { ascending: false });

    if (!error && data) {
      // Update election states based on current date and data
      await updateElectionStates(data as Election[]);
    } else {
      console.error(error);
    }
  };

  // Update election states to 'PENDIENTE', 'ACTIVA' or 'FINALIZADA' based on dates
  const updateElectionStates = async (electionsList: Election[]) => {
    const now = new Date();
    let updated = false;

    for (const election of electionsList) {
      const start = new Date(election.start_date);
      const end = new Date(election.end_date);
      let newState = election.state;

      // Determine new state depending on current time vs start/end dates
      if (end < now && election.state !== 'FINALIZADA') {
        newState = 'FINALIZADA';
      } else if (start <= now && now <= end && election.state !== 'ACTIVA') {
        newState = 'ACTIVA';
      } else if (start > now && election.state !== 'PENDIENTE') {
        newState = 'PENDIENTE';
      }

      // Update the election state in the database if it has changed
      if (newState !== election.state) {
        const { error } = await supabase
          .from('elections')
          .update({ state: newState })
          .eq('id', election.id);

        if (error) {
          console.error('Error updating election state:', error.message);
        } else {
          updated = true;
        }
      }
    }

    // If any state was updated, fetch the updated list again, otherwise set local state
    if (updated) {
      const { data, error } = await supabase
        .from('elections')
        .select('*')
        .order('start_date', { ascending: false });

      if (!error && data) {
        setElections(data as Election[]);
      }
    } else {
      setElections(electionsList);
    }
  };

  // When adminValid changes and is true, fetch elections from backend
  useEffect(() => {
    if (adminValid) fetchElections();
  }, [adminValid]);

  // Reset the form fields and editing state
  const resetForm = () => {
    setName('');
    setDescription('');
    setRepresentationType('');
    setStartDate(null);
    setEndDate(null);
    setState('PENDIENTE');
    setEditingElectionId(null);
  };

  // Handle create or update election submission
  const handleCreateElection = async () => {
    // Validate required fields
    if (!name || !description || !representationType || !startDate || !endDate || !state) {
      Alert.alert('⚠️ Todos los campos son obligatorios'); // All fields are required
      return;
    }

    const now = new Date().toISOString();

    if (editingElectionId) {
      // Update existing election in database
      const { error } = await supabase
        .from('elections')
        .update({
          name,
          description,
          representation_type: representationType,
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          state,
          updated_at: now,
        })
        .eq('id', editingElectionId);

      if (error) {
        Alert.alert('❌ Error al actualizar elección', error.message);
      } else {
        Alert.alert('✅ Elección actualizada correctamente');
        resetForm();
        fetchElections();
      }
    } else {
      // Insert new election in database
      const { error } = await supabase.from('elections').insert([
        {
          name,
          description,
          representation_type: representationType,
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          state,
          created_at: now,
          updated_at: now,
        },
      ]);

      if (error) {
        Alert.alert('❌ Error al crear elección', error.message);
      } else {
        Alert.alert('✅ Elección creada correctamente');
        resetForm();
        fetchElections();
      }
    }
  };

  // Confirm and handle deletion of an election
  const handleDeleteElection = async (id: number) => {
    Alert.alert(
      'Confirmar eliminación',
      '¿Estás seguro de que deseas eliminar esta elección?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            // Delete the election from the database
            const { error } = await supabase.from('elections').delete().eq('id', id);
            if (error) {
              Alert.alert('❌ Error al eliminar elección', error.message);
            } else {
              Alert.alert('✅ Elección eliminada');
              // If the deleted election was being edited, reset form
              if (editingElectionId === id) resetForm();
              fetchElections();
            }
          },
        },
      ]
    );
  };

  // Populate the form fields for editing the selected election
  const handleEditElection = (election: Election) => {
    setEditingElectionId(election.id);
    setName(election.name);
    setDescription(election.description);
    setRepresentationType(election.representation_type);
    setStartDate(new Date(election.start_date));
    setEndDate(new Date(election.end_date));
    setState(election.state);
  };

  // If user is not admin or administrative role, show access denied message
  if (!adminValid) return <Text style={styles.block}>⛔ Acceso denegado</Text>;

  // Render form and list of elections
  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 20 }}>
      <Text style={styles.title}>🗳️ Gestión de Elecciones</Text>

      <Text style={styles.label}>Nombre de la eleccion:</Text>
      <TextInput placeholder="Nombre de la eleccion" style={styles.input} value={name} onChangeText={setName} />

      <Text style={styles.label}>Descripcion:</Text>
      <TextInput
        placeholder="Descripción"
        style={styles.input}
        value={description}
        onChangeText={setDescription}
      />

      <Text style={styles.label}>Tipo de Representacion:</Text>
      <TextInput
        placeholder="Tipo de Representación"
        style={styles.input}
        value={representationType}
        onChangeText={setRepresentationType}
      />

      <Text style={styles.label}>Fecha de inicio:</Text>
      <DatePicker date={startDate} onChange={setStartDate} />

      <Text style={styles.label}>Fecha de fin:</Text>
      <DatePicker date={endDate} onChange={setEndDate} />

      <View style={styles.pickerContainer}>
        <Text style={styles.label}>📌 Estado:</Text>
        <Picker selectedValue={state} onValueChange={(itemValue) => setState(itemValue)} style={styles.picker}>
          <Picker.Item label="PENDIENTE" value="PENDIENTE" />
          <Picker.Item label="ACTIVA" value="ACTIVA" />
          <Picker.Item label="FINALIZADA" value="FINALIZADA" />
        </Picker>
      </View>

      <Button title={editingElectionId ? 'Actualizar Elección' : 'Crear Elección'} onPress={handleCreateElection} />

      {editingElectionId && (
        <View style={{ marginTop: 10 }}>
          <Button title="Cancelar Edición" color="gray" onPress={resetForm} />
        </View>
      )}

      <Text style={styles.subtitle}>📋 Elecciones Creadas:</Text>
      <FlatList
        data={elections}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.electionRow}>
            <Text>🗂️ {item.name}</Text>
            <Text>📄 {item.description}</Text>
            <Text>🏛️ {item.representation_type}</Text>
            <Text>
              ⏳ {new Date(item.start_date).toLocaleDateString()} → {new Date(item.end_date).toLocaleDateString()}
            </Text>
            <Text>📌 Estado: {item.state}</Text>

            <View style={styles.iconButtons}>
              {/* Button to delete election */}
              <TouchableOpacity onPress={() => handleDeleteElection(item.id)}>
                <FontAwesome name="trash" size={24} color="red" style={styles.icon} />
              </TouchableOpacity>
              {/* Button to edit election */}
              <TouchableOpacity onPress={() => handleEditElection(item)}>
                <FontAwesome name="edit" size={24} color="blue" style={styles.icon} />
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={<Text>No hay elecciones creadas.</Text>}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 20,
    backgroundColor: '#fff',
  },
  block: {
    fontSize: 20,
    textAlign: 'center',
    marginTop: 50,
    color: 'red',
  },
  title: {
    fontWeight: 'bold',
    fontSize: 22,
    marginBottom: 15,
    textAlign: 'center',
  },
  subtitle: {
    fontWeight: 'bold',
    fontSize: 18,
    marginTop: 25,
    marginBottom: 10,
  },
  label: {
    marginBottom: 5,
    fontWeight: '600',
  },
  input: {
    borderColor: '#aaa',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 15,
  },
  pickerContainer: {
    marginBottom: 15,
  },
  picker: {
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  electionRow: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    backgroundColor: '#fafafa',
  },
  iconButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  icon: {
    marginLeft: 15,
  },
  dateButton: {
    padding: 10,
    borderWidth: 1,
    borderColor: '#aaa',
    borderRadius: 8,
    marginBottom: 10,
  },
});
