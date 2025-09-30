import { useState, useEffect } from 'react';
import { Input } from './input';

interface MaskedInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  mask?: 'currency' | 'cnpj';
  value: string | number | undefined;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
}

export function CurrencyInput({ value, onChange, ...props }: MaskedInputProps) {
  const [formattedValue, setFormattedValue] = useState('');

  useEffect(() => {
    if (value !== undefined) {
      const numberValue = parseFloat(String(value) || '0');
      if (!isNaN(numberValue)) {
        setFormattedValue(numberValue.toLocaleString('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        }));
      } else {
        setFormattedValue('');
      }
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    const cleanValue = inputValue.replace(/[^0-9]/g, '');
    
    if (cleanValue.length > 12) return; // Limita a 12 dígitos (999.999.999,99)

    const numberValue = parseFloat(cleanValue) / 100;
    const formatted = numberValue.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });

    setFormattedValue(formatted);
    onChange({ ...e, target: { ...e.target, value: numberValue.toString() } });
  };

  return (
    <Input
      {...props}
      value={formattedValue || ''}
      onChange={handleChange}
      placeholder="R$ 0,00"
    />
  );
}

export function CNPJInput({ value, onChange, ...props }: MaskedInputProps) {
  const [formattedValue, setFormattedValue] = useState('');

  useEffect(() => {
    if (value) {
      const rawValue = String(value).replace(/[^0-9]/g, '');
      if (rawValue.length >= 14) {
        setFormattedValue(
          `${rawValue.slice(0, 2)}.${rawValue.slice(2, 5)}.${rawValue.slice(5, 8)}/${rawValue.slice(8, 12)}-${rawValue.slice(12, 14)}`
        );
      } else {
        setFormattedValue(rawValue);
      }
    } else {
      setFormattedValue('');
    }
  }, [value]);

  return (
    <Input
      {...props}
      value={formattedValue}
      onChange={(e) => {
        const rawValue = e.target.value.replace(/[^0-9]/g, '');
        onChange(e);
      }}
      placeholder="00.000.000/0000-00"
    />
  );
}
