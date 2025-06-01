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

function DatePicker({ date, onChange }: { date: Date | null; onChange: (d: Date) => void }) {
  if (Platform.OS === 'web') {
    const formattedDate = date ? date.toISOString().substring(0, 10) : '';
    return (
      <input
        type="date"
        value={formattedDate}
        onChange={(e) => {
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

export default function ElectionManagementScreen() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [representationType, setRepresentationType] = useState('');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [state, setState] = useState('PENDIENTE');
  const [adminValid, setAdminValid] = useState(false);
  const [elections, setElections] = useState<Election[]>([]);
  const [editingElectionId, setEditingElectionId] = useState<number | null>(null);

  useEffect(() => {
    const verificarRol = async () => {
      const usuario = await AsyncStorage.getItem('usuario');
      if (usuario) {
        const parsed = JSON.parse(usuario);
        setAdminValid(parsed.role === 'ADMIN' || parsed.role === 'ADMINISTRATIVO');
      }
    };
    verificarRol();
  }, []);

  const fetchElections = async () => {
    const { data, error } = await supabase
      .from('elections')
      .select('*')
      .order('start_date', { ascending: false });

    if (!error && data) {
      await updateElectionStates(data as Election[]);
    } else {
      console.error(error);
    }
  };

  const updateElectionStates = async (electionsList: Election[]) => {
    const now = new Date();
    let updated = false;

    for (const election of electionsList) {
      const start = new Date(election.start_date);
      const end = new Date(election.end_date);
      let newState = election.state;

      if (end < now && election.state !== 'FINALIZADA') {
        newState = 'FINALIZADA';
      } else if (start <= now && now <= end && election.state !== 'ACTIVA') {
        newState = 'ACTIVA';
      } else if (start > now && election.state !== 'PENDIENTE') {
        newState = 'PENDIENTE';
      }

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

  useEffect(() => {
    if (adminValid) fetchElections();
  }, [adminValid]);

  const resetForm = () => {
    setName('');
    setDescription('');
    setRepresentationType('');
    setStartDate(null);
    setEndDate(null);
    setState('PENDIENTE');
    setEditingElectionId(null);
  };

  const handleCreateElection = async () => {
    if (!name || !description || !representationType || !startDate || !endDate || !state) {
      Alert.alert('⚠️ Todos los campos son obligatorios');
      return;
    }

    const now = new Date().toISOString();

    if (editingElectionId) {
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
            const { error } = await supabase.from('elections').delete().eq('id', id);
            if (error) {
              Alert.alert('❌ Error al eliminar elección', error.message);
            } else {
              Alert.alert('✅ Elección eliminada');
              if (editingElectionId === id) resetForm();
              fetchElections();
            }
          },
        },
      ]
    );
  };

  const handleEditElection = (election: Election) => {
    setEditingElectionId(election.id);
    setName(election.name);
    setDescription(election.description);
    setRepresentationType(election.representation_type);
    setStartDate(new Date(election.start_date));
    setEndDate(new Date(election.end_date));
    setState(election.state);
  };

  if (!adminValid) return <Text style={styles.block}>⛔ Acceso denegado</Text>;

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
              <TouchableOpacity onPress={() => handleDeleteElection(item.id)}>
                <FontAwesome name="trash" size={24} color="red" style={styles.icon} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleEditElection(item)}>
                <FontAwesome name="edit" size={24} color="blue" style={styles.icon} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  block: {
    fontSize: 22,
    color: 'red',
    textAlign: 'center',
    marginTop: 50,
  },
  title: {
    fontSize: 26,
    marginBottom: 15,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 20,
    marginTop: 30,
    marginBottom: 15,
    fontWeight: '600',
  },
  label: {
    fontWeight: '600',
    marginBottom: 5,
  },
  input: {
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 15,
  },
  pickerContainer: {
    marginBottom: 15,
  },
  picker: {
    height: 50,
    width: '100%',
  },
  dateButton: {
    padding: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    marginBottom: 15,
    backgroundColor: '#f0f0f0',
  },
  electionRow: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  iconButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  icon: {
    marginLeft: 15,
  },
});
