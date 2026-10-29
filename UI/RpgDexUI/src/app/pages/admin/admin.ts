import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReportService } from '../../services/report-service';
import { UserService } from '../../services/user-service';
import { CampaignService } from '../../services/campaign-service';
import { CharacterService } from '../../services/character-service';
import { ReportDetail } from '../../../models/reportDetailBase';
import { ChartResponse } from '../../../models/chartResponse';
import { ReportType } from '../../../models/reportType';
import { ReportResponse } from '../../../models/reportResponse';

export type AdminTab = 'reportes' | 'usuarios' | 'personagens' | 'campanhas' | 'pagamentos';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin.html',
  styleUrls: ['./admin.css'],
})
export class AdminComponent implements OnInit {
  private reportService = inject(ReportService);
  private userService = inject(UserService);
  private campaignService = inject(CampaignService);
  private characterService = inject(CharacterService);

  public ReportType = ReportType;
  activeTab: AdminTab = 'reportes';

  // ── ABA REPORTES ──
  reports: ReportResponse[] = [];
  selectedReport: ReportDetail | null = null;
  totalOpenReports: number = 0;
  isLoadingReports = false;
  currentPage = 1;
  pageSize = 10;

  // ── ABA USUÁRIOS & MÉTRICAS ──
  startDate: string = '2026-01-01';
  endDate: string = '2027-01-01';

  userChartData: ChartResponse | null = null;
  isLoadingUserChart = false;

  // ── ABA PERSONAGENS & CAMPANHAS ──
  characterChartData: ChartResponse | null = null;
  campaignChartData: ChartResponse | null = null;

  ngOnInit(): void {
    this.loadReports();
  }

  setTab(tab: AdminTab): void {
    this.activeTab = tab;
    if (tab === 'reportes') {
      this.loadReports();
    } else if (tab === 'usuarios') {
      this.loadUserChart();
    } else if (tab === 'personagens') {
      this.loadCharacterChart();
    } else if (tab === 'campanhas') {
      this.loadCampaignChart();
    }
  }

  // ── REPORTES ──
  loadReports(): void {
    this.isLoadingReports = true;
    this.reportService.GetAll(this.currentPage, this.pageSize).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.reports = res.data.reports || [];
          this.totalOpenReports = res.data.count || this.reports.length;
          if (this.reports.length > 0 && !this.selectedReport) {
            this.selectReport(this.reports[0].id);
          }
        }
        this.isLoadingReports = false;
      },
      error: () => (this.isLoadingReports = false),
    });
  }

  selectReport(id: string): void {
    this.reportService.GetById(id).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.selectedReport = res.data;
        }
      },
    });
  }

  punishUser(reportId: string): void {
    if (confirm('Deseja aplicar uma penalidade relacionada com este reporte?')) {
      this.reportService.PunishUser({ reportId }).subscribe({
        next: (res) => {
          if (res.success) {
            alert('Penalização aplicada com sucesso!');
            this.loadReports();
          }
        },
      });
    }
  }

  closeReport(reportId: string): void {
    if (confirm('Tem certeza de que deseja fechar esta denúncia?')) {
      this.reportService.Close({ reportId }).subscribe({
        next: (res) => {
          if (res.success) {
            alert('Reporte encerrado com sucesso!');
            this.selectedReport = null;
            this.loadReports();
          }
        },
      });
    }
  }

  // ── GRÁFICOS E MÉTRICAS ──
  loadUserChart(): void {
    this.isLoadingUserChart = true;
    this.userService.GetUserChart(this.startDate, this.endDate).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.userChartData = res.data;
        }
        this.isLoadingUserChart = false;
      },
      error: () => (this.isLoadingUserChart = false),
    });
  }

  loadCharacterChart(): void {
    this.characterService.GetCharacterChart(this.startDate, this.endDate).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.characterChartData = res.data;
        }
      },
    });
  }

  loadCampaignChart(): void {
    this.campaignService.GetCharacterChart(this.startDate, this.endDate).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.campaignChartData = res.data;
        }
      },
    });
  }

  getSvgPoints(chartData: ChartResponse | null): string {
    if (!chartData || !chartData.points || chartData.points.length === 0) {
      return 'M 0 180 L 700 180';
    }

    const points = chartData.points;
    const maxVal = Math.max(...points.map((p) => p.userCount), 1);
    const width = 700;
    const height = 180;

    return points
      .map((pt, i) => {
        const x = (i / (points.length - 1 || 1)) * width;
        const y = height - (pt.userCount / maxVal) * (height - 20);
        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
      })
      .join(' ');
  }
}