// src/app/dashboard/settings/page.tsx
import CalendarConnection from '../../../components/settings/CalendarConnection';
import { ShortcutSetup } from '../../../components/settings/ShortcutSetup';

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-4 sm:p-6 lg:p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Settings</h1>
        <div className="space-y-8">
          <CalendarConnection />
          <ShortcutSetup />
        </div>
      </div>
    </div>
  );
}
