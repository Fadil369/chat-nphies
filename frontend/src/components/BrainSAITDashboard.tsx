import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface Hospital {
  hospital_id: string;
  name: string;
  location: {
    city: string;
    region: string;
  };
  digital_maturity_level: number;
  vision2030_compliance: {
    digital_health_adoption: number;
    ai_integration_level: number;
  };
  nphies_integration?: {
    enabled: boolean;
    certification_status: string;
  };
}

interface Patient {
  patient_id: string;
  hospital_id: string;
  demographics: {
    age: number;
    gender: string;
    nationality: string;
  };
  nphies_coverage: {
    coverage_id: string;
    payer: string;
    status: string;
    coverage_details?: {
      copay_percentage: number;
      annual_limit: number;
      remaining_limit: number;
    };
  };
  ai_predictions: Array<{
    model_id: string;
    prediction: any;
    confidence: number;
    timestamp: string;
  }>;
}

interface AIModel {
  model_id: string;
  name: string;
  healthcare_domain: string;
  deployment_status: string;
  performance_metrics: {
    accuracy: number;
    precision: number;
    recall: number;
    f1_score: number;
  };
  nphies_integration?: {
    claim_prediction: boolean;
    eligibility_scoring: boolean;
    cost_estimation: boolean;
  };
}

interface HospitalInsights {
  hospital: Hospital | null;
  patients_count: number;
  ai_models_deployed: number;
  vision2030_score: number;
  top_specializations: string[];
  digital_maturity: number;
}

export const BrainSAITDashboard: React.FC = () => {
  const { t } = useTranslation();
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [selectedHospital, setSelectedHospital] = useState<string | null>(null);
  const [hospitalInsights, setHospitalInsights] = useState<HospitalInsights | null>(null);
  const [aiModels, setAIModels] = useState<AIModel[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadHospitals();
    loadAIModels();
  }, []);

  useEffect(() => {
    if (selectedHospital) {
      loadHospitalInsights(selectedHospital);
      loadPatients(selectedHospital);
    }
  }, [selectedHospital]);

  const loadHospitals = async () => {
    try {
      const response = await fetch('/api/brainsait/hospitals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filter: {} })
      });
      
      if (!response.ok) throw new Error('Failed to load hospitals');
      
      const data = await response.json();
      setHospitals(data.hospitals || []);
      
      if (data.hospitals?.length > 0 && !selectedHospital) {
        setSelectedHospital(data.hospitals[0].hospital_id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load hospitals');
    }
  };

  const loadAIModels = async () => {
    try {
      const response = await fetch('/api/brainsait/ai-models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filter: { deployment_status: 'production' } })
      });
      
      if (!response.ok) throw new Error('Failed to load AI models');
      
      const data = await response.json();
      setAIModels(data.ai_models || []);
    } catch (err) {
      console.error('Failed to load AI models:', err);
    }
  };

  const loadHospitalInsights = async (hospitalId: string) => {
    try {
      const response = await fetch('/api/brainsait/hospital-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hospital_id: hospitalId })
      });
      
      if (!response.ok) throw new Error('Failed to load hospital insights');
      
      const data = await response.json();
      setHospitalInsights(data.insights);
    } catch (err) {
      console.error('Failed to load hospital insights:', err);
    }
  };

  const loadPatients = async (hospitalId: string) => {
    try {
      const response = await fetch('/api/brainsait/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hospital_id: hospitalId })
      });
      
      if (!response.ok) throw new Error('Failed to load patients');
      
      const data = await response.json();
      setPatients(data.patients || []);
    } catch (err) {
      console.error('Failed to load patients:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active': return 'text-green-600 bg-green-100';
      case 'certified': return 'text-blue-600 bg-blue-100';
      case 'production': return 'text-purple-600 bg-purple-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading BrainSAIT data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <h3 className="text-red-800 font-semibold">Database Connection Error</h3>
        <p className="text-red-600 text-sm mt-1">{error}</p>
        <p className="text-red-600 text-sm mt-2">
          Make sure MONGODB_API_KEY is configured in your environment variables.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg p-6">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          🧠 BrainSAIT Healthcare Intelligence
        </h2>
        <p className="text-blue-100 mt-2">
          AI-powered insights for NPHIES workflows and Vision 2030 compliance
        </p>
      </div>

      {/* Hospital Selection */}
      <div className="bg-white rounded-lg border shadow-sm p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Hospital
        </label>
        <select
          value={selectedHospital || ''}
          onChange={(e) => setSelectedHospital(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          {hospitals.map((hospital) => (
            <option key={hospital.hospital_id} value={hospital.hospital_id}>
              {hospital.name} - {hospital.location.city}
            </option>
          ))}
        </select>
      </div>

      {/* Hospital Insights */}
      {hospitalInsights && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Patients</p>
                <p className="text-2xl font-bold text-gray-900">{hospitalInsights.patients_count}</p>
              </div>
              <div className="bg-blue-100 p-2 rounded-full">
                👥
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">AI Models</p>
                <p className="text-2xl font-bold text-gray-900">{hospitalInsights.ai_models_deployed}</p>
              </div>
              <div className="bg-purple-100 p-2 rounded-full">
                🤖
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Vision 2030</p>
                <p className="text-2xl font-bold text-gray-900">{hospitalInsights.vision2030_score.toFixed(1)}%</p>
              </div>
              <div className="bg-green-100 p-2 rounded-full">
                🎯
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Digital Maturity</p>
                <p className="text-2xl font-bold text-gray-900">{hospitalInsights.digital_maturity}/5</p>
              </div>
              <div className="bg-yellow-100 p-2 rounded-full">
                📊
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Models Section */}
      <div className="bg-white rounded-lg border shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            🤖 Production AI Models
          </h3>
        </div>
        <div className="p-6">
          {aiModels.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {aiModels.map((model) => (
                <div key={model.model_id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold text-gray-900">{model.name}</h4>
                      <p className="text-sm text-gray-600 capitalize">{model.healthcare_domain}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(model.deployment_status)}`}>
                      {model.deployment_status}
                    </span>
                  </div>
                  
                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-600">Accuracy:</span>
                      <span className="ml-1 font-medium">{(model.performance_metrics.accuracy * 100).toFixed(1)}%</span>
                    </div>
                    <div>
                      <span className="text-gray-600">F1 Score:</span>
                      <span className="ml-1 font-medium">{model.performance_metrics.f1_score.toFixed(3)}</span>
                    </div>
                  </div>

                  {model.nphies_integration && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {model.nphies_integration.claim_prediction && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">Claims</span>
                      )}
                      {model.nphies_integration.eligibility_scoring && (
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">Eligibility</span>
                      )}
                      {model.nphies_integration.cost_estimation && (
                        <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">Cost Est.</span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">No AI models deployed</p>
          )}
        </div>
      </div>

      {/* Patients with NPHIES Coverage */}
      <div className="bg-white rounded-lg border shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            👥 Patients with NPHIES Coverage
          </h3>
        </div>
        <div className="p-6">
          {patients.length > 0 ? (
            <div className="space-y-4">
              {patients.slice(0, 5).map((patient) => (
                <div key={patient.patient_id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold text-gray-900">Patient {patient.patient_id}</h4>
                      <p className="text-sm text-gray-600">
                        {patient.demographics.age}y old {patient.demographics.gender}, {patient.demographics.nationality}
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(patient.nphies_coverage.status)}`}>
                      {patient.nphies_coverage.status}
                    </span>
                  </div>
                  
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Coverage ID:</span>
                      <span className="ml-1 font-medium">{patient.nphies_coverage.coverage_id}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Payer:</span>
                      <span className="ml-1 font-medium">{patient.nphies_coverage.payer}</span>
                    </div>
                    {patient.nphies_coverage.coverage_details && (
                      <div>
                        <span className="text-gray-600">Remaining:</span>
                        <span className="ml-1 font-medium">
                          {patient.nphies_coverage.coverage_details.remaining_limit} SAR
                        </span>
                      </div>
                    )}
                  </div>

                  {patient.ai_predictions.length > 0 && (
                    <div className="mt-3">
                      <p className="text-sm text-gray-600 mb-2">AI Predictions:</p>
                      <div className="space-y-2">
                        {patient.ai_predictions.map((prediction, index) => (
                          <div key={index} className="bg-gray-50 rounded p-2 text-sm">
                            <div className="flex justify-between items-start">
                              <span className="font-medium">
                                {prediction.prediction.cardiovascular_risk || 'General Risk Assessment'}
                              </span>
                              <span className="text-xs text-gray-500">
                                {(prediction.confidence * 100).toFixed(0)}% confidence
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              
              {patients.length > 5 && (
                <div className="text-center pt-4">
                  <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                    View all {patients.length} patients →
                  </button>
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">No patient data available</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default BrainSAITDashboard;