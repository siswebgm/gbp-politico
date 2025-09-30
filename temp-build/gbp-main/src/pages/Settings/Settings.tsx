import React from 'react';
import { Container, Grid, Typography, Box } from '@mui/material';
import { BirthdaySettings } from './components/BirthdaySettings';
import { CategorySettings } from './components/CategorySettings';
import { IndicadoSettings } from './components/IndicadoSettings';

export const Settings: React.FC = () => {
  return (
    <Container maxWidth="lg" className="px-2 sm:px-4">
      <Box py={4}>
        <Typography variant="h4" gutterBottom>
          Configurações
        </Typography>

        <Grid container spacing={3}>
          <Grid item xs={12}>
            <CategorySettings />
          </Grid>

          <Grid item xs={12}>
            <BirthdaySettings />
          </Grid>

          <Grid item xs={12}>
            <IndicadoSettings />
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
};
