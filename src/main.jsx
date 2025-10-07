import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './index.css';
import TravelDashboard from './dashboard.jsx';
import PolicyBuilder from './policy.jsx';
import Trips from './trips.jsx';
import Risk from './risk.jsx';
import ExpensePage from './expense.jsx';
import Documents from './documents.jsx';
import { useNavigate } from 'react-router-dom';

function Reports(){ const navigate = useNavigate(); return (<div className="p-6"><button onClick={()=> navigate(-1)} className="px-2 py-1 bg-white border rounded text-sm">← Back</button><div className="mt-4">Reports (placeholder)</div></div>); }
function Analytics(){ const navigate = useNavigate(); return (<div className="p-6"><button onClick={()=> navigate(-1)} className="px-2 py-1 bg-white border rounded text-sm">← Back</button><div className="mt-4">Analytics (placeholder)</div></div>); }

function AppRoutes(){
	return (
		<Routes>
			<Route path="/" element={<TravelDashboard />} />
			<Route path="/policy" element={<PolicyBuilder />} />
			<Route path="/trips" element={<Trips />} />
			<Route path="/reports" element={<Reports />} />
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
