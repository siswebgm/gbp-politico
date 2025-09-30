import React from 'react';
import { UseFormRegister } from 'react-hook-form';
import InputMask from 'react-input-mask';

interface FormattedInputProps {
  type: string;
  name: string;
  register: UseFormRegister<any>;
  mask?: string;
  label?: string;
  placeholder?: string;
  error?: string;
  icon?: React.ReactNode;
  className?: string;
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
}

export function FormattedInput({
  type,
  name,
  register,
  mask,
  label,
  placeholder,
  error,
  icon,
  className,
  value,
  onChange,
  disabled,
}: FormattedInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onChange) {
      onChange(e.target.value);
    }
  };

  const input = (
    <div className="relative">
      {icon && (
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          {icon}
        </div>
      )}
      {mask ? (
        <InputMask
          type={type}
          mask={mask}
          {...register(name)}
          placeholder={placeholder}
          className={className}
          value={value}
          onChange={handleChange}
          disabled={disabled}
        />
      ) : (
        <input
          type={type}
          {...register(name)}
          placeholder={placeholder}
          className={className}
          value={value}
          onChange={handleChange}
          disabled={disabled}
        />
      )}
    </div>
  );

  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {label}
        </label>
      )}
      {input}
      {error && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}