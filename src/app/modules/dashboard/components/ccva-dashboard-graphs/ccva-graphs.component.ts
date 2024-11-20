import { effect, inject, Input, OnInit } from '@angular/core';
import { Component } from '@angular/core';
import { ChartOptions, ChartType, ChartDataset } from 'chart.js'; // Import NgChartsModule for Chart.js integration
import { CcvaService } from '../../../ccva/services/ccva.service';
import { FilterService } from '../../../../shared/services/filter.service';

@Component({
  selector: 'app-ccva-dashboard-graphs',
  templateUrl: './ccva-graphs.component.html',
  styleUrls: ['./ccva-graphs.component.scss'],
})
export class CcvaDashboardGraphsComponent implements OnInit {
  @Input() graphData: any;
  @Input() charts: { [key: string]: any } = {}; // Store chart instances
  public chartLabels: any[] = [];
  public chartData: ChartDataset[] = [];
  selectedView: 'gender' | 'age' = 'gender'; // Default to 'By Gender'
  ccva_graph_db_source: boolean = true;
  public barChartType: ChartType = 'bar';
  public barChartLegend = true;
  public isLoading = true;
  total_records: number = 0;
  elapsed_time = '0:00:00';
  created_at: string = '';
  filterData: {
    locations: string[];
    start_date?: string;
    end_date?: string;
    date_type?: string;
    ccva_graph_db_source: boolean;
  } = {
    locations: [],
    start_date: undefined,
    end_date: undefined,
    date_type: undefined,
    ccva_graph_db_source: true,
  };
  public genderKeys: string[] = ['all', 'male', 'female']; // Keys for gender-based charts
  public ageGroupKeys: string[] = ['adult', 'child', 'neonate']; // Keys for age-group-based charts

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
            let label = context.label || '';
            const value = context.raw || 0;
            const total = context.dataset.data.reduce(
              (acc: number, val: any) => acc + val,
              0
            );

            const percentage =
              ((Number(value) / (Number(total) ?? 0)) * 100).toFixed(2) + '%';

            return `${(
              context.dataset.label ?? 'Unknown'
            ).toUpperCase()}: ${value.toLocaleString()} (${percentage})`;
            // TODOS: clear previous code
            // let label = context.dataset.label || '';
            // if (label) {
            //   label += ': ';
            // }
            // if (context.parsed.y !== null) {
            //   label += context.parsed.y;
            // }
            // return label;
          },
        },
      },
    },
  };

  constructor(
    private ccvaService: CcvaService,
    private filterService: FilterService
  ) {
    this.filterService = inject(FilterService);
    this.setupEffect();
  }
  loadGraphData() {
    this.isLoading = true;
    this.ccvaService
      .get_ccva_Results(
        '',
        this.filterData.start_date,
        this.filterData.end_date,
        this.filterData.locations,
        this.filterData.date_type,
        this.filterData.ccva_graph_db_source
      )
      .subscribe({
        next: (data: any) => {
          this.isLoading = false;
          console.log('CCVA results', data);
          if (data.data[0]) {
            this.total_records = data.data[0].total_records;
            this.elapsed_time = data.data[0].elapsed_time;
            this.created_at = data.data[0].created_at;
          }
          this.loadChartData(data.data[0]);
        },
        error: (err) => {
          this.isLoading = false;
          console.error('Failed to load CCVA results', err);
        },
      });
  }

  ngOnInit() {
    this.filterData = {
      locations: [],
      start_date: undefined,
      end_date: undefined,
      date_type: undefined,
      ccva_graph_db_source: true,
    };
  }

  setupEffect() {
    effect(() => {
      this.filterData = this.filterService.filterData();
      this.loadGraphData();
    });
  }

  loadChartData(data: any) {
    let graphs = data.graphs ?? [];
    for (let key in graphs) {
      console.log('keyss', key, graphs[key]);
      ['all', 'adults', 'childs'].includes(key);
      // if (graphs.hasOwnProperty(key)) {
      const chartLabels = graphs[key].index; // Create unique labels for each chart
      const chartData = [
        {
          label: 'csmf',
          data: graphs[key].values,
          backgroundColor: this.getChartColor(key),
          borderWidth: 1,
        },
      ];
      // if (chartLabels?.length > 0) {
      this.renderChart(key, chartLabels, chartData);
      // }
      // }
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

  // renderChart(key: string, labels: any[], datasets: ChartDataset[]) {
  //   this.charts[key] = {
  //     labels: labels,
  //     datasets: datasets,
  //   };
  // }

  renderChart(key: string, labels: any[], datasets: ChartDataset[]) {
    this.charts[key] = {
      labels: labels,
      datasets: datasets,
      id: `chart-${key}`, // Assign a unique ID
    };
  }

  // Toggle the view between 'gender' and 'age' when the checkbox is checked/unchecked
  toggleView(event: any) {
    this.selectedView = event.target.checked ? 'age' : 'gender';
  }
  toggleCcvaSourceView(event: any) {
    this.ccva_graph_db_source = event.target.checked;
    this.filterData = this.filterService.filterData();
    this.filterData['ccva_graph_db_source'] = this.ccva_graph_db_source;
    this.loadGraphData();
  }

  get chartKeys(): string[] {
    // Return keys based on the selected view (gender or age)
    if (this.selectedView === 'gender') {
      return this.genderKeys.filter((key) => key in this.charts);
    } else {
      return this.ageGroupKeys.filter((key) => key in this.charts);
    }
  }

  getDynamicTitle(key: string): string {
    const titles: { [key: string]: string } = {
      all: 'Distribution of Causes of Deaths for All Populations ',
      male: 'Distribution of Causes of Deaths for Male Population ',
      female: 'Distribution of Causes of Deaths for Female Population ',
      adult: 'Distribution of Causes of Deaths for Adult Population ',
      child: 'Distribution of Causes of Deaths for Child Population ',
      neonate: 'Distribution of Causes of Deaths for Neonate Population ',
    };
    return titles[key] || '';
  }
  // Function to download the chart
  downloadChart(key: string) {
    const chartContainerId = `chart-${key}`; // Construct the chart container ID dynamically
    const chartElement = document.querySelector(
      `#${chartContainerId} canvas`
    ) as HTMLCanvasElement; // Find the canvas inside the chart container

    if (chartElement) {
      const imageURL = chartElement.toDataURL('image/png'); // Convert the canvas to a base64 image
      const link = document.createElement('a');
      link.href = imageURL; // Set the href to the base64 image URL
      link.download = `${key}-chart.png`; // Set the filename
      link.click(); // Trigger the download
    } else {
      console.error('Chart canvas not found for', key);
    }
  }
}
