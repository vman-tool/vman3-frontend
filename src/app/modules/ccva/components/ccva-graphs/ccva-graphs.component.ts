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
import { LocationSelection } from 'app/shared/components/location-tree-select/location-tree-select.component';

@Component({
  standalone: false,
  selector: 'app-ccva-graphs', // Import necessary modules
  templateUrl: './ccva-graphs.component.html',
  styleUrls: ['./ccva-graphs.component.scss'],
})
export class CcvaGraphsComponent implements OnInit {
  @Input() graphData: any;
  @Input() charts: { [key: string]: any } = {}; // Store chart instances
  isDropdownOpen: boolean = false;
  sliderValue: number = 10;
  maxSliderValue: number = 30;
  originalChartData: { [key: string]: any } = {};
  @ViewChild('dropdownMenu') dropdownMenu!: ElementRef;
  public chartLabels: any[] = [];
  public chartData: ChartDataset[] = [];
  selectedSuccessType: string = 'all';
  public barChartType: ChartType = 'bar';
  public barChartLegend = true;
  public isLoading = true;
  total_records: number = 0;
  elapsed_time = '0:00:00';
  created_at: string = '';
  task_id: string = '';
  ccva_graph_db_source: boolean = true;
  // Which GBD groups are shown, toggled by clicking their legend entry -
  // display-only, filters the rendered chart without touching the stored
  // CSMF or recomputing percentages against a smaller denominator.
  includeGroup: { [key: string]: boolean } = {
    communicable: true,
    ncd: true,
    injury: true,
    undetermined: true,
  };
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

  // GBD disease group colors (Global Burden of Disease classification)
  readonly GBD_COLORS = {
    communicable: 'rgba(178, 24, 43, 0.85)',   // Group I  – Communicable, Maternal, Neonatal
    ncd:          'rgba(33, 102, 172, 0.85)',   // Group II – Non-communicable diseases
    injury:       'rgba(35, 139, 69, 0.85)',    // Group III – Injuries
    undetermined: 'rgba(160, 160, 160, 0.75)', // Undetermined / unknown
  };

  private classifyGbd(label: string): keyof typeof this.GBD_COLORS {
    const l = label.toLowerCase();
    if (l.includes('undetermin') || l.includes('unknown')) return 'undetermined';

    // Group III – Injuries
    if (
      l.includes('external cause') || l.includes('injur') || l.includes('accident') ||
      l.includes('assault') || l.includes('self-harm') || l.includes('drowning') ||
      l.includes('poisoning') || l.includes('burn') || l.includes('venomous') ||
      l.includes('traffic') || l.includes('violence') || l.includes('fall')
    ) return 'injury';

    // Group I – Communicable, Maternal, Perinatal, Nutritional
    if (
      l.includes('malaria') || l.includes('measles') || l.includes('tuberc') ||
      l.includes('hiv') || l.includes('aids') || l.includes('sepsis') ||
      l.includes('infectious') || l.includes('parasitic') || l.includes('neonatal') ||
      l.includes('stillbirth') || l.includes('pregnancy') || l.includes('childbirth') ||
      l.includes('maternal') || l.includes('perinatal') || l.includes('pneumonia') ||
      l.includes('diarrh') || l.includes('meningit') || l.includes('hepatitis') ||
      l.includes('nutritional') || l.includes('covid') || l.includes('pertussis') ||
      l.includes('tetanus') || l.includes('dengue') || l.includes('typhoid') ||
      l.includes('cholera') || l.includes('encephalit') || l.includes('haemorrhagic')
    ) return 'communicable';

    // Default: Group II – NCD
    return 'ncd';
  }

  getBarColors(labels: string[]): string[] {
    return labels.map(l => this.GBD_COLORS[this.classifyGbd(l)]);
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
        display: false,
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
  OnSlideChange(): void {
    this.filterGraphData();
  }
  loadChartData(data: any) {
    let graphs = data.graphs ?? [];
    // originalChartData keeps the full, untouched CSMF as returned by the
    // run - the Undeterminants toggle only changes what filterGraphData()
    // renders from it, never this stored copy, so re-toggling never desyncs
    // labels/values or loses data.
    for (let key in graphs) {
      const chartLabels = graphs[key].index;
      if (chartLabels?.length > 0) {
        this.originalChartData[key] = {
          labels: [...chartLabels],
          data: [...graphs[key].values],
        };
      }
    }
    this.filterGraphData();
    this.isLoading = false;
  }

  filterGraphData(): void {
    for (let key in this.originalChartData) {
      if (this.originalChartData[key]) {
        const originalLabels: any[] = [];
        const originalData: any[] = [];
        this.originalChartData[key].labels.forEach((label: string, i: number) => {
          if (this.includeGroup[this.classifyGbd(label)]) {
            originalLabels.push(label);
            originalData.push(this.originalChartData[key].data[i]);
          }
        });

        // Use the sliderValue to determine how many data points to show
        const dataToShow = Math.max(
          1,
          Math.min(this.sliderValue, originalData.length)
        );

        const filteredData = originalData.slice(0, dataToShow);
        const filteredLabels = originalLabels.slice(0, dataToShow);

        const chartData = [
          {
            label: 'csmf',
            data: filteredData,
            backgroundColor: this.getBarColors(filteredLabels),
            borderWidth: 1,
          },
        ];
        this.renderChart(key, filteredLabels, chartData);
      }
    }
  }

  updateCharts(): void {
    for (let key in this.charts) {
      if (this.charts[key] && this.charts[key].chart) {
        this.charts[key].chart.update();
      }
    }
  }

  // loadChartData(data: any) {
  //   let graphs = data.graphs ?? [];
  //   for (let key in graphs) {
  //     console.log('index', graphs[key].index);
  //     console.log('data', graphs[key]);
  //     console.log('values', graphs[key].values);
  //     const chartLabels = graphs[key].index; // Create unique labels for each chart
  //     const chartData = [
  //       {
  //         label: 'csmf',
  //         data: graphs[key].values,
  //         backgroundColor: this.getChartColor(key),
  //         borderWidth: 1,
  //       },
  //     ];
  //     if (chartLabels?.length > 0) {
  //       this.renderChart(key, chartLabels, chartData);
  //     }
  //   }
  //   this.isLoading = false;
  // }

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
  toggleGroup(group: keyof typeof this.GBD_COLORS): void {
    this.includeGroup[group] = !this.includeGroup[group];
    this.filterGraphData();
  }

  onFilterChange() {
    this.graphData = [];
    // this.filterService.setFilterData(this.filterData);
    this.filterData = this.filterService.filterData();
    this.ngOnInit();
  }
}
