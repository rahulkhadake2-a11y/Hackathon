import { Pipe, PipeTransform } from '@angular/core';

interface ItemAnalysis {
  aiAnalyzed?: boolean;
  [key: string]: any;
}

@Pipe({
  name: 'aiAnalyzedCount',
  standalone: true,
  pure: false
})
export class AiAnalyzedCountPipe implements PipeTransform {
  transform(items: ItemAnalysis[]): number {
    if (!items || !Array.isArray(items)) {
      return 0;
    }
    return items.filter(item => item.aiAnalyzed === true).length;
  }
}
