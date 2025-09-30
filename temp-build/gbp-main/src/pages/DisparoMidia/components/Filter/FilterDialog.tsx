import { X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../../components/ui/dialog';
import { Button } from '../../../../components/ui/button';
import { Label } from '../../../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../components/ui/select';
import { useFilterOptions } from '../../hooks/useFilterOptions';

interface FilterDialogProps {
  isOpen: boolean;
  onClose: () => void;
  selectedFilters: FilterOption[];
  onFilterChange: (filters: FilterOption[]) => void;
}

interface FilterOption {
  id: string;
  type: string;
  value: string;
  label: string;
}

export function FilterDialog({
  isOpen,
  onClose,
  selectedFilters,
  onFilterChange,
}: FilterDialogProps) {
  const { categories, cities, neighborhoods, genders } = useFilterOptions();

  console.log('FilterDialog - Dados carregados:', {
    categories: categories.length,
    cities: cities.length,
    neighborhoods: neighborhoods.length,
    genders: genders.length
  });

  const handleFilterChange = (type: string, value: string, label: string) => {
    const newFilter: FilterOption = {
      id: `${type}-${value}`,
      type,
      value,
      label
    };

    const existingFilterIndex = selectedFilters.findIndex(
      filter => filter.type === type && filter.value === value
    );

    if (existingFilterIndex >= 0) {
      // Se o filtro já existe, remove ele
      const newFilters = selectedFilters.filter((_, index) => index !== existingFilterIndex);
      onFilterChange(newFilters);
    } else {
      // Se o filtro não existe, adiciona ele
      onFilterChange([...selectedFilters, newFilter]);
    }
  };

  const isSelected = (type: string, value: string) => {
    return selectedFilters.some(filter => filter.type === type && filter.value === value);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Filtros</span>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Categorias */}
          <div className="grid gap-2">
            <Label htmlFor="categoria">Categoria</Label>
            <Select
              onValueChange={(value) => {
                const category = categories.find(c => c.value === value);
                if (category) {
                  handleFilterChange('categoria', value, category.label);
                }
              }}
              value={selectedFilters.find(f => f.type === 'categoria')?.value}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todas as categorias" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.value} value={category.value}>
                    {category.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Cidades */}
          <div className="grid gap-2">
            <Label htmlFor="cidade">Cidade</Label>
            <Select
              onValueChange={(value) => {
                const city = cities.find(c => c.value === value);
                if (city) {
                  handleFilterChange('cidade', value, city.label);
                }
              }}
              value={selectedFilters.find(f => f.type === 'cidade')?.value}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todas as cidades" />
              </SelectTrigger>
              <SelectContent>
                {cities.map((city) => (
                  <SelectItem key={city.value} value={city.value}>
                    {city.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Bairros */}
          <div className="grid gap-2">
            <Label htmlFor="bairro">Bairro</Label>
            <Select
              onValueChange={(value) => {
                const neighborhood = neighborhoods.find(n => n.value === value);
                if (neighborhood) {
                  handleFilterChange('bairro', value, neighborhood.label);
                }
              }}
              value={selectedFilters.find(f => f.type === 'bairro')?.value}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos os bairros" />
              </SelectTrigger>
              <SelectContent>
                {neighborhoods.map((neighborhood) => (
                  <SelectItem key={neighborhood.value} value={neighborhood.value}>
                    {neighborhood.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Gênero */}
          <div className="grid gap-2">
            <Label htmlFor="genero">Gênero</Label>
            <Select
              onValueChange={(value) => {
                const gender = genders.find(g => g.value === value);
                if (gender) {
                  handleFilterChange('genero', value, gender.label);
                }
              }}
              value={selectedFilters.find(f => f.type === 'genero')?.value}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos os gêneros" />
              </SelectTrigger>
              <SelectContent>
                {genders.map((gender) => (
                  <SelectItem key={gender.value} value={gender.value}>
                    {gender.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
