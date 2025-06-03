import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Platform, StyleSheet } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { supabase } from '../lib/supabase';

type Election = { id: number; name: string; start_date: string; end_date: string; state: string };
type CandidateResult = { id: number; name: string; votes_count: number };

export default function ElectionResultsScreen() {
  // State to store elections that are finished
  const [elections, setElections] = useState<Election[]>([]);
  // Loading state for fetching elections
  const [loading, setLoading] = useState(true);
  // State for currently selected election id
  const [selectedElectionId, setSelectedElectionId] = useState<number | null>(null);
  // State for candidate results for the selected election
  const [results, setResults] = useState<CandidateResult[]>([]);
  // Loading state for fetching results of selected election
  const [loadingResults, setLoadingResults] = useState(false);

  // On component mount, fetch finished elections
  useEffect(() => {
    fetchElections();
  }, []);

  // When selectedElectionId changes, fetch the results or clear if none selected
  useEffect(() => {
    if (selectedElectionId !== null) fetchResults(selectedElectionId);
    else setResults([]);
  }, [selectedElectionId]);

  // Fetch elections with state FINALIZADA ordered by start date descending
  async function fetchElections() {
    setLoading(true);
    const { data, error } = await supabase
      .from('elections')
      .select('*')
      .eq('state', 'FINALIZADA')
      .order('start_date', { ascending: false });
    if (error) {
      console.error(error.message);
      setElections([]);
    } else setElections(data as Election[]);
    setLoading(false);
  }

  // Fetch vote results for the given election, counting votes per candidate
  async function fetchResults(electionId: number) {
    setLoadingResults(true);
    const { data, error } = await supabase
      .from('votes')
      .select(`
        candidacy_id,
        candidacies (
          users!candidacies_user_id_fkey(username)
        )
      `)
      .eq('election_id', electionId);
    if (error) {
      console.error(error.message);
      setResults([]);
      setLoadingResults(false);
      return;
    }

    // Count votes grouped by candidacy_id and get candidate username
    const counts: Record<number, CandidateResult> = {};
    (data ?? []).forEach((vote) => {
      const cId = vote.candidacy_id;
      if (!counts[cId]) {
        counts[cId] = { id: cId, name: vote.candidacies?.users?.username || 'Sin nombre', votes_count: 0 };
      }
      counts[cId].votes_count += 1;
    });

    // Sort candidates descending by vote count and update state
    setResults(Object.values(counts).sort((a, b) => b.votes_count - a.votes_count));
    setLoadingResults(false);
  }

  // Function to download the results report as CSV
  async function downloadReport() {
    if (!selectedElectionId) return;

    // Create CSV content with header and data rows escaping quotes in names
    const header = 'Candidato,Votos\n';
    const csv = header + results.map(r => `"${r.name.replace(/"/g, '""')}",${r.votes_count}`).join('\n');

    if (Platform.OS === 'web') {
      // On web, create a Blob and trigger a download link click
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `resultados_eleccion_${selectedElectionId}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } else {
      // On mobile, save file to local document directory and open sharing dialog
      const path = FileSystem.documentDirectory + `resultados_eleccion_${selectedElectionId}.csv`;
      await FileSystem.writeAsStringAsync(path, csv, { encoding: FileSystem.EncodingType.UTF8 });
      await Sharing.shareAsync(path);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Resultados de Elecciones Finalizadas</Text>

      {loading ? (
        // Show loader while elections are loading
        <ActivityIndicator size="large" color="#0000ff" />
      ) : (
        // List finished elections, highlight selected
        <FlatList
          data={elections}
          keyExtractor={item => item.id.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => setSelectedElectionId(selectedElectionId === item.id ? null : item.id)}
              style={[styles.electionItem, selectedElectionId === item.id && styles.selectedElection]}
            >
              <Text style={styles.electionName}>{item.name}</Text>
              <Text>{new Date(item.start_date).toLocaleDateString()} - {new Date(item.end_date).toLocaleDateString()}</Text>
              <Text>Estado: {item.state}</Text>
            </TouchableOpacity>
          )}
        />
      )}

      {selectedElectionId && (
        <View style={styles.resultsSection}>
          <Text style={styles.resultsTitle}>Resultados</Text>
          {loadingResults ? (
            // Show loader while results are loading
            <ActivityIndicator size="large" color="#0000ff" />
          ) : results.length === 0 ? (
            // Show message if no votes found
            <Text>No hay votos registrados para esta elección.</Text>
          ) : (
            // List candidate results with vote counts
            <FlatList
              data={results}
              keyExtractor={item => item.id.toString()}
              renderItem={({ item }) => (
                <View style={styles.resultRow}>
                  <Text>{item.name}</Text>
                  <Text>{item.votes_count} votos</Text>
                </View>
              )}
            />
          )}

          {/* Button to download CSV report */}
          <TouchableOpacity onPress={downloadReport} style={styles.downloadButton}>
            <Text style={styles.downloadButtonText}>Descargar reporte CSV</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  electionItem: {
    padding: 15,
    backgroundColor: '#eee',
    marginBottom: 10,
    borderRadius: 6,
  },
  selectedElection: {
    backgroundColor: '#c8e6c9',
  },
  electionName: { fontWeight: 'bold', fontSize: 18 },
  resultsSection: { marginTop: 20, flex: 1 },
  resultsTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 10 },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#e8f5e9',
    padding: 12,
    borderRadius: 6,
    marginBottom: 8,
  },
  downloadButton: {
    marginTop: 15,
    backgroundColor: '#00796b',
    padding: 12,
    borderRadius: 6,
  },
  downloadButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
