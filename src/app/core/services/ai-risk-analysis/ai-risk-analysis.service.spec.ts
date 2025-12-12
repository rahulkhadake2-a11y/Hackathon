import { TestBed } from '@angular/core/testing';
import { AIRiskAnalysisService } from './ai-risk-analysis.service';

describe('AIRiskAnalysisService', () => {
  let service: AIRiskAnalysisService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AIRiskAnalysisService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
