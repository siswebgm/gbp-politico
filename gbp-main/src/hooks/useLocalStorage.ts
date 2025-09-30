import { useState, useEffect } from 'react';

export function useLocalStorage<T>(key: string, initialValue: T) {
  // Estado para armazenar o valor
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      // Tenta obter do localStorage
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return initialValue;
    }
  });

  // Retorna uma função envolvida para salvar tanto no estado quanto no localStorage
  const setValue = (value: T | ((val: T) => T)) => {
    try {
      // Permite que o valor seja uma função para ter a mesma API que useState
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      
      // Salva no estado
      setStoredValue(valueToStore);
      
      // Salva no localStorage
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  };

  return [storedValue, setValue] as const;
}
