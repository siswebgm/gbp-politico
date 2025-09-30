import React, { createContext, useContext, useState, ReactNode, useCallback, useMemo, useRef } from 'react';

interface EditModeContextType {
  isEditMode: boolean;
  toggleEditMode: () => void;
  isAdmin: boolean;
  login: (password: string) => boolean;
}

const EditModeContext = createContext<EditModeContextType | undefined>(undefined);

const ADMIN_PASSWORD = 'admin123'; // Em produção, use variáveis de ambiente e um sistema de autenticação seguro

export const EditModeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isEditMode, _setIsEditMode] = useState(false);
  const [isAdmin, _setIsAdmin] = useState(false);
  
  // Usando useRef para armazenar os valores atuais
  const stateRef = useRef({
    isEditMode,
    isAdmin
  });

  // Atualiza o ref quando o estado muda
  stateRef.current = {
    isEditMode,
    isAdmin
  };

  const setIsEditMode = useCallback((value: boolean) => {
    _setIsEditMode(value);
    stateRef.current.isEditMode = value;
  }, []);

  const setIsAdmin = useCallback((value: boolean) => {
    _setIsAdmin(value);
    stateRef.current.isAdmin = value;
  }, []);

  console.log('EditModeProvider - State:', { isEditMode, isAdmin });

  const toggleEditMode = useCallback(() => {
    console.log('Toggle Edit Mode - Current State:', stateRef.current);
    if (stateRef.current.isAdmin) {
      setIsEditMode(!stateRef.current.isEditMode);
    } else {
      console.log('Apenas administradores podem ativar o modo de edição');
    }
  }, []);

  const login = useCallback((password: string) => {
    const isAuthenticated = password === ADMIN_PASSWORD;
    console.log('Login attempt:', { isAuthenticated });
    setIsAdmin(isAuthenticated);
    return isAuthenticated;
  }, []);

  const contextValue = useMemo(() => ({
    isEditMode,
    toggleEditMode,
    isAdmin,
    login
  }), [isEditMode, isAdmin, toggleEditMode, login]);

  return (
    <EditModeContext.Provider value={contextValue}>
      {children}
    </EditModeContext.Provider>
  );
};

export const useEditMode = () => {
  const context = useContext(EditModeContext);
  if (context === undefined) {
    throw new Error('useEditMode must be used within an EditModeProvider');
  }
  console.log('useEditMode - Context:', context);
  return context;
};
