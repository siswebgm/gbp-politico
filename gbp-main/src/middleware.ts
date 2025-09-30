import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Lista de rotas públicas
const publicRoutes = ['/cadastro', '/api/submit-public-form'];

export function middleware(request: NextRequest) {
  // Verifica se a rota atual está na lista de rotas públicas
  const isPublicRoute = publicRoutes.some(route => 
    request.nextUrl.pathname.startsWith(route)
  );

  if (isPublicRoute) {
    // Se for uma rota pública, permite o acesso
    return NextResponse.next();
  }

  // Para todas as outras rotas, mantém o comportamento padrão
  return NextResponse.next();
}
