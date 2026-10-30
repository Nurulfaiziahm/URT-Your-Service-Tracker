import type { RepairService } from './types';
import { catalogTypeLabels, difficultyLabels } from './catalog';

export function CatalogTypeFields({ entryType, difficultyLevel, onTypeChange, onLevelChange }: {
  entryType: RepairService['entryType']; difficultyLevel: NonNullable<RepairService['difficultyLevel']>;
  onTypeChange: (value: RepairService['entryType']) => void; onLevelChange: (value: NonNullable<RepairService['difficultyLevel']>) => void;
}) {
  return <div className="reference-toolbar"><label>Jenis Katalog<select name="entryType" value={entryType} onChange={(event) => onTypeChange(event.target.value as RepairService['entryType'])}>{Object.entries(catalogTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    {entryType === 'difficulty' && <label>Tingkat Kesulitan<select name="difficultyLevel" value={difficultyLevel} onChange={(event) => onLevelChange(event.target.value as NonNullable<RepairService['difficultyLevel']>)}>{Object.entries(difficultyLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>}
  </div>;
}
