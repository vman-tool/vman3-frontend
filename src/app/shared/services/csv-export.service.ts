import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class CsvExportService {
  
  exportToCSV(data: any[], filename: string, headers?: string[]) {
    let csvContent = '';

    const csvHeaders = headers || Object.keys(data[0]);
    csvContent += csvHeaders.join(',') + '\n';

    data.forEach(row => {
      const rowArray = csvHeaders.map(header => {
        let cell = row[header] === null || row[header] === undefined ? '' : row[header];
        
        cell = String(cell);
        if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
          cell = `"${cell.replace(/"/g, '""')}"`;
        }
        return cell;
      });
      
      csvContent += rowArray.join(',') + '\n';
    });

    this.downloadCSV(csvContent, filename);
  }

  createSampleCSV(filename: string, rows: number = 10) {
    const sampleData = [];
    const headers = ['ID', 'Name', 'Email', 'Date', 'Amount'];

    for (let i = 1; i <= rows; i++) {
      sampleData.push({
        ID: i,
        Name: `User ${i}`,
        Email: `user${i}@example.com`,
        Date: new Date().toISOString().split('T')[0],
        Amount: (Math.random() * 1000).toFixed(2)
      });
    }

    this.exportToCSV(sampleData, filename, headers);
  }

  private downloadCSV(csvContent: string, filename: string) {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}