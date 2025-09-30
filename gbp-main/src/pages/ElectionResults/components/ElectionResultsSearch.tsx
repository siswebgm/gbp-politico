import React from 'react';
import { Search } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const searchSchema = z.object({
  candidateName: z.string().min(3, 'Digite pelo menos 3 caracteres'),
  electionYear: z.string(),
  position: z.string(),
  state: z.string(),
});

type SearchFormData = z.infer<typeof searchSchema>;

interface ElectionResultsSearchProps {
  onSearch: (data: SearchFormData) => void;
  isLoading: boolean;
}

export function ElectionResultsSearch({ onSearch, isLoading }: ElectionResultsSearchProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SearchFormData>({
    resolver: zodResolver(searchSchema),
    defaultValues: {
      electionYear: '2022',
      position: '',
      state: '',
    },
  });

  return (
    <form onSubmit={handleSubmit(onSearch)} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Nome do Candidato
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              {...register('candidateName')}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="Digite o nome do candidato"
            />
          </div>
          {errors.candidateName && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              {errors.candidateName.message}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Ano da Eleição
          </label>
          <select
            {...register('electionYear')}
            className="block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          >
            <option value="2022">2022</option>
            <option value="2020">2020</option>
            <option value="2018">2018</option>
            <option value="2016">2016</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Cargo
          </label>
          <select
            {...register('position')}
            className="block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          >
            <option value="">Todos os cargos</option>
            <option value="presidente">Presidente</option>
            <option value="governador">Governador</option>
            <option value="senador">Senador</option>
            <option value="deputado_federal">Deputado Federal</option>
            <option value="deputado_estadual">Deputado Estadual</option>
            <option value="prefeito">Prefeito</option>
            <option value="vereador">Vereador</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Estado
          </label>
          <select
            {...register('state')}
            className="block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          >
            <option value="">Todos os estados</option>
            <option value="AC">Acre</option>
            <option value="AL">Alagoas</option>
            <option value="AP">Amapá</option>
            <option value="AM">Amazonas</option>
            <option value="BA">Bahia</option>
            <option value="CE">Ceará</option>
            <option value="DF">Distrito Federal</option>
            <option value="ES">Espírito Santo</option>
            <option value="GO">Goiás</option>
            <option value="MA">Maranhão</option>
            <option value="MT">Mato Grosso</option>
            <option value="MS">Mato Grosso do Sul</option>
            <option value="MG">Minas Gerais</option>
            <option value="PA">Pará</option>
            <option value="PB">Paraíba</option>
            <option value="PR">Paraná</option>
            <option value="PE">Pernambuco</option>
            <option value="PI">Piauí</option>
            <option value="RJ">Rio de Janeiro</option>
            <option value="RN">Rio Grande do Norte</option>
            <option value="RS">Rio Grande do Sul</option>
            <option value="RO">Rondônia</option>
            <option value="RR">Roraima</option>
            <option value="SC">Santa Catarina</option>
            <option value="SP">São Paulo</option>
            <option value="SE">Sergipe</option>
            <option value="TO">Tocantins</option>
          </select>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              Buscando...
            </>
          ) : (
            <>
              <Search className="h-4 w-4 mr-2" />
              Buscar Resultados
            </>
          )}
        </button>
      </div>
    </form>
  );
}