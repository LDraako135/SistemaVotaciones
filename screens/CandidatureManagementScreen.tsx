import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  Text,
  Button,
  StyleSheet,
  Alert,
  TextInput,
  FlatList,
  TouchableOpacity,
  View,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { supabase } from '../lib/supabase';
import { FontAwesome } from '@expo/vector-icons';

type Candidature = {
  id: number;
  proposal: string;
  created_at: string;
  updated_at: string;
  user_id: number;
  election_id: number;
  username?: string;
  electionName?: string;
};

type Candidate = {
  id: number;
  username: string;
};

type Election = {
  id: number;
  name: string;
};

export default function CandidatureManagementScreen() {
  const [candidatures, setCandidatures] = useState<Candidature[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [elections, setElections] = useState<Election[]>([]);

  const [proposal, setProposal] = useState('');
  const [selectedCandidate, setSelectedCandidate] = useState<number | null>(null);
  const [selectedElection, setSelectedElection] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

   useEffect(() => {
  fetchCandidates();
  fetchElections();
  fetchCandidatures();

  const subscription = supabase
    .from('candidacies')
    .on('*', (payload) => {
      fetchCandidatures();
    })
    .subscribe();

  return () => {
    supabase.removeSubscription(subscription); // O subscription.unsubscribe();
  };
}, []);


  const fetchCandidates = async () => {
    const { data, error } = await supabase
      .from('users')
      .select('id, username')
      .eq('role', 'CANDIDATO');
    if (error) {
      Alert.alert('Error al cargar candidatos', error.message);
      return;
    }
    setCandidates(data || []);
  };

  const fetchElections = async () => {
    const { data, error } = await supabase.from('elections').select('id, name');
    if (error) {
      Alert.alert('Error al cargar elecciones', error.message);
      return;
    }
    setElections(data || []);
  };

  const fetchCandidatures = async () => {
    const { data, error } = await supabase
      .from('candidacies')
      .select(`
        id,
        proposal,
        user_id,
        election_id,
        created_at,
        updated_at,
        users:user_id (username),
        elections:election_id (name)
      `);

    if (error) {
      Alert.alert('Error al cargar candidaturas', error.message);
      return;
    }

    const mapped = (data || []).map((item: any) => ({
      id: item.id,
      proposal: item.proposal,
      created_at: item.created_at,
      updated_at: item.updated_at,
      user_id: item.user_id,
      election_id: item.election_id,
      username: item.users?.username,
      electionName: item.elections?.name,
    }));

    setCandidatures(mapped);
  };

  const handleSave = async () => {
    if (!selectedCandidate) {
      Alert.alert('⚠️ Selecciona un candidato.');
      return;
    }
    if (!selectedElection) {
      Alert.alert('⚠️ Selecciona una elección.');
      return;
    }
    if (proposal.trim() === '') {
      Alert.alert('⚠️ La propuesta no puede estar vacía.');
      return;
    }

    setLoading(true);
    const now = new Date().toISOString();

    try {
      if (editingId !== null) {
        const { error } = await supabase
          .from('candidacies')
          .update({
            user_id: selectedCandidate,
            election_id: selectedElection,
            proposal: proposal.trim(),
            updated_at: now,
          })
          .eq('id', editingId);

        if (error) throw error;
        Alert.alert('Candidatura actualizada');
      } else {
        const { error } = await supabase.from('candidacies').insert([
          {
            user_id: selectedCandidate,
            election_id: selectedElection,
            proposal: proposal.trim(),
            created_at: now,
            updated_at: now,
          },
        ]);

        if (error) throw error;
        Alert.alert('Candidatura creada');
      }

      resetForm();
      fetchCandidatures();
    } catch (error: any) {
      Alert.alert('Error al guardar candidatura', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (c: Candidature) => {
    setEditingId(c.id);
    setSelectedCandidate(c.user_id);
    setSelectedElection(c.election_id);
    setProposal(c.proposal);
  };

  const handleDelete = (id: number) => {
    Alert.alert(
      'Confirmación',
      '¿Deseas eliminar esta candidatura?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase.from('candidacies').delete().eq('id', id);
            if (error) {
              Alert.alert('Error al eliminar candidatura', error.message);
            } else {
              Alert.alert('Candidatura eliminada');
              fetchCandidatures();
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const resetForm = () => {
    setEditingId(null);
    setSelectedCandidate(null);
    setSelectedElection(null);
    setProposal('');
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>📝 Gestión de Candidaturas</Text>

      <Text style={styles.label}>Candidato:</Text>
      <View style={styles.pickerWrapper}>
        <Picker
          selectedValue={selectedCandidate}
          onValueChange={(val) => setSelectedCandidate(val)}
          style={styles.picker}
          prompt="Seleccione candidato"
        >
          <Picker.Item label="-- Seleccione candidato --" value={null} />
          {candidates.map((c) => (
            <Picker.Item key={c.id} label={c.username} value={c.id} />
          ))}
        </Picker>
      </View>

      <Text style={styles.label}>Elección:</Text>
      <View style={styles.pickerWrapper}>
        <Picker
          selectedValue={selectedElection}
          onValueChange={(val) => setSelectedElection(val)}
          style={styles.picker}
          prompt="Seleccione elección"
        >
          <Picker.Item label="-- Seleccione elección --" value={""} />
          {elections.map((e) => (
            <Picker.Item key={e.id} label={e.name} value={e.id} />
          ))}
        </Picker>
      </View>

      <Text style={styles.label}>Propuesta:</Text>
      <TextInput
        multiline
        style={styles.textInput}
        placeholder="Ingrese la propuesta"
        value={proposal}
        onChangeText={setProposal}
      />

      <Button
        title={loading ? 'Guardando...' : editingId !== null ? 'Actualizar candidatura' : 'Crear candidatura'}
        onPress={handleSave}
        disabled={loading}
      />

      <Text style={styles.subtitle}>Listado de candidaturas:</Text>

      <FlatList
        data={candidatures}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.candidatureRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <FontAwesome name="id-badge" size={20} color="black" />
              <Text style={{ fontWeight: 'bold', fontSize: 19, marginLeft: 6 }}>
                {item.id}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
              <FontAwesome name="user" size={18} color="black" />
              <Text style={{ fontWeight: 'normal', marginLeft: 6 }}>
                {item.username}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
              <FontAwesome name="calendar" size={18} color="black" />
              <Text style={{ fontWeight: 'normal', marginLeft: 6 }}>
                {item.electionName}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
              <FontAwesome name="file-text" size={18} color="black" />
              <Text style={{ fontWeight: 'normal', marginLeft: 6 }}>
                {item.proposal}
              </Text>
            </View>

            <View style={styles.iconButtons}>
              <TouchableOpacity onPress={() => handleEdit(item)}>
                <FontAwesome name="edit" size={24} color="blue" style={styles.icon} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDelete(item.id)}>
                <FontAwesome name="trash" size={24} color="red" style={styles.icon} />
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={<Text>No hay candidaturas registradas.</Text>}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  label: { fontWeight: 'bold', marginTop: 10 },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    marginTop: 6,
    marginBottom: 10,
  },
  picker: { height: 50 ,color: 'black'},
  textInput: {
    height: 80,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    marginTop: 6,
    marginBottom: 12,
    padding: 10,
    textAlignVertical: 'top',
  },
  subtitle: { fontSize: 18, fontWeight: 'bold', marginTop: 20, marginBottom: 8 },
  candidatureRow: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 10,
    marginBottom: 12,
    borderRadius: 8,
  },
  iconButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
  },
  icon: {
    marginHorizontal: 10,
  },
});
