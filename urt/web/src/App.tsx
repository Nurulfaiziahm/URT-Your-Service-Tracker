import { BrowserRouter } from 'react-router';
import { ReduxProvider } from './redux/Providers';
import { SessionBootstrap } from './features/auth/SessionBootstrap';
import { AppErrorBoundary } from './app/AppErrorBoundary';
import { AppRoutes } from './app/router';
import { RouteEffects } from './app/RouteEffects';
import { Toaster } from './components/feedback/Toaster';

export default function App() {
  return (
    <AppErrorBoundary>
      <ReduxProvider>
        <SessionBootstrap />
        <Toaster />
        <BrowserRouter>
          <RouteEffects />
          <AppRoutes />
        </BrowserRouter>
      </ReduxProvider>
    </AppErrorBoundary>
  );
}
