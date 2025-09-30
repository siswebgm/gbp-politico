import React from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Textarea } from '../../../../components/ui/textarea';
import { Select } from '../../../../components/ui/select';
import { useCategories } from '../../../hooks/useCategories';
import { UserBanner } from '../../../components/UserBanner';

export function DisparoMidiaForm({ onSubmit }) {
  const { register, handleSubmit, formState: { errors } } = useForm();
  const { categories } = useCategories('disparo-midia');

  return (
    <div className="space-y-6">
      <UserBanner 
        pageTitle="Disparo de Mídia" 
        pageDescription="Envie mensagens e mídias para seus contatos de forma eficiente e organizada."
      />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Título
          </label>
          <Input
            {...register('titulo', { required: 'Título é obrigatório' })}
            className="mt-1"
            placeholder="Digite o título da mensagem"
          />
          {errors.titulo && (
            <span className="text-sm text-red-500">{errors.titulo.message}</span>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Categoria
          </label>
          <select
            {...register('categoria_id', { required: 'Categoria é obrigatória' })}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md dark:bg-gray-800 dark:border-gray-600 dark:text-white"
          >
            <option value="">Selecione uma categoria</option>
            {categories?.map((category) => (
              <option key={category.id} value={category.id}>
                {category.nome}
              </option>
            ))}
          </select>
          {errors.categoria_id && (
            <span className="text-sm text-red-500">{errors.categoria_id.message}</span>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Mensagem
          </label>
          <Textarea
            {...register('mensagem', { required: 'Mensagem é obrigatória' })}
            className="mt-1"
            rows={4}
            placeholder="Digite sua mensagem"
          />
          {errors.mensagem && (
            <span className="text-sm text-red-500">{errors.mensagem.message}</span>
          )}
        </div>

        <Button type="submit" className="w-full">
          Enviar Mensagem
        </Button>
      </form>
    </div>
  );
}
