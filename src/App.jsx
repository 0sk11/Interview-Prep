import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { TrackerProvider, useTracker } from './context/TrackerContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import MasterTracker from './pages/MasterTracker';
import ContestLog from './pages/ContestLog';
import StudyGuides from './pages/StudyGuides';
import ScheduleCalendar from './pages/ScheduleCalendar';
import AiHelper from './pages/AiHelper';
import Auth from './pages/Auth';

function AppContent() {
  const { isAuthenticated } = useTracker();

  if (!isAuthenticated) {
    return <Auth />;
  }

  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/tracker" element={<MasterTracker />} />
          <Route path="/calendar" element={<ScheduleCalendar />} />
          <Route path="/ai-helper" element={<AiHelper />} />
          <Route path="/contests" element={<ContestLog />} />
          <Route path="/study" element={<StudyGuides />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <TrackerProvider>
      <AppContent />
    </TrackerProvider>
  );
}
