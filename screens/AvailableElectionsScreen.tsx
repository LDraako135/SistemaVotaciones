import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { useFocusEffect } from '@react-navigation/native';

type Election = {
  id: number;
  name: string;
  description: string;
  representation_type: string;
  start_date: string;
  end_date: string;
  state: string;
};

type Candidate = {
  id: number;
  name: string;
  proposal: string;
  election_id: number;
};

const showAlert = (title: string, message: string) => {
  if (Platform.OS === 'web') {
    // @ts-ignore
    window.alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
};

export default function AvailableElectionsScreen() {
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userId, setUserId] = useState<number | null>(null);
  const [elections, setElections] = useState<Election[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedElectionId, setSelectedElectionId] = useState<number | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);

  useEffect(() => {
    const fetchUserRole = async () => {
      const usuario = await AsyncStorage.getItem('usuario');
      if (usuario) {
        const parsed = JSON.parse(usuario);
        setUserRole(parsed.role);
        setUserId(parsed.id);
      }
    };
    fetchUserRole();
  }, []);

  // Función para obtener elecciones
  const fetchAvailableElections = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('elections')
      .select('*')
      .or('state.eq.ACTIVA,state.eq.PENDIENTE,state.eq.FINALIZADA')
      .order('start_date', { ascending: true });

    if (error) {
      setElections([]);
    } else {
      setElections(data as Election[]);
    }
    setLoading(false);
  };

  // Se ejecuta cuando cambia el rol o al enfocar la pantalla
  useFocusEffect(
    useCallback(() => {
      if (userRole) {
        fetchAvailableElections();
        setSelectedElectionId(null);
        setCandidates([]);
      }
    }, [userRole])
  );

  // Suscripción en tiempo real a cambios en la tabla elections
  useEffect(() => {
    if (!userRole) return;

    const subscription = supabase
      .from('elections')
      .on('*', (payload) => {

        fetchAvailableElections();
      })
      .subscribe();

    return () => {
      supabase.removeSubscription(subscription);
    };
  }, [userRole]);

  const fetchCandidates = async (electionId: number) => {
    setLoadingCandidates(true);
    const { data, error } = await supabase
      .from('candidacies')
      .select(`
        id,
        proposal,
        user_id,
        election_id,
        users!candidacies_user_id_fkey(username)
      `)
      .eq('election_id', electionId);

    if (error) {
      setCandidates([]);
    } else {
      const candidatesWithName = (data as any[]).map((c) => ({
        id: c.id,
        name: c.users?.username || 'Sin nombre',
        proposal: c.proposal,
        election_id: c.election_id,
      }));
      setCandidates(candidatesWithName);
    }
    setLoadingCandidates(false);
  };

  const onSelectElection = (id: number) => {
    if (selectedElectionId === id) {
      setSelectedElectionId(null);
      setCandidates([]);
    } else {
      setSelectedElectionId(id);
      fetchCandidates(id);
    }
  };

  const voteForCandidate = async (candidateId: number) => {
    if (!userId || !selectedElectionId || !userRole) {
      showAlert('Error', 'No se pudo identificar el usuario, rol o la elección.');
      return;
    }

    const selectedElection = elections.find((e) => e.id === selectedElectionId);
    if (!selectedElection) {
      showAlert('Error', 'Elección no encontrada.');
      return;
    }

    if (selectedElection.state === 'PENDIENTE') {
      showAlert('Acceso Denegado', 'No puedes votar en una elección que aún está pendiente.');
      return;
    }

    if (userRole === 'ADMIN' || userRole === 'ADMINISTRATIVO') {
      showAlert('Acceso Denegado', 'Los administradores no pueden votar.');
      return;
    }

    if (userRole === 'CANDIDATO') {
      const { data: userCandidacies, error: candidaciesError } = await supabase
        .from('candidacies')
        .select('election_id')
        .eq('user_id', userId);

      if (candidaciesError) {
        showAlert('Error', 'Error verificando candidaturas del usuario.');
        return;
      }

      const isCandidateInThisElection = userCandidacies?.some(
        (c) => c.election_id === selectedElectionId
      );
      if (isCandidateInThisElection) {
        showAlert('Acceso Denegado', 'No puedes votar en la elección donde eres candidato.');
        return;
      }
    }

    const { data: existingVotes, error: voteError } = await supabase
      .from('votes')
      .select('*')
      .eq('user_id', userId)
      .eq('election_id', selectedElectionId);

    if (voteError) {
      showAlert('Error', 'Error verificando votos previos');
      return;
    }

    if (existingVotes && existingVotes.length > 0) {
      showAlert('Aviso', 'Ya has votado en esta elección.');
      return;
    }

    const now = new Date().toISOString();

    const { error: insertError } = await supabase.from('votes').insert([
      {
        user_id: userId,
        election_id: selectedElectionId,
        candidacy_id: candidateId,
        created_at: now,
        updated_at: now,
      },
    ]);

    if (insertError) {
      showAlert('Error', 'No se pudo registrar el voto');
    } else {
      showAlert('Gracias', 'Tu voto ha sido registrado con éxito');
      fetchAvailableElections();
      setSelectedElectionId(null);
      setCandidates([]);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text>Cargando elecciones...</Text>
      </View>
    );
  }

  if (elections.length === 0) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text>No hay elecciones disponibles en este momento.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🗳️ Elecciones Disponibles</Text>
      <FlatList
        data={elections}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.electionRow}>
            <TouchableOpacity onPress={() => onSelectElection(item.id)}>
              <Text style={styles.name}>🗂️ {item.name}</Text>
              <Text>📄 {item.description}</Text>
              <Text>🏛️ {item.representation_type}</Text>
              <Text>
                ⏳ {new Date(item.start_date).toLocaleDateString()} →{' '}
                {new Date(item.end_date).toLocaleDateString()}
              </Text>
              <Text>📌 Estado: {item.state}</Text>
            </TouchableOpacity>
            {selectedElectionId === item.id && (
              <View style={{ marginTop: 10, paddingLeft: 10 }}>
                {loadingCandidates ? (
                  <ActivityIndicator size="small" color="#0000ff" />
                ) : candidates.length === 0 ? (
                  <Text>No hay candidatos para esta elección.</Text>
                ) : (
                  candidates.map((c) => (
                    <View key={c.id} style={styles.candidateCard}>
                      <Text style={{ fontWeight: 'bold' }}>{c.name}</Text>
                      <Text>{c.proposal}</Text>
                      <TouchableOpacity
                        onPress={() => voteForCandidate(c.id)}
                        style={styles.voteButton}
                      >
                        <Text style={styles.voteButtonText}>Votar</Text>
                      </TouchableOpacity>
                    </View>
                  ))
                )}
              </View>
            )}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: '#fff', flex: 1 },
  center: { justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, textAlign: 'center', marginBottom: 20 },
  electionRow: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    borderRadius: 8,
    marginBottom: 10,
    backgroundColor: '#f9f9f9',
  },
  name: { fontWeight: 'bold', fontSize: 18, marginBottom: 5 },
  candidateCard: {
    padding: 10,
    marginBottom: 8,
    backgroundColor: '#e0f7fa',
    borderRadius: 6,
  },
  voteButton: {
    marginTop: 5,
    backgroundColor: '#00796b',
    paddingVertical: 6,
    borderRadius: 4,
  },
  voteButtonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: '600',
  },
});
