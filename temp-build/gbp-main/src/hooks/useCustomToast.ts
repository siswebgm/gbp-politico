import { toast } from "@/components/ui/use-toast";

export function useCustomToast() {
  const showErrorToast = (description: string) => {
    toast({
      title: "Erro",
      description,
      variant: "destructive",
      className: "bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-100 group [&>button]:text-red-500 [&>button]:hover:text-red-700 [&>button]:dark:text-red-400 [&>button]:dark:hover:text-red-200",
      duration: 5000,
    });
  };

  const showSuccessToast = (description: string) => {
    toast({
      title: "Sucesso",
      description,
      variant: "success",
      className: "bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-100 group [&>button]:text-green-500 [&>button]:hover:text-green-700 [&>button]:dark:text-green-400 [&>button]:dark:hover:text-green-200",
      duration: 5000,
    });
  };

  const showWarningToast = (description: string) => {
    toast({
      title: "Atenção",
      description,
      variant: "warning",
      className: "bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-100 group [&>button]:text-yellow-500 [&>button]:hover:text-yellow-700 [&>button]:dark:text-yellow-400 [&>button]:dark:hover:text-yellow-200",
      duration: 5000,
    });
  };

  const showInfoToast = (description: string) => {
    toast({
      title: "Informação",
      description,
      variant: "info",
      className: "bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-100 group [&>button]:text-blue-500 [&>button]:hover:text-blue-700 [&>button]:dark:text-blue-400 [&>button]:dark:hover:text-blue-200",
      duration: 5000,
    });
  };

  return {
    showErrorToast,
    showSuccessToast,
    showWarningToast,
    showInfoToast,
  };
}
