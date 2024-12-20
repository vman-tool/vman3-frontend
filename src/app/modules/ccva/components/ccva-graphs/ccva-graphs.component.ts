import {
  effect,
  HostListener,
  inject,
  Input,
  OnInit,
  ElementRef,
  ViewChild,
} from '@angular/core';
import { Component } from '@angular/core';
import { ChartOptions, ChartType, ChartDataset } from 'chart.js'; // Import NgChartsModule for Chart.js integration
import { CcvaService } from '../../services/ccva.service';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FilterService } from '../../../../shared/services/filter.service';

@Component({
  selector: 'app-ccva-graphs', // Import necessary modules
  templateUrl: './ccva-graphs.component.html',
  styleUrls: ['./ccva-graphs.component.scss'],
})
export class CcvaGraphsComponent implements OnInit {
  @Input() graphData: any;
  @Input() charts: { [key: string]: any } = {}; // Store chart instances
  isDropdownOpen: boolean = false;

  @ViewChild('dropdownMenu') dropdownMenu!: ElementRef;
  public chartLabels: any[] = [];
  public chartData: ChartDataset[] = [];
  selectedSuccessType: string = 'success';
  public barChartType: ChartType = 'bar';
  public barChartLegend = true;
  public isLoading = true;
  total_records: number = 0;
  elapsed_time = '0:00:00';
  created_at: string = '';
  task_id: string = '';
  ccva_graph_db_source: boolean = true;
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
  constructor(
    private ccvaService: CcvaService,
    private filterService: FilterService,
    private route: ActivatedRoute
  ) {
    this.filterService = inject(FilterService);
    this.setupEffect();
  }
  @HostListener('document:click', ['$event'])
  clickout(event: Event) {
    try {
      if (!this.dropdownMenu.nativeElement.contains(event.target)) {
        this.isDropdownOpen = false;
      }
    } catch (e) {}
  }
  toggleDropdown(): void {
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  checkData(): void {
    this.isDropdownOpen = false;
  }

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
            // TODOS: cleare previous code
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
  public barChartData: any[] = [];
  setupEffect() {
    effect(() => {
      this.filterData = this.filterService.filterData();
      this.ngOnInit();
    });
  }
  ngOnInit() {
    this.isLoading = true;
    console.log('CCVA Graphs Component: ngOnInit', this.graphData);

    this.route.params.subscribe((params) => {
      const taskId = params['id']; // Get 'id' from
      this.ccvaService
        .get_ccva_Results(
          taskId,
          this.selectedSuccessType,
          this.filterData.start_date,
          this.filterData.end_date,
          this.filterData.locations,
          this.filterData.date_type,
          this.filterData.ccva_graph_db_source
          // this.ccva_graph_db_source
        )
        .subscribe({
          next: (progressData: any) => {
            console.log('Progress data:', progressData);
            this.graphData = progressData.data;
            this.task_id = progressData.data[0].task_id;

            if (progressData.data[0]) {
              this.total_records = progressData.data[0].total_records;
              this.elapsed_time = progressData.data[0].elapsed_time;
              this.created_at = progressData.data[0].created_at;
            }
            this.loadChartData(progressData.data[0]);
          },
          error: (error) => {
            this.isLoading = false;
            console.error('Error fetching progress:', error);
          },
        });
    });
  }

  loadChartData(data: any) {
    let graphs = data.graphs ?? [];
    for (let key in graphs) {
      console.log('index', graphs[key].index);
      console.log('data', graphs[key]);
      console.log('values', graphs[key].values);
      const chartLabels = graphs[key].index; // Create unique labels for each chart
      const chartData = [
        {
          label: 'csmf',
          data: graphs[key].values,
          backgroundColor: this.getChartColor(key),
          borderWidth: 1,
        },
      ];
      if (chartLabels?.length > 0) {
        this.renderChart(key, chartLabels, chartData);
      }
    }
    this.isLoading = false;
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
      all: 'Distribution of Causes of Deaths for All Populations ',
      male: 'Distribution of Causes of Deaths for Male Population ',
      female: 'Distribution of Causes of Deaths for Female Population ',
      adult: 'Distribution of Causes of Deaths for Adult Population ',
      child: 'Distribution of Causes of Deaths for Child Population ',
      neonate: 'Distribution of Causes of Deaths for Neonate Population ',
    };
    return titles[key] || '';
  }

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
  downloadCsv() {
    this.ccvaService.download_default_ccva(this.task_id);
  }

  toggleCcvaSourceView(event: any) {
    this.ccva_graph_db_source = event.target.checked;
    this.filterData = this.filterService.filterData();
    this.filterData['ccva_graph_db_source'] = this.ccva_graph_db_source;

    this.ngOnInit();
  }

  onFilterChange() {
    this.graphData = [];
    // this.filterService.setFilterData(this.filterData);
    this.filterData = this.filterService.filterData();
    this.ngOnInit();
  }
}
