import { Env } from "./index";

interface Hospital {
  hospital_id: string;
  name: string;
  location: {
    city: string;
    region: string;
    coordinates: { lat: number; lng: number };
  };
  license_number: string;
  capacity: { beds: number; icu: number; emergency: number };
  specializations: string[];
  digital_maturity_level: number;
  vision2030_compliance: {
    health_sector_transformation: boolean;
    digital_health_adoption: number;
    ai_integration_level: number;
  };
  created_at: string;
  updated_at: string;
}

interface AIModel {
  model_id: string;
  name: string;
  type: string;
  version: string;
  healthcare_domain: string;
  performance_metrics: {
    accuracy: number;
    precision: number;
    recall: number;
    f1_score: number;
  };
  deployment_status: string;
  vision2030_alignment: {
    innovation_contribution: number;
    quality_improvement: number;
    efficiency_gain: number;
  };
  created_at: string;
  last_updated: string;
}

interface Patient {
  patient_id: string;
  hospital_id: string;
  demographics: {
    age: number;
    gender: string;
    nationality: string;
  };
  medical_history: string[];
  current_treatments: string[];
  nphies_coverage: {
    coverage_id: string;
    payer: string;
    status: string;
  };
  ai_predictions: Array<{
    model_id: string;
    prediction: any;
    confidence: number;
    timestamp: string;
  }>;
  created_at: string;
  updated_at: string;
}

interface Vision2030Metrics {
  metric_id: string;
  hospital_id: string;
  vision2030_goals: {
    health_sector_transformation: {
      digital_health_adoption: number;
      ai_integration: number;
      patient_experience: number;
    };
    innovation_economy: {
      tech_adoption: number;
      research_contribution: number;
      startup_collaboration: number;
    };
    sustainability: {
      resource_efficiency: number;
      environmental_impact: number;
      social_responsibility: number;
    };
  };
  overall_alignment_score: number;
  measurement_date: string;
}

class BrainSAITDatabase {
  private baseUrl: string;
  private apiKey: string;

  constructor(mongoApiKey: string, mongoApiUrl?: string) {
    this.apiKey = mongoApiKey;
    this.baseUrl = mongoApiUrl || 'https://data.mongodb-api.com/app/data-kmxgp/endpoint/data/v1';
  }

  private async makeRequest(endpoint: string, method: string = 'GET', body?: any): Promise<any> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Request-Headers': '*',
        'api-key': this.apiKey,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      throw new Error(`Database request failed: ${response.status} ${response.statusText}`);
    }

    return await response.json() as any;
  }

  async getHospitals(filter: any = {}): Promise<Hospital[]> {
    const payload = {
      collection: 'hospitals',
      database: 'brainsait_platform',
      dataSource: 'Cluster0',
      filter,
    };

    const result = await this.makeRequest('/action/find', 'POST', payload);
    return (result as any).documents || [];
  }

  async getHospitalById(hospitalId: string): Promise<Hospital | null> {
    const hospitals = await this.getHospitals({ hospital_id: hospitalId });
    return hospitals[0] || null;
  }

  async getAIModels(filter: any = {}): Promise<AIModel[]> {
    const payload = {
      collection: 'ai_models',
      database: 'brainsait_platform',
      dataSource: 'Cluster0',
      filter,
    };

    const result = await this.makeRequest('/action/find', 'POST', payload);
    return (result as any).documents || [];
  }

  async getPatients(hospitalId?: string): Promise<Patient[]> {
    const filter = hospitalId ? { hospital_id: hospitalId } : {};
    const payload = {
      collection: 'patients',
      database: 'brainsait_platform',
      dataSource: 'Cluster0',
      filter,
    };

    const result = await this.makeRequest('/action/find', 'POST', payload);
    return (result as any).documents || [];
  }

  async getPatientById(patientId: string): Promise<Patient | null> {
    const payload = {
      collection: 'patients',
      database: 'brainsait_platform',
      dataSource: 'Cluster0',
      filter: { patient_id: patientId },
    };

    const result = await this.makeRequest('/action/find', 'POST', payload);
    return (result as any).documents?.[0] || null;
  }

  async getVision2030Metrics(hospitalId?: string): Promise<Vision2030Metrics[]> {
    const filter = hospitalId ? { hospital_id: hospitalId } : {};
    const payload = {
      collection: 'vision2030_metrics',
      database: 'brainsait_platform',
      dataSource: 'Cluster0',
      filter,
    };

    const result = await this.makeRequest('/action/find', 'POST', payload);
    return (result as any).documents || [];
  }

  async createPatient(patient: Omit<Patient, 'patient_id' | 'created_at' | 'updated_at'>): Promise<string> {
    const now = new Date().toISOString();
    const patientId = `PAT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const newPatient: Patient = {
      ...patient,
      patient_id: patientId,
      created_at: now,
      updated_at: now,
    };

    const payload = {
      collection: 'patients',
      database: 'brainsait_platform',
      dataSource: 'Cluster0',
      document: newPatient,
    };

    await this.makeRequest('/action/insertOne', 'POST', payload);
    return patientId;
  }

  async updatePatient(patientId: string, updates: Partial<Patient>): Promise<boolean> {
    const payload = {
      collection: 'patients',
      database: 'brainsait_platform',
      dataSource: 'Cluster0',
      filter: { patient_id: patientId },
      update: {
        $set: {
          ...updates,
          updated_at: new Date().toISOString(),
        },
      },
    };

    const result = await this.makeRequest('/action/updateOne', 'POST', payload);
    return (result as any).modifiedCount > 0;
  }

  async addAIPrediction(patientId: string, prediction: {
    model_id: string;
    prediction: any;
    confidence: number;
  }): Promise<boolean> {
    const predictionWithTimestamp = {
      ...prediction,
      timestamp: new Date().toISOString(),
    };

    const payload = {
      collection: 'patients',
      database: 'brainsait_platform',
      dataSource: 'Cluster0',
      filter: { patient_id: patientId },
      update: {
        $push: { ai_predictions: predictionWithTimestamp },
      },
    };

    const result = await this.makeRequest('/action/updateOne', 'POST', payload);
    return (result as any).modifiedCount > 0;
  }

  async getHospitalInsights(hospitalId: string): Promise<{
    hospital: Hospital | null;
    patients_count: number;
    ai_models_deployed: number;
    vision2030_score: number;
    top_specializations: string[];
    digital_maturity: number;
  }> {
    const [hospital, patients, aiModels, vision2030] = await Promise.all([
      this.getHospitalById(hospitalId),
      this.getPatients(hospitalId),
      this.getAIModels({ deployment_status: 'production' }),
      this.getVision2030Metrics(hospitalId),
    ]);

    const vision2030Score = vision2030[0]?.overall_alignment_score || 0;
    const specializations = hospital?.specializations || [];

    return {
      hospital,
      patients_count: patients.length,
      ai_models_deployed: aiModels.length,
      vision2030_score: vision2030Score,
      top_specializations: specializations.slice(0, 3),
      digital_maturity: hospital?.digital_maturity_level || 0,
    };
  }
}

export async function handleBrainSAIT(action: string, body: any, env: Env): Promise<Response> {
  try {
    if (!env.MONGODB_API_KEY) {
      throw new Error("MongoDB API key not configured");
    }

    const db = new BrainSAITDatabase(env.MONGODB_API_KEY, env.MONGODB_API_URL);

    switch (action) {
      case 'hospitals':
        const hospitals = await db.getHospitals(body.filter || {});
        return jsonResponse({ hospitals });

      case 'hospital':
        if (!body.hospital_id) {
          throw new Error("hospital_id is required");
        }
        const hospital = await db.getHospitalById(body.hospital_id);
        return jsonResponse({ hospital });

      case 'patients':
        const patients = await db.getPatients(body.hospital_id);
        return jsonResponse({ patients });

      case 'patient':
        if (!body.patient_id) {
          throw new Error("patient_id is required");
        }
        const patient = await db.getPatientById(body.patient_id);
        return jsonResponse({ patient });

      case 'ai-models':
        const aiModels = await db.getAIModels(body.filter || {});
        return jsonResponse({ ai_models: aiModels });

      case 'vision2030':
        const metrics = await db.getVision2030Metrics(body.hospital_id);
        return jsonResponse({ vision2030_metrics: metrics });

      case 'hospital-insights':
        if (!body.hospital_id) {
          throw new Error("hospital_id is required");
        }
        const insights = await db.getHospitalInsights(body.hospital_id);
        return jsonResponse({ insights });

      case 'create-patient':
        if (!body.patient_data) {
          throw new Error("patient_data is required");
        }
        const patientId = await db.createPatient(body.patient_data);
        return jsonResponse({ patient_id: patientId, created: true });

      case 'add-ai-prediction':
        if (!body.patient_id || !body.prediction) {
          throw new Error("patient_id and prediction are required");
        }
        const updated = await db.addAIPrediction(body.patient_id, body.prediction);
        return jsonResponse({ updated });

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    console.error('BrainSAIT database error:', error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      500
    );
  }
}

function jsonResponse(body: any, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "X-XSS-Protection": "1; mode=block",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    }
  });
}