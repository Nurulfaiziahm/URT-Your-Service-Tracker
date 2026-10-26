import { Component, type PropsWithChildren } from 'react';
import { EmptyState } from '../components/feedback/Feedback';
import { Button } from '../components/ui/Button';

export class AppErrorBoundary extends Component<PropsWithChildren, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed)
      return (
        <main className="container page-content">
          <EmptyState
            title="Halaman tidak dapat ditampilkan"
            description="Terjadi kendala saat menampilkan halaman. Muat ulang untuk mencoba kembali."
            symbol="!"
            action={<Button onClick={() => window.location.reload()}>Muat ulang</Button>}
          />
        </main>
      );
    return this.props.children;
  }
}
