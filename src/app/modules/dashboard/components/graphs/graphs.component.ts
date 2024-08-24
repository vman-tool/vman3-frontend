import {
  Component,
  OnInit,
  ChangeDetectorRef,
  effect,
  inject,
} from '@angular/core';
import {
  BubbleDataPoint,
  ChartData,
  ChartOptions,
  ChartType,
  Point,
} from 'chart.js';
import 'chartjs-plugin-datalabels';
import { ChartsService } from '../../services/charts/charts.service';
import { MonthlySubmission } from '../../interface';
import { DataFilterComponent } from '../../../../shared/dialogs/filters/data-filter/data-filter/data-filter.component';
import { MatDialog } from '@angular/material/dialog';
import { FilterService } from '../../../../shared/dialogs/filters/filter.service';

@Component({
  selector: 'app-graphs',
  templateUrl: './graphs.component.html',
  styleUrls: ['./graphs.component.scss'],
})
export class GraphsComponent implements OnInit {
  // startDate?: string;
  // endDate?: string;
  // locations: string[] = [];
  filterData: { locations: string[]; startDate?: string; endDate?: string } = {
    locations: [],
    startDate: undefined,
    endDate: undefined,
  };

  public barChartLabels: string[] = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  public barChartData: any[] = [];
  public doughnutChartData: ChartData<'doughnut'> = {
    labels: ['Neonates', 'Children', 'Adults'],
    datasets: [
      {
        data: [], // Initialize with empty data
        backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56'],
      },
    ],
  };
  public errorMessage: string = '';
  public isLoading: boolean = true; // Loading flag

  constructor(
    public chartsService: ChartsService,
    private cdr: ChangeDetectorRef,

    private filterService: FilterService
  ) {
    this.filterService = inject(FilterService);
    this.setupEffect();
  }
  setupEffect() {
    effect(() => {
      this.filterData = this.filterService.filterData();
      this.loadStatistics();
    });
  }
  ngOnInit() {
    // this.loadStatistics();
  }

  public barChartOptions: ChartOptions = {
    responsive: true,
  };

  public barChartType: ChartType = 'bar';
  public barChartLegend = true;

  // Doughnut Chart
  public doughnutChartOptions: ChartOptions = {
    responsive: true,
    plugins: {
      datalabels: {
        formatter: (value, context) => {
          const total = context.chart.data.datasets[0].data.reduce(
            (
              acc: number,
              currentValue:
                | number
                | [number, number]
                | Point
                | BubbleDataPoint
                | null
            ) => {
              if (typeof currentValue === 'number') {
                return acc + currentValue;
              } else if (Array.isArray(currentValue)) {
                return acc + currentValue[0]; // Assuming the first element is the value
              } else if (currentValue && typeof currentValue === 'object') {
                return acc + (currentValue as Point).x; // Assuming the object has an x property with the value
              }
              return acc;
            },
            0
          );
          const percentage = ((value / total) * 100).toFixed(2) + '%';
          return percentage;
        },
        color: '#fff',
        font: {
          weight: 'bold',
        },
      },
    },
  };
  public doughnutChartLabels = ['Neonates', 'Children', 'Adults'];
  public doughnutChartType: ChartType = 'doughnut';
  public doughnutChartLegend = true;

  processBarChartData(monthly_submissions: MonthlySubmission[]) {
    const yearMap = new Map<number, number[]>();

    // Initialize the yearMap with empty arrays for each year present in the data
    monthly_submissions.forEach((submission) => {
      if (submission.year !== null && submission.month !== null) {
        if (!yearMap.has(submission.year)) {
          yearMap.set(submission.year, new Array(12).fill(0));
        }
        yearMap.get(submission.year)![submission.month - 1] = submission.count;
      }
    });

    // Transform the map into the format required by Chart.js
    this.barChartData = Array.from(yearMap.entries()).map(([year, counts]) => {
      return { data: counts, label: year.toString() };
    });
  }

  loadStatistics() {
    this.isLoading = true; // Set loading to true when starting to fetch data
    this.chartsService
      .getChartfetchStatistics(
        this.filterData.startDate,
        this.filterData.endDate,
        this.filterData.locations
      )
      .subscribe(
        (data) => {
          console.log(data);
          this.processBarChartData(data.data.monthly_submissions);
          this.doughnutChartData = {
            ...this.doughnutChartData, // Keep other properties intact
            datasets: [
              {
                ...this.doughnutChartData.datasets[0], // Keep other properties intact
                data: [
                  data.data.distribution_by_age.neonates,
                  data.data.distribution_by_age.children,
                  data.data.distribution_by_age.adults,
                ],
              },
            ],
          };
          // Process polar area chart data
          this.polarAreaChartData = {
            ...this.polarAreaChartData,
            datasets: [
              {
                ...this.polarAreaChartData.datasets[0],
                data: [
                  data.data.distribution_by_gender.male || 0,
                  data.data.distribution_by_gender.female || 0,
                  data.data.distribution_by_gender.other || 0,
                ],
              },
            ],
          };

          this.isLoading = false; // Set loading to false when data is fetched
          this.cdr.detectChanges(); // Trigger change detection to update the chart
        },
        (error) => {
          this.errorMessage = error.message;
          this.isLoading = false; // Set loading to false if there's an error
        }
      );
  }

  // Explicitly define the type as 'polarArea'
  public polarAreaChartType: ChartType = 'polarArea';

  // Data for the Polar Area Chart
  // Data for the Polar Area Chart
  public polarAreaChartData: ChartData<'polarArea'> = {
    labels: ['Male', 'Female', 'Other'], // Labels for the chart segments
    datasets: [
      {
        data: [0, 0, 0], // Initial empty data
        backgroundColor: ['#36A2EB', '#FF6384', '#FFCE56'], // Segment colors
        borderColor: ['#36A2EB', '#FF6384', '#FFCE56'], // Border colors
        borderWidth: 1, // Border width for segments
      },
    ],
  };

  // Polar Area Chart options
  public polarAreaChartOptions: ChartOptions<'polarArea'> = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      r: {
        beginAtZero: true,
        ticks: {
          callback: (tickValue: number | string) => {
            if (typeof tickValue === 'number') {
              return `${tickValue}%`; // Append percentage sign if it's a number
            }
            return tickValue; // Return as-is if it's not a number (e.g., a string)
          },
        },
      },
    },
    plugins: {
      legend: {
        display: true,
        position: 'bottom',
      },
    },
  };
}
