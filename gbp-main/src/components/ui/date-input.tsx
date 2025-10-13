import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Input } from './input';
import { CalendarDays } from 'lucide-react';

interface DateInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  showIcon?: boolean;
}

export function DateInput({ 
  value, 
  onChange, 
  placeholder = 'dd/mm/aaaa',
  className = '',
  showIcon = true
}: DateInputProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [displayValue, setDisplayValue] = useState('');

  // Detectar se está em dispositivo móvel
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(
        window.innerWidth <= 768 || 
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      );
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Atualizar displayValue quando value mudar (vindo de fora)
  useEffect(() => {
    if (value) {
      try {
        // Criar data local sem conversão de timezone
        const [year, month, day] = value.split('-').map(Number);
        const localDate = new Date(year, month - 1, day);
        const formatted = format(localDate, 'dd/MM/yyyy');
        setDisplayValue(formatted);
      } catch {
        setDisplayValue('');
      }
    } else {
      setDisplayValue('');
    }
  }, [value]);

  // Formatar a data enquanto o usuário digita
  const formatDisplayDate = (input: string) => {
    // Remove tudo que não é número
    const numbers = input.replace(/\D/g, '');
    
    // Limitar a 8 dígitos
    const limited = numbers.substring(0, 8);
    
    // Adicionar barras conforme digita
    let formatted = '';
    for (let i = 0; i < limited.length; i++) {
      if (i === 2 || i === 4) {
        formatted += '/';
      }
      formatted += limited[i];
    }
    
    return formatted;
  };

  // Converter displayValue (dd/mm/aaaa) para value (aaaa-mm-dd)
  const convertToISODate = (displayDate: string) => {
    const numbers = displayDate.replace(/\D/g, '');
    
    if (numbers.length === 8) {
      const dia = numbers.substring(0, 2);
      const mes = numbers.substring(2, 4);
      const ano = numbers.substring(4, 8);
      
      // Validar se é uma data válida
      const diaNum = parseInt(dia);
      const mesNum = parseInt(mes);
      const anoNum = parseInt(ano);
      
      if (diaNum >= 1 && diaNum <= 31 && mesNum >= 1 && mesNum <= 12 && anoNum >= 1900) {
        return `${ano}-${mes}-${dia}`;
      }
    }
    
    return '';
  };

  const iconClass = showIcon ? 'pl-9' : 'pl-3';

  return (
    <div className="relative">
      {showIcon && (
        <CalendarDays className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-500 pointer-events-none z-10" />
      )}
      
      {isMobile ? (
        <Input
          type="text"
          value={displayValue}
          onChange={(e) => {
            const formatted = formatDisplayDate(e.target.value);
            setDisplayValue(formatted);
            
            // Atualizar o valor ISO apenas quando a data estiver completa
            const isoDate = convertToISODate(formatted);
            if (isoDate) {
              onChange(isoDate);
            } else if (formatted === '') {
              onChange('');
            }
          }}
          onBlur={() => {
            // Ao perder o foco, validar e limpar se estiver incompleto
            const isoDate = convertToISODate(displayValue);
            if (!isoDate && displayValue !== '') {
              setDisplayValue('');
              onChange('');
            }
          }}
          placeholder="dd/mm/aaaa"
          maxLength={10}
          inputMode="numeric"
          className={`${iconClass} ${className}`}
        />
      ) : (
        <Input
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`${iconClass} ${className}`}
        />
      )}
    </div>
  );
}
