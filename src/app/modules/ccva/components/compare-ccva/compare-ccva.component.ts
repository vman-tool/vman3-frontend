import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';
import { forkJoin } from 'rxjs';
import { ChartOptions } from 'chart.js';
import { CcvaService } from '../../services/ccva.service';

interface RunMeta {
  algorithm: string;
  created_at: string;
  total_records: number;
  elapsed_time: string;
}

interface GroupChart {
  labels: string[];
  datasets: any[];
}

@Component({
  standalone: false,
  selector: 'app-compare-ccva',
  templateUrl: './compare-ccva.component.html',
})
export class CompareCcvaComponent implements OnInit {
  isLoading = true;
  error = false;

  meta1: RunMeta | null = null;
  meta2: RunMeta | null = null;
  charts1: { [key: string]: GroupChart } = {};
  charts2: { [key: string]: GroupChart } = {};

  readonly GROUPS = ['all', 'adult', 'child', 'neonate', 'male', 'female'];

  readonly GROUP_TITLES: { [key: string]: string } = {
    all:     'All Populations',
    adult:   'Adults',
    child:   'Children',
    neonate: 'Neonates',
    male:    'Male',
    female:  'Female',
  };

  readonly ALGO_LABELS: { [key: string]: string } = {
    VManML10: 'VMan ML 1.0',
    InterVA5: 'InterVA5',
  };

  readonly GBD_COLORS = {
    communicable: 'rgba(178, 24, 43, 0.85)',
    ncd:          'rgba(33, 102, 172, 0.85)',
    injury:       'rgba(35, 139, 69, 0.85)',
    undetermined: 'rgba(160, 160, 160, 0.75)',
  };

  public chartOptions: ChartOptions = {
    responsive: true,
    indexAxis: 'y',
    maintainAspectRatio: false,
    scales: {
      x: { beginAtZero: true, ticks: { maxTicksLimit: 6 } },
      y: { ticks: { font: { size: 11 } } },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context) => {
            const value = context.raw as number;
            const total = (context.dataset.data as number[]).reduce((a, v) => a + v, 0);
            const pct = total > 0 ? ((value / total) * 100).toFixed(1) + '%' : '0%';
            return `${value.toLocaleString()} (${pct})`;
          },
        },
      },
    },
  };

  constructor(
    private route: ActivatedRoute,
    private ccvaService: CcvaService,
    public location: Location,
  ) {}

  ngOnInit(): void {
    const id1   = this.route.snapshot.params['id1'];
    const id2   = this.route.snapshot.params['id2'];
    const algo1 = this.route.snapshot.queryParams['algo1'] ?? '';
    const algo2 = this.route.snapshot.queryParams['algo2'] ?? '';

    forkJoin([
      this.ccvaService.get_ccva_Results(id1),
      this.ccvaService.get_ccva_Results(id2),
    ]).subscribe({
      next: ([res1, res2]: any) => {
        const d1 = res1.data?.[0];
        const d2 = res2.data?.[0];
        if (!d1 || !d2) { this.error = true; this.isLoading = false; return; }

        this.meta1 = {
          algorithm:     algo1 || d1.algorithm || '',
          created_at:    d1.created_at ?? '',
          total_records: d1.total_records ?? 0,
          elapsed_time:  d1.elapsed_time ?? '',
        };
        this.meta2 = {
          algorithm:     algo2 || d2.algorithm || '',
          created_at:    d2.created_at ?? '',
          total_records: d2.total_records ?? 0,
          elapsed_time:  d2.elapsed_time ?? '',
        };

        this.charts1 = this.buildCharts(d1.graphs ?? {});
        this.charts2 = this.buildCharts(d2.graphs ?? {});
        this.isLoading = false;
      },
      error: () => { this.error = true; this.isLoading = false; },
    });
  }

  private buildCharts(graphs: any): { [key: string]: GroupChart } {
    const result: { [key: string]: GroupChart } = {};
    for (const key of this.GROUPS) {
      const g = graphs[key];
      if (!g?.index?.length) continue;

      const paired: { label: string; value: number }[] =
        (g.index as string[]).map((label: string, i: number) => ({ label, value: g.values[i] ?? 0 }));
      paired.sort((a, b) => b.value - a.value);
      const top = paired.slice(0, 15);

      const labels = top.map(p => p.label);
      result[key] = {
        labels,
        datasets: [{
          label: 'CSMF',
          data: top.map(p => p.value),
          backgroundColor: labels.map(l => this.GBD_COLORS[this.classifyGbd(l)]),
          borderWidth: 1,
        }],
      };
    }
    return result;
  }

  private classifyGbd(label: string): keyof typeof this.GBD_COLORS {
    const l = label.toLowerCase();
    if (l.includes('undetermined') || l.includes('unknown')) return 'undetermined';
    if (
      l.includes('external cause') || l.includes('injur') || l.includes('accident') ||
      l.includes('assault') || l.includes('self-harm') || l.includes('drowning') ||
      l.includes('poisoning') || l.includes('burn') || l.includes('venomous') ||
      l.includes('traffic') || l.includes('violence') || l.includes('fall')
    ) return 'injury';
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
    return 'ncd';
  }

  get activeGroups(): string[] {
    return this.GROUPS.filter(g => this.charts1[g] || this.charts2[g]);
  }

  algoLabel(algorithm: string): string {
    return this.ALGO_LABELS[algorithm] ?? algorithm;
  }
}