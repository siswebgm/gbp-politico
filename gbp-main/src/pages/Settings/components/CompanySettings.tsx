import { useState, useEffect } from 'react';
import { supabaseClient } from '../../../lib/supabase';
import { useAuth } from '../../../providers/AuthProvider';
import { useCompanyStore } from '../../../store/useCompanyStore';
import { useToast } from '../../../components/ui/use-toast';
import { useCep } from '../../../hooks/useCep';
import {
  Save,
  Loader2,
  AlertCircle,
  CheckCircle,
  MapPin,
  Mail,
  Phone,
  Image as ImageIcon,
  Upload
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Label } from '../../../components/ui/label';
import { Input } from '../../../components/ui/input';
import { Card } from '../../../components/ui/card';

export function CompanySettings() {
  const { user } = useAuth();
  const company = useCompanyStore((state) => state.company);
  const setCompanyStore = useCompanyStore((state) => state.setCompany);
  const { toast } = useToast();
  const { fetchAddress, isLoading: isLoadingCep } = useCep();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Campos editáveis
  const [nome, setNome] = useState('');
  const [logo, setLogo] = useState('');
  const [contato, setContato] = useState('');
  const [email, setEmail] = useState('');
  const [cep, setCep] = useState('');
  const [logradouro, setLogradouro] = useState('');
  const [bairro, setBairro] = useState('');
  const [cidade, setCidade] = useState('');
  const [estado, setEstado] = useState('');
  const [numero, setNumero] = useState('');
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Carregar dados da empresa
  useEffect(() => {
    loadCompanyData();
  }, [company?.uid]);

  const loadCompanyData = async () => {
    if (!company?.uid) return;

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabaseClient
        .from('gbp_empresas')
        .select('*')
        .eq('uid', company.uid)
        .single();

      if (fetchError) throw fetchError;

      if (data) {
        setNome(data.nome || '');
        setLogo(data.logo || '');
        setContato(data.contato || '');
        setEmail(data.email || '');
        const cepValue = data.cep || '';
        const cepFormatted = cepValue.replace(/(\d{5})(\d)/, '$1-$2');
        setCep(cepFormatted);
        setLogradouro(data.logradouro || '');
        setBairro(data.bairro || '');
        setCidade(data.cidade || '');
        setEstado(data.estado || '');
        setNumero(data.numero || '');
      }
    } catch (err) {
      console.error('Erro ao carregar dados da empresa:', err);
      setError('Erro ao carregar dados da empresa');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCepChange = async (value: string) => {
    const cepClean = value.replace(/\D/g, '');
    const cepFormatted = cepClean.replace(/(\d{5})(\d)/, '$1-$2');
    setCep(cepFormatted);

    if (cepClean.length === 8) {
      const cepData = await fetchAddress(cepClean);
      if (cepData) {
        setLogradouro(cepData.logradouro || '');
        setBairro(cepData.bairro || '');
        setCidade(cepData.localidade || '');
        setEstado(cepData.uf || '');
      }
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !company?.uid) return;

    setUploadingLogo(true);
    try {
      const fileName = `logo-${Date.now()}.${file.name.split('.').pop()}`;
      const filePath = `logos/${company.uid}/${fileName}`;

      const { error: uploadError } = await supabaseClient.storage
        .from('arquivo_jmapps')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabaseClient.storage
        .from('arquivo_jmapps')
        .getPublicUrl(filePath);

      setLogo(data.publicUrl);
      toast({
        title: 'Logo atualizado com sucesso!',
        description: 'A imagem foi carregada.',
      });
    } catch (err) {
      console.error('Erro ao fazer upload:', err);
      toast({
        title: 'Erro ao fazer upload',
        description: 'Não foi possível carregar a imagem.',
        variant: 'destructive',
      });
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSave = async () => {
    if (!company?.uid) return;

    setIsSaving(true);
    setError(null);

    try {
      const cepClean = cep.replace(/\D/g, '');
      const { error: updateError } = await supabaseClient
        .from('gbp_empresas')
        .update({
          nome,
          logo,
          contato,
          email,
          cep: cepClean,
          logradouro,
          bairro,
          cidade,
          estado: estado,
          numero,
        })
        .eq('uid', company.uid);

      if (updateError) throw updateError;

      // Atualizar store local
      setCompanyStore({
        ...company,
        nome,
        logo,
        contato,
        email,
        cep: cepClean,
        logradouro,
        bairro,
        cidade,
        estado: estado,
        numero,
      });

      toast({
        title: 'Configuração salva com sucesso!',
        description: 'Os dados da empresa foram atualizados.',
      });
    } catch (err) {
      console.error('Erro ao salvar configurações:', err);
      setError('Erro ao salvar configurações');
      toast({
        title: 'Erro ao salvar',
        description: 'Tente novamente mais tarde.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <Card className="p-4 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
          <div className="flex items-center gap-3 text-red-800 dark:text-red-300">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        </Card>
      )}

      {/* Form */}
      <div className="space-y-6">
        {/* Logo */}
        <div className="space-y-3">
          <Label htmlFor="logo" className="text-sm font-semibold text-gray-900 dark:text-white">
            Logo da Empresa
          </Label>
          <div className="flex items-start gap-4">
            {logo && (
              <div className="h-24 w-24 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex-shrink-0">
                <img 
                  src={logo} 
                  alt="Logo" 
                  className="h-full w-full object-contain"
                />
              </div>
            )}
            <div className="flex-1">
              <div className="relative">
                <Input
                  id="logo"
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  disabled={uploadingLogo}
                  className="cursor-pointer"
                />
                {uploadingLogo && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-gray-800/80 rounded-md">
                    <Loader2 className="h-5 w-5 animate-spin text-gray-600" />
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
                Formatos aceitos: PNG, JPG, JPEG. Tamanho máximo: 5MB.
              </p>
            </div>
          </div>
        </div>

        {/* Nome */}
        <div className="space-y-2">
          <Label htmlFor="nome" className="text-sm font-semibold text-gray-900 dark:text-white">
            Nome da Empresa
          </Label>
          <Input
            id="nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex: Gabinete do Vereador João Silva"
            disabled={isSaving}
          />
        </div>

        {/* Contato e Email */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="contato" className="text-sm font-semibold text-gray-900 dark:text-white">
              Telefone de Contato
            </Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="contato"
                value={contato}
                onChange={(e) => setContato(e.target.value)}
                placeholder="(00) 00000-0000"
                className="pl-10"
                disabled={isSaving}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-semibold text-gray-900 dark:text-white">
              E-mail
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="contato@empresa.com.br"
                className="pl-10"
                disabled={isSaving}
              />
            </div>
          </div>
        </div>

        {/* Endereço */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              Endereço
            </h3>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cep" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              CEP
            </Label>
            <Input
              id="cep"
              value={cep}
              onChange={(e) => handleCepChange(e.target.value)}
              placeholder="00000-000"
              maxLength={9}
              disabled={isSaving || isLoadingCep}
              className={isLoadingCep ? 'border-blue-500' : ''}
            />
            {isLoadingCep && (
              <p className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                Buscando endereço...
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="logradouro" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Logradouro
              </Label>
              <Input
                id="logradouro"
                value={logradouro}
                onChange={(e) => setLogradouro(e.target.value)}
                placeholder="Rua, Avenida, etc."
                disabled={isSaving}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="numero" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Número
              </Label>
              <Input
                id="numero"
                value={numero}
                onChange={(e) => setNumero(e.target.value)}
                placeholder="123"
                disabled={isSaving}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bairro" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Bairro
              </Label>
              <Input
                id="bairro"
                value={bairro}
                onChange={(e) => setBairro(e.target.value)}
                placeholder="Centro"
                disabled={isSaving}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cidade" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Cidade
              </Label>
              <Input
                id="cidade"
                value={cidade}
                onChange={(e) => setCidade(e.target.value)}
                placeholder="São Paulo"
                disabled={isSaving}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="estado" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                UF
              </Label>
              <Input
                id="estado"
                value={estado}
                onChange={(e) => setEstado(e.target.value.toUpperCase())}
                placeholder="SP"
                maxLength={2}
                disabled={isSaving}
              />
            </div>
          </div>
        </div>

        {/* Botão Salvar */}
        <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="min-w-[140px]"
          >
 {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Salvar Alterações
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
