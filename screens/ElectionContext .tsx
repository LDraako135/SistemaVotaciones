import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '../lib/supabase';

export interface Election {
  id: number;
  titulo: string;
  fecha_inicio: string;
  fecha_fin: string;
  estado?: string;
  votos?: number;
}

interface ElectionContextType {
  elections: Election[];
  loading: boolean;
  refreshElections: () => Promise<void>;
}

const ElectionContext = createContext<ElectionContextType>({
  elections: [],
  loading: true,
  refreshElections: async () => {},
});

export const useElections = () => useContext(ElectionContext);

interface Props {
  children: ReactNode;
}

export const ElectionProvider = ({ children }: Props) => {
  const [elections, setElections] = useState<Election[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchElections = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from<Election>('elections')
      .select('*')
      .order('fecha_inicio', { ascending: false });

    if (error) {
      console.error('Error fetching elections:', error);
      setElections([]);
    } else {
      setElections(data ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchElections();

    // Opcional: podrías subscribirte a cambios si usas realtime
    // const subscription = supabase
    //   .from('elections')
    //   .on('*', payload => {
    //     fetchElections();
    //   })
    //   .subscribe();
    //
    // return () => {
    //   supabase.removeSubscription(subscription);
    // };
  }, []);

  const value: ElectionContextType = {
    elections,
    loading,
    refreshElections: fetchElections,
  };

  return <ElectionContext.Provider value={value}>{children}</ElectionContext.Provider>;
};
