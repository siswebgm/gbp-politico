import { FormControl, InputLabel, MenuItem, Select, SelectProps } from '@mui/material';
import { Controller, Control } from 'react-hook-form';
import { useCategories } from '../../../hooks/useCategories';

interface CategorySelectProps extends Omit<SelectProps, 'value' | 'onChange'> {
  control: Control<any>;
  name: string;
  label?: string;
  required?: boolean;
}

export function CategorySelect({ control, name, label = 'Categoria', required = false, ...rest }: CategorySelectProps) {
  const { data: categorias, isLoading, error } = useCategories();

  if (isLoading) {
    return <Select disabled label={label} />;
  }

  if (error) {
    console.error('Erro ao carregar categorias:', error);
    return <Select disabled label={label} error />;
  }

  return (
    <Controller
      name={name}
      control={control}
      rules={{ required }}
      render={({ field, fieldState: { error } }) => (
        <FormControl fullWidth error={!!error}>
          <InputLabel>{label}</InputLabel>
          <Select {...field} {...rest} label={label}>
            {categorias?.map((categoria) => (
              <MenuItem key={categoria.uid} value={categoria.uid}>
                {categoria.nome}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}
    />
  );
}