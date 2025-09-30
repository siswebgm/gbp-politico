'use client';

import { useRouter } from 'next/navigation';
import { Card, CardContent, Typography, Grid, Box } from '@mui/material';
import DescriptionIcon from '@mui/icons-material/Description';
import GavelIcon from '@mui/icons-material/Gavel';
import AssignmentIcon from '@mui/icons-material/Assignment';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';

export default function Documentos() {
  const router = useRouter();

  const documentCards = [
    {
      title: 'Ofício',
      description: 'Documentos oficiais e comunicações formais',
      icon: <DescriptionIcon sx={{ fontSize: 40 }} />,
      route: '/app/documentos/oficio',
      color: '#4CAF50' // Verde
    },
    {
      title: 'Projeto de Lei',
      description: 'Propostas legislativas e projetos de lei',
      icon: <GavelIcon sx={{ fontSize: 40 }} />,
      route: '/app/documentos/projeto-lei',
      color: '#2196F3' // Azul
    },
    {
      title: 'Requerimentos',
      description: 'Solicitações e requerimentos diversos',
      icon: <AssignmentIcon sx={{ fontSize: 40 }} />,
      route: '/app/documentos/requerimentos',
      color: '#FF9800' // Laranja
    },
    {
      title: 'Demandas Ruas',
      description: 'Registro e acompanhamento de demandas urbanas',
      icon: <ReportProblemIcon sx={{ fontSize: 40 }} />,
      route: '/app/documentos/demandas-ruas',
      color: '#9C27B0' // Roxo
    }
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Grid 
        container 
        spacing={4}
        sx={{
          mt: 2
        }}
      >
        {documentCards.map((card) => (
          <Grid item xs={12} sm={6} md={4} key={card.title}>
            <Card
              sx={{
                height: '100%',
                cursor: 'pointer',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 6,
                },
                borderTop: `4px solid ${card.color}`
              }}
              onClick={() => router.push(card.route)}
            >
              <CardContent sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                padding: 4
              }}>
                <Box sx={{ 
                  color: card.color,
                  mb: 2
                }}>
                  {card.icon}
                </Box>
                <Typography 
                  variant="h5" 
                  component="h2"
                  sx={{ 
                    mb: 2,
                    fontWeight: 'bold',
                    color: '#333'
                  }}
                >
                  {card.title}
                </Typography>
                <Typography 
                  variant="body1"
                  color="text.secondary"
                >
                  {card.description}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
