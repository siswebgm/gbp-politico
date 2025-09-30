import React from 'react';
import { ReportGenerator } from './components/ReportGenerator';
import { DocumentReports } from './components/DocumentReports';
import { BirthdayLabels } from './components/BirthdayLabels';

export function Reports() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Relatórios</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Geração e visualização de relatórios
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <ReportGenerator type="voters" />
        <ReportGenerator type="attendances" />
        <DocumentReports />
        <BirthdayLabels />
      </div>
    </div>
  );
}