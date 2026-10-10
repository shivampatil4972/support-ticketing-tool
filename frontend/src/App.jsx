import { AuthProvider } from './context/AuthContext';
import AppRoutes from './routes/AppRoutes';
import { Toaster } from 'react-hot-toast';

const App = () => {
  return (
    <AuthProvider>
      <Toaster position="bottom-right" toastOptions={{ className: 'dark:bg-slate-800 dark:text-white border border-slate-200 dark:border-slate-700 shadow-soft' }} />
      <AppRoutes />
    </AuthProvider>
  );
};

export default App;
