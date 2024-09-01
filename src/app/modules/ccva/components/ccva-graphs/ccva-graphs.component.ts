import { Input, OnInit } from '@angular/core';
import { Component } from '@angular/core';
import { ChartOptions, ChartType, ChartDataset } from 'chart.js'; // Import NgChartsModule for Chart.js integration
import { CcvaService } from '../../services/ccva.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-ccva-graphs', // Import necessary modules
  templateUrl: './ccva-graphs.component.html',
  styleUrls: ['./ccva-graphs.component.scss'],
})
export class CcvaGraphsComponent implements OnInit {
  @Input() charts: { [key: string]: any } = {}; // Store chart instances
  public chartLabels: any[] = [];
  public chartData: ChartDataset[] = [];

  public barChartType: ChartType = 'bar';
  public barChartLegend = true;
  public isLoading = false;

  public chartOptions: ChartOptions = {
    responsive: true,
    indexAxis: 'y',
    maintainAspectRatio: false,
    scales: {
      x: {
        beginAtZero: true,
        ticks: {
          maxRotation: 90,
          minRotation: 45,
          autoSkip: false,
        },
      },
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 10,
        },
      },
    },
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          font: {
            size: 12,
          },
        },
      },
      tooltip: {
        enabled: true,
        callbacks: {
          label: function (context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += context.parsed.y;
            }
            return label;
          },
        },
      },
    },
  };
  public barChartData: any[] = [];
  constructor(private ccvaService: CcvaService) {}

  ngOnInit() {
    this.isLoading = true;
    this.ccvaService.get_ccva_Results().subscribe({
      next: (data: any) => {
        this.isLoading = false;
        this.loadChartData(data.data[0]);
      },
      error: (err) => {
        this.isLoading = false;
        console.error('Failed to load CCVA results', err);
      },
    });
  }

  loadChartData(data: any) {
    console.log('data', data);
    for (let key in data) {
      if (data.hasOwnProperty(key)) {
        console.log('key', data[key].index);
        console.log('data', data[key]);
        const chartLabels = data[key].index; // Create unique labels for each chart
        const chartData = [
          {
            label: 'csmf',
            data: data[key].values,
            backgroundColor: this.getChartColor(key),
            borderWidth: 1,
          },
        ];
        if (chartLabels?.length > 0) {
          this.renderChart(key, chartLabels, chartData);
        }
      }
    }
  }

  getChartColor(key: string): string {
    const colors: any = {
      all: '#4dc9f6',
      male: '#f67019',
      female: '#f53794',
      adult: '#537bc4',
      child: '#acc236',
      neonate: '#166a8f',
    };
    return colors[key] || '#000000';
  }

  renderChart(key: string, labels: any[], datasets: ChartDataset[]) {
    this.charts[key] = {
      labels: labels,
      datasets: datasets,
    };
  }
  get chartKeys(): string[] {
    return Object.keys(this.charts);
  }

  public barChartOptions: ChartOptions = {
    responsive: true,
  };

  getDynamicTitle(key: string): string {
    const titles: { [key: string]: string } = {
      all: 'Top 10 CSMF for All Populations ',
      male: 'Top 10 CSMF for Male Population ',
      female: 'Top 10 CSMF for Female Population ',
      adult: 'Top 10 CSMF for Adult Population ',
      child: 'Top 10 CSMF for Child Population ',
      neonate: 'Top 10 CSMF for Neonate Population ',
    };
    return titles[key] || '';
  }
}
