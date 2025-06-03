import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '../lib/supabase';

// Define the Election interface for type safety
export interface Election {
  id: number;
  titulo: string;
  fecha_inicio: string;
  fecha_fin: string;
  estado?: string;
  votos?: number;
}

// Define the shape of the context value
interface ElectionContextType {
  elections: Election[];
  loading: boolean;
  refreshElections: () => Promise<void>;
}

// Create the context with default values
const ElectionContext = createContext<ElectionContextType>({
  elections: [],
  loading: true,
  refreshElections: async () => {},
});

// Custom hook to consume the Election context
export const useElections = () => useContext(ElectionContext);

// Define props interface for the provider
interface Props {
  children: ReactNode;
}

// ElectionProvider component that fetches and provides election data
export const ElectionProvider = ({ children }: Props) => {
  const [elections, setElections] = useState<Election[]>([]); // Store election data
  const [loading, setLoading] = useState(true); // Track loading state

  // Fetch elections from Supabase
  const fetchElections = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from<Election>('elections') // Fetch from elections table
      .select('*') // Select all columns
      .order('fecha_inicio', { ascending: false }); // Order by start date descending

    if (error) {
      console.error('Error fetching elections:', error); // Log error if fetch fails
      setElections([]); // Reset elections
    } else {
      setElections(data ?? []); // Set elections or empty array
    }
    setLoading(false); // Done loading
  };

  // Context value to be provided
  const value: ElectionContextType = {
    elections,
    loading,
    refreshElections: fetchElections,
  };

  // Wrap children with the context provider
  return <ElectionContext.Provider value={value}>{children}</ElectionContext.Provider>;
};
