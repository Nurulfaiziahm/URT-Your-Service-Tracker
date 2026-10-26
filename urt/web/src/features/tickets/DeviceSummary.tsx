import type { DeviceInfo } from './types';
import styles from './Tickets.module.css';

export function DeviceSummary({ device }: { device: DeviceInfo }) {
  return (
    <div className={styles.deviceSummary}>
      <div className={styles.deviceField}>
        <span>Kategori & Model</span>
        <strong>
          {device.category} • {device.brand ? `${device.brand} ` : ''}
          {device.model}
        </strong>
      </div>

      <div className={styles.deviceField}>
        <span>Nomor Seri</span>
        <strong>{device.serialNumber || 'Tidak dicantumkan'}</strong>
      </div>

      <div className={styles.deviceField}>
        <span>Kondisi Fisik</span>
        <strong>{device.condition || 'Standar / Normal'}</strong>
      </div>

      <div className={styles.deviceField}>
        <span>Kelengkapan</span>
        <strong>
          {device.accessories && device.accessories.length > 0
            ? device.accessories.join(', ')
            : 'Hanya Unit'}
        </strong>
      </div>
    </div>
  );
}
