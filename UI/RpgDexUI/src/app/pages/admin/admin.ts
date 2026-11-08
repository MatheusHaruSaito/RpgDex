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
import { ApiResponse } from '../../../models/apiResponse';

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

  reports: ReportResponse[] = [];
  selectedReport: ReportDetail | null = null;
  totalOpenReports: number = 0;
  isLoadingReports = false;
  showOnlyActive = true;
  currentPage = 1;
  pageSize = 10;

  startDate: string = '2026-01-01';
  endDate: string = '2027-01-01';

  userChartData: ChartResponse | null = null;
  isLoadingUserChart = false;

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

  loadReports(): void {
    this.isLoadingReports = true;
    this.selectedReport = null;
    
    this.reportService.GetAll(this.currentPage, this.pageSize, this.showOnlyActive).subscribe({
      next: (res: ApiResponse<any>) => {
        if (res.success && res.data) {
          this.reports = res.data.reports || [];
          this.totalOpenReports = res.data.count || this.reports.length;
          if (this.reports.length > 0) {
            this.selectReport(this.reports[0].id);
          }
        } else {
          this.reports = [];
        }
        this.isLoadingReports = false;
      },
      error: () => {
        this.reports = [];
        this.isLoadingReports = false;
      },
    });
  }

  toggleReportStatusFilter(isActive: boolean): void {
    if (this.showOnlyActive === isActive) return;
    this.showOnlyActive = isActive;
    this.currentPage = 1;
    this.loadReports();
  }

  selectReport(id: string): void {
    this.reportService.GetById(id).subscribe({
      next: (res: ApiResponse<ReportDetail>) => {
        if (res.success && res.data) {
          this.selectedReport = res.data;
        }
      },
    });
  }

  punishUser(reportId: string): void {
    if (confirm('Deseja aplicar uma penalidade relacionada a este reporte?')) {
      this.reportService.PunishUser({ reportId }).subscribe({
        next: (res: ApiResponse<any>) => {
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
        next: (res: ApiResponse<any>) => {
          if (res.success) {
            alert('Reporte encerrado com sucesso!');
            this.selectedReport = null;
            this.loadReports();
          }
        },
      });
    }
  }

  loadUserChart(): void {
    this.isLoadingUserChart = true;
    this.userService.GetUserChart(this.startDate, this.endDate).subscribe({
      next: (res: ApiResponse<ChartResponse>) => {
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
      next: (res: ApiResponse<ChartResponse>) => {
        if (res.success && res.data) {
          this.characterChartData = res.data;
        }
      },
      error: (err: unknown) => console.error('[Admin] Erro no gráfico de personagens:', err),
    });
  }

  loadCampaignChart(): void {
    this.campaignService.GetCharacterChart(this.startDate, this.endDate).subscribe({
      next: (res: ApiResponse<ChartResponse>) => {
        if (res.success && res.data) {
          this.campaignChartData = res.data;
        }
      },
      error: (err: unknown) => console.error('[Admin] Erro no gráfico de campanhas:', err),
    });
  }

  getSvgPoints(chartData: ChartResponse | null): string {
    if (!chartData || !chartData.points || chartData.points.length === 0) {
      return 'M 0 180 L 700 180';
    }

    const points = chartData.points;
    const values = points.map((p: any) => p.userCount ?? p.count ?? p.value ?? 0);
    const maxVal = Math.max(...values, 1);
    const width = 700;
    const height = 180;

    return points
      .map((pt: any, i: number) => {
        const val = pt.userCount ?? pt.count ?? pt.value ?? 0;
        const x = (i / (points.length - 1 || 1)) * width;
        const y = height - (val / maxVal) * (height - 30) - 15;
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');
  }
}