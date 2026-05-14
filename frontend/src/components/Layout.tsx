import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import ChatBot from './ChatBot';

export default function Layout() {
  return (
    <div className="flex h-screen overflow-hidden bg-surface dark:bg-ink-900">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
      <ChatBot />
    </div>
  );
}
