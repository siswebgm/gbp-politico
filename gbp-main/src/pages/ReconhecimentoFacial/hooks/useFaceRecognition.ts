import { useState, useCallback } from 'react';
import { supabaseClient } from '../../../lib/supabase';
import { Eleitor } from '../../../types/eleitor';
import { useCompanyStore } from '../../../store/useCompanyStore';

type DetectedFace = {
  box: {
    xMin: number;
    yMin: number;
    xMax: number;
    yMax: number;
    width: number;
    height: number;
  };
  keypoints: Array<{
    x: number;
    y: number;
    name: string;
  }>;
};

export function useFaceRecognition() {
  const [loading, setLoading] = useState(false);
  const [matchedUser, setMatchedUser] = useState<Eleitor | null>(null);
  const [confidence, setConfidence] = useState(0);
  const company = useCompanyStore((state) => state.company);

  const findSimilarFace = useCallback(async (faces: DetectedFace[] | null) => {
    if (!faces || faces.length === 0) {
      setMatchedUser(null);
      setConfidence(0);
      return;
    }

    setLoading(true);

    try {
      // Verificar se o cliente Supabase está configurado corretamente
      if (!supabaseClient) {
        throw new Error('Cliente Supabase não está configurado');
      }

      if (!company?.uid) {
        throw new Error('Empresa não encontrada');
      }

      // Buscar eleitores com fotos cadastradas
      const { data: eleitores, error } = await supabaseClient
        .from('gbp_eleitores')
        .select('*')
        .eq('empresa_uid', company.uid)
        .not('facial_foto', 'is', null)
        .limit(10);

      if (error) {
        throw error;
      }

      if (!eleitores || eleitores.length === 0) {
        setMatchedUser(null);
        setConfidence(0);
        return;
      }

      // TODO: Implementar a comparação real de faces aqui
      // Por enquanto, simulando um match com o primeiro eleitor que tem foto
      const matchedEleitor = eleitores.find(eleitor => eleitor.facial_foto);
      
      if (matchedEleitor) {
        // Simulando uma confiança baseada no tamanho do rosto detectado
        const faceArea = faces[0].box.width * faces[0].box.height;
        const normalizedConfidence = Math.min(90 + (faceArea / 10000), 99);
        
        setMatchedUser(matchedEleitor);
        setConfidence(normalizedConfidence);
      } else {
        setMatchedUser(null);
        setConfidence(0);
      }
    } catch (error) {
      console.error('Erro ao buscar eleitores:', error);
      setMatchedUser(null);
      setConfidence(0);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    matchedUser,
    confidence,
    findSimilarFace
  };
}
