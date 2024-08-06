// import { Component, OnInit } from '@angular/core';
// import {
//   BubbleDataPoint,
//   ChartData,
//   ChartOptions,
//   ChartType,
//   Point,
// } from 'chart.js';
// import 'chartjs-plugin-datalabels';
// import { ChartsService } from '../../services/charts/charts.service';
// import { MonthlySubmission } from '../../interface';

// @Component({
//   selector: 'app-graphs',
//   templateUrl: './graphs.component.html',
//   styleUrls: ['./graphs.component.scss'],
// })
// export class GraphsComponent implements OnInit {
//   barChartLabels: string[] = [];
//   barChartData: any[] = [];
//   errorMessage: string = '';

//   constructor(public chartsService: ChartsService) {}

//   ngOnInit() {
//     this.loadStatistics();
//   }

//   public barChartOptions: ChartOptions = {
//     responsive: true,
//   };

//   public barChartType: ChartType = 'bar';
//   public barChartLegend = true;

//   // Doughnut Chart
//   public doughnutChartOptions: ChartOptions = {
//     responsive: true,
//     plugins: {
//       datalabels: {
//         formatter: (value, context) => {
//           const total = Number(
//             context.chart.data.datasets[0].data.reduce(
//               (
//                 a: number | [number, number] | Point | BubbleDataPoint | null,
//                 b: number | [number, number] | Point | BubbleDataPoint | null
//               ) => {
//                 if (typeof a === 'number' && typeof b === 'number') {
//                   return a + b;
//                 } else {
//                   return a;
//                 }
//               },
//               0
//             )
//           );
//           const percentage =
//             (
//               (value / (total !== null && total !== undefined ? total : 0)) *
//               100
//             ).toFixed(2) + '%';
//           return percentage;
//         },
//         color: '#fff',
//         font: {
//           weight: 'bold',
//         },
//       },
//     },
//   };
//   public doughnutChartLabels = ['Neonates', 'Children', 'Adults'];
//   public doughnutChartType: ChartType = 'doughnut';
//   public doughnutChartLegend = true;
//   public doughnutChartData: ChartData<'doughnut'> = {
//     labels: ['Neonates', 'Children', 'Adults'],
//     datasets: [
//       {
//         data: [20, 20, 60],
//         backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56'],
//       },
//     ],
//   };

//   processBarChartData(monthly_submissions: MonthlySubmission[]) {
//     // Filter out null month or year entries
//     const validSubmissions = monthly_submissions.filter(
//       (item) => item.month !== null && item.year !== null
//     );

//     const years = Array.from(
//       new Set(validSubmissions.map((item) => item.year))
//     );
//     const labels = Array.from(
//       new Set(validSubmissions.map((item) => item.month))
//     ).sort((a: string, b: string) => Number(a) - Number(b));

//     this.barChartLabels = labels.map((month) => `Month ${month}`);
//     this.barChartData = years.map((year) => {
//       return {
//         data: labels.map((month) => {
//           const submission = validSubmissions.find(
//             (item) => item.year === year && item.month === month
//           );
//           return submission ? submission.count : 0;
//         }),
//         label: year.toString(),
//       };
//     });
//   }

//   loadStatistics(startDate?: string, endDate?: string, locations?: string[]) {
//     this.chartsService
//       .getChartfetchStatistics(startDate, endDate, locations)
//       .subscribe(
//         (data) => {
//           this.processBarChartData(data.data.monthly_submissions);
//           this.doughnutChartData.datasets[0].data = [
//             data.data.distribution_by_age.neonates,
//             data.data.distribution_by_age.children,
//             data.data.distribution_by_age.adults,
//           ];
//         },
//         (error) => {
//           this.errorMessage = error.message;
//         }
//       );
//   }
// }
