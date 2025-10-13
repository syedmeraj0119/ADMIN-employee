import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Reports from './reports.jsx';
import './index.css';
import TravelDashboard from './dashboard.jsx';
import Analytics from './analytics.jsx';
import PolicyBuilder from './policy.jsx';
import Trips from './trips.jsx';
import Risk from './risk.jsx';
import ExpensePage from './expense.jsx';
import Documents from './documents.jsx';
import { useNavigate } from 'react-router-dom';

// Removed inline Reports function

function AppRoutes(){
	return (
		<Routes>
			<Route path="/" element={<TravelDashboard />} />
			<Route path="/policy" element={<PolicyBuilder />} />
			<Route path="/trips" element={<Trips />} />
			{/* Dashboard1 route removed */}
			<Route path="/reports" element={<Reports />} /> // Now using the imported Reports component
			<Route path="/risk" element={<Risk />} />
			<Route path="/expense" element={<ExpensePage />} />
			<Route path="/documents" element={<Documents />} />
			<Route path="/analytics" element={<Analytics />} />
		</Routes>
	);
}

const el = document.getElementById('root');
if (el) {
	const root = createRoot(el);
	root.render(
		<React.StrictMode>
			<BrowserRouter>
				<AppRoutes />
			</BrowserRouter>
		</React.StrictMode>
	);
}
