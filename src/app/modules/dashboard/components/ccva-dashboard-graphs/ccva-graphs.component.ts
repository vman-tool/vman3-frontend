import { effect, inject, Input, OnInit } from '@angular/core';
import { Component } from '@angular/core';
import { ChartOptions, ChartType, ChartDataset } from 'chart.js'; // Import NgChartsModule for Chart.js integration
import { CcvaService } from '../../../ccva/services/ccva.service';
import { FilterService } from '../../../../shared/services/filter.service';
import { LocationSelection } from 'app/shared/components/location-tree-select/location-tree-select.component';

@Component({
  standalone: false,
  selector: 'app-ccva-dashboard-graphs',
  templateUrl: './ccva-graphs.component.html',
  styleUrls: ['./ccva-graphs.component.scss'],
})
export class CcvaDashboardGraphsComponent implements OnInit {
  @Input() graphData: any;
  @Input() charts: { [key: string]: any } = {}; // Store chart instances
  public chartLabels: any[] = [];
  public chartData: ChartDataset[] = [];
  ccva_graph_db_source: boolean = true;
  public barChartType: ChartType = 'bar';
  public barChartLegend = true;
  public isLoading = true;
  total_records: number = 0;
  elapsed_time = '0:00:00';
  created_at: string = '';
  filterData: {
    locations: LocationSelection[];
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
  // All 6 charts, shown at once (no more gender/age toggle) - a plain field
  // set once per data load rather than a getter, since a getter returning a
  // new array every change-detection pass made *ngFor tear down and rebuild
  // every chart's canvas on each cycle, which is what caused the toggle's
  // visible flicker/scroll-jump.
  public chartKeys: string[] = [];

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
        null,
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
      const chartLabels = graphs[key].index; // Create unique labels for each chart
      const chartData = [
        {
          label: 'csmf',
          data: graphs[key].values,
          backgroundColor: this.getChartColor(key),
          borderWidth: 1,
        },
      ];
      this.renderChart(key, chartLabels, chartData);
    }
    // Fixed display order (gender-based charts, then age-group ones) - only
    // the keys that actually rendered, since a sparse data set may be
    // missing one (e.g. no neonate deaths recorded).
    this.chartKeys = [...this.genderKeys, ...this.ageGroupKeys].filter((key) => key in this.charts);
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

  toggleCcvaSourceView(event: any) {
    this.ccva_graph_db_source = event.target.checked;
    this.filterData = this.filterService.filterData();
    this.filterData['ccva_graph_db_source'] = this.ccva_graph_db_source;
    this.loadGraphData();
  }

  // Same title on every chart - only the demographic group (subtitle)
  // differs, so it reads as one title + a small second line rather than a
  // single long sentence repeated six times.
  readonly chartTitle = 'Distribution of Causes of Death';

  private readonly chartSubtitles: { [key: string]: string } = {
    all: 'All',
    male: 'Male',
    female: 'Female',
    adult: 'Adult Population',
    child: 'Child Population',
    neonate: 'Neonate Population',
  };

  getChartSubtitle(key: string): string {
    return this.chartSubtitles[key] || '';
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

  trackByKey(index: number, key: string): string {
    return key;
  }
}
