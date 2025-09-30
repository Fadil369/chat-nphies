import { useCallback } from 'react';

interface SmartFormData {
  patientId?: string;
  coverageId?: string;
  claimId?: string;
  procedureCode?: string;
  diagnosis?: string;
  amount?: number;
  [key: string]: unknown;
}

interface UseSmartFormOptions {
  context?: Record<string, unknown>;
  onFieldUpdate?: (field: string, value: unknown) => void;
}

export function useSmartForm(options: UseSmartFormOptions = {}) {
  const { context = {}, onFieldUpdate } = options;

  // Extract relevant form data from conversation context
  const extractFormData = useCallback((): SmartFormData => {
    const formData: SmartFormData = {};

    // Direct mappings from context
    if (context.patientId) formData.patientId = context.patientId as string;
    if (context.coverageId) formData.coverageId = context.coverageId as string;
    if (context.claimId) formData.claimId = context.claimId as string;

    // Extract from entities
    const entities = context.entities as Record<string, unknown> || {};
    
    // Common NPHIES codes and identifiers
    Object.entries(entities).forEach(([key, value]) => {
      if (typeof value === 'string' || typeof value === 'number') {
        // Map entity keys to form fields
        switch (key.toLowerCase()) {
          case 'procedurecode':
          case 'sctcode':
          case 'snomed':
            formData.procedureCode = String(value);
            break;
          case 'diagnosiscode':
          case 'icd10':
          case 'diagnosis':
            formData.diagnosis = String(value);
            break;
          case 'amount':
          case 'total':
          case 'value':
            if (typeof value === 'number' || !isNaN(Number(value))) {
              formData.amount = Number(value);
            }
            break;
          default:
            formData[key] = value;
        }
      }
    });

    return formData;
  }, [context]);

  // Auto-fill form fields based on context
  const autoFillForm = useCallback((formRef: React.RefObject<HTMLFormElement>) => {
    if (!formRef.current) return;

    const formData = extractFormData();
    const form = formRef.current;

    Object.entries(formData).forEach(([field, value]) => {
      if (value === undefined || value === null) return;

      // Find form field by name or id
      const input = form.querySelector(`[name="${field}"]`) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
      if (input && !input.value) {
        input.value = String(value);
        
        // Dispatch change event to trigger React state updates
        const event = new Event('change', { bubbles: true });
        input.dispatchEvent(event);
        
        // Call field update callback
        onFieldUpdate?.(field, value);
      }
    });
  }, [extractFormData, onFieldUpdate]);

  // Get suggestions for a specific field based on context
  const getFieldSuggestions = useCallback((fieldName: string): string[] => {
    const suggestions: string[] = [];
    const formData = extractFormData();

    switch (fieldName.toLowerCase()) {
      case 'patientid':
        if (formData.patientId) suggestions.push(formData.patientId);
        // Add common patient ID patterns
        suggestions.push('1234567890', '9876543210');
        break;
        
      case 'coverageid':
        if (formData.coverageId) suggestions.push(formData.coverageId);
        suggestions.push('COV-001', 'COV-002', 'INS-12345');
        break;
        
      case 'claimid':
        if (formData.claimId) suggestions.push(formData.claimId);
        suggestions.push('CLM-001', 'CLM-002', `CLM-${Date.now()}`);
        break;
        
      case 'procedurescode':
      case 'sctcode':
        if (formData.procedureCode) suggestions.push(formData.procedureCode);
        // Common SNOMED codes for NPHIES
        suggestions.push('103693007', '386053000', '182836005');
        break;
        
      case 'diagnosis':
      case 'diagnosiscode':
        if (formData.diagnosis) suggestions.push(formData.diagnosis);
        // Common ICD-10 codes
        suggestions.push('J10.1', 'K59.1', 'M79.3', 'R50.9');
        break;
        
      case 'amount':
        if (formData.amount) suggestions.push(String(formData.amount));
        suggestions.push('250', '500', '1000', '1500');
        break;
    }

    return suggestions.filter((s, i, arr) => arr.indexOf(s) === i); // Remove duplicates
  }, [extractFormData]);

  // Validate field value against NPHIES requirements
  const validateField = useCallback((fieldName: string, value: string): { isValid: boolean; message?: string } => {
    switch (fieldName.toLowerCase()) {
      case 'patientid':
        if (!/^\d{10}$/.test(value)) {
          return { isValid: false, message: 'Patient ID must be 10 digits' };
        }
        break;
        
      case 'coverageid':
        if (!value || value.length < 3) {
          return { isValid: false, message: 'Coverage ID is required' };
        }
        break;
        
      case 'procedurescode':
      case 'sctcode':
        if (!/^\d{6,}$/.test(value)) {
          return { isValid: false, message: 'SNOMED code must be numeric and at least 6 digits' };
        }
        break;
        
      case 'diagnosis':
      case 'diagnosiscode':
        if (!/^[A-Z]\d{2}(\.\d)?$/.test(value)) {
          return { isValid: false, message: 'ICD-10 code format: A00 or A00.0' };
        }
        break;
        
      case 'amount':
        const amount = parseFloat(value);
        if (isNaN(amount) || amount <= 0) {
          return { isValid: false, message: 'Amount must be a positive number' };
        }
        if (amount > 1000000) {
          return { isValid: false, message: 'Amount exceeds maximum limit' };
        }
        break;
    }

    return { isValid: true };
  }, []);

  // Generate smart field suggestions based on previous fields
  const getSmartSuggestions = useCallback((fieldName: string, formValues: Record<string, string>): string[] => {
    const suggestions: string[] = [];

    // Context-aware suggestions
    if (fieldName === 'procedurescode' && formValues.diagnosis) {
      // Suggest procedures commonly associated with diagnosis
      const diagnosisMap: Record<string, string[]> = {
        'J10.1': ['103693007', '182836005'], // Influenza -> Physiotherapy, Consultation
        'K59.1': ['386053000', '410055007'], // Constipation -> Dietary consultation
        'M79.3': ['103693007', '448178005']  // Panniculitis -> Physiotherapy
      };
      
      const relatedProcedures = diagnosisMap[formValues.diagnosis];
      if (relatedProcedures) {
        suggestions.push(...relatedProcedures);
      }
    }

    if (fieldName === 'amount' && formValues.procedurescode) {
      // Suggest typical amounts for procedures
      const procedureAmounts: Record<string, string[]> = {
        '103693007': ['250', '350', '500'], // Physiotherapy
        '386053000': ['150', '200', '300'], // Consultation
        '182836005': ['180', '250', '350']  // Consultation
      };
      
      const amounts = procedureAmounts[formValues.procedurescode];
      if (amounts) {
        suggestions.push(...amounts);
      }
    }

    return suggestions;
  }, []);

  return {
    extractFormData,
    autoFillForm,
    getFieldSuggestions,
    validateField,
    getSmartSuggestions
  };
}