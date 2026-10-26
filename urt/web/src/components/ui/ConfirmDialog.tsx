import { Modal } from './Modal';
import { Button } from './Button';
export function ConfirmDialog({
  title,
  description,
  pending,
  onConfirm,
  onClose,
}: {
  title: string;
  description: string;
  pending?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal
      label={title}
      onClose={() => {
        if (!pending) onClose();
      }}
    >
      <div style={{ background: 'white', padding: 24, borderRadius: 12, display: 'grid', gap: 20 }}>
        <h2 style={{ fontSize: 20 }}>{title}</h2>
        <p>{description}</p>
        <div className="actions" style={{ justifyContent: 'flex-end' }}>
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            Batal
          </Button>
          <Button variant="danger" onClick={onConfirm} pending={pending}>
            Konfirmasi
          </Button>
        </div>
      </div>
    </Modal>
  );
}
