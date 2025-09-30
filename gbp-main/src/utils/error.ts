export const handleSupabaseError = (error: any, operation: string) => {
  console.error(`Supabase error during ${operation}:`, error);
  throw new Error(`Failed to ${operation}: ${error.message || 'Unknown error'}`);
}; 