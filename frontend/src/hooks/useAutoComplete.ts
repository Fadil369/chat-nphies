import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface AutoCompleteSuggestion {
  id: string;
  text: string;
  description?: string;
  category: 'entity' | 'template' | 'history' | 'smart';
  confidence: number;
  insertText?: string;
  metadata?: Record<string, unknown>;
}

interface UseAutoCompleteOptions {
  context?: Record<string, unknown>;
  recentMessages?: Array<{ role: string; content: string }>;
  enableSmartSuggestions?: boolean;
  maxSuggestions?: number;
}

export function useAutoComplete(options: UseAutoCompleteOptions = {}) {
  const { t, i18n } = useTranslation();
  const {
    context = {},
    recentMessages = [],
    enableSmartSuggestions = true,
    maxSuggestions = 6
  } = options;

  const [suggestions, setSuggestions] = useState<AutoCompleteSuggestion[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const debounceRef = useRef<NodeJS.Timeout>();

  // Pre-defined templates for common NPHIES queries
  const templates = useMemo(() => [
    {
      id: 'eligibility-basic',
      trigger: ['eligibility', 'check', 'أهلية'],
      text: t('Generate eligibility check for patient {patientId} with coverage {coverageId}'),
      category: 'template' as const,
      insertText: t('Generate eligibility check for patient {patientId} with coverage {coverageId} for procedure {procedureCode}'),
      confidence: 0.9
    },
    {
      id: 'claim-basic',
      trigger: ['claim', 'submit', 'مطالبة'],
      text: t('Create claim for patient {patientId}'),
      category: 'template' as const,
      insertText: t('Create professional claim for patient {patientId}, claim {claimId}, diagnosis {diagnosis}, amount {amount} SAR'),
      confidence: 0.9
    },
    {
      id: 'payment-check',
      trigger: ['payment', 'notice', 'دفع'],
      text: t('Check payment status for claim {claimId}'),
      category: 'template' as const,
      confidence: 0.8
    },
    {
      id: 'audit-summary',
      trigger: ['audit', 'summary', 'تدقيق'],
      text: t('Summarize recent decisions and highlight missing evidence'),
      category: 'template' as const,
      confidence: 0.8
    }
  ], [t]);

  // Entity suggestions based on context
  const entitySuggestions = useMemo(() => {
    const suggestions: AutoCompleteSuggestion[] = [];
    
    if (context.patientId) {
      suggestions.push({
        id: 'patient-id',
        text: `Patient ID: ${context.patientId}`,
        category: 'entity',
        confidence: 1.0,
        insertText: context.patientId as string
      });
    }

    if (context.coverageId) {
      suggestions.push({
        id: 'coverage-id',
        text: `Coverage: ${context.coverageId}`,
        category: 'entity',
        confidence: 1.0,
        insertText: context.coverageId as string
      });
    }

    if (context.claimId) {
      suggestions.push({
        id: 'claim-id',
        text: `Claim: ${context.claimId}`,
        category: 'entity',
        confidence: 1.0,
        insertText: context.claimId as string
      });
    }

    return suggestions;
  }, [context]);

  // History-based suggestions
  const historySuggestions = useMemo(() => {
    const recent = recentMessages
      .filter(msg => msg.role === 'user')
      .slice(-5)
      .map((msg, index) => ({
        id: `history-${index}`,
        text: msg.content.length > 50 ? `${msg.content.slice(0, 50)}...` : msg.content,
        category: 'history' as const,
        confidence: 0.6 - (index * 0.1),
        insertText: msg.content,
        description: t('Recent message')
      }));

    return recent;
  }, [recentMessages, t]);

  const generateSuggestions = useCallback((input: string, cursorPosition: number) => {
    const inputLower = input.toLowerCase();
    const beforeCursor = input.slice(0, cursorPosition).toLowerCase();
    const allSuggestions: AutoCompleteSuggestion[] = [];

    // Template suggestions
    templates.forEach(template => {
      if (template.trigger.some(trigger => inputLower.includes(trigger))) {
        allSuggestions.push({
          ...template,
          text: interpolateTemplate(template.text, context)
        });
      }
    });

    // Entity suggestions - show when typing patterns like "patient:", "رقم المريض:"
    if (beforeCursor.match(/(?:patient|coverage|claim|مريض|تغطية|مطالبة)\s*:?\s*$/i)) {
      allSuggestions.push(...entitySuggestions);
    }

    // Smart contextual suggestions
    if (enableSmartSuggestions) {
      allSuggestions.push(...generateSmartSuggestions(input, context));
    }

    // History suggestions (only for empty input or short queries)
    if (input.length < 10) {
      allSuggestions.push(...historySuggestions);
    }

    // Filter and sort suggestions
    const filtered = allSuggestions
      .filter(s => s.confidence > 0.3)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, maxSuggestions);

    return filtered;
  }, [templates, entitySuggestions, enableSmartSuggestions, historySuggestions, context, maxSuggestions]);

  const updateSuggestions = useCallback((input: string, cursorPosition: number) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      const newSuggestions = generateSuggestions(input, cursorPosition);
      setSuggestions(newSuggestions);
      setIsVisible(newSuggestions.length > 0 && input.length > 0);
      setSelectedIndex(-1);
    }, 150);
  }, [generateSuggestions]);

  const selectSuggestion = useCallback((index: number) => {
    if (index >= 0 && index < suggestions.length) {
      setSelectedIndex(index);
      return suggestions[index];
    }
    return null;
  }, [suggestions]);

  const applySuggestion = useCallback((suggestion: AutoCompleteSuggestion, input: string, cursorPosition: number) => {
    const insertText = suggestion.insertText || suggestion.text;
    const beforeCursor = input.slice(0, cursorPosition);
    const afterCursor = input.slice(cursorPosition);
    
    // Find the word boundary to replace
    const wordStart = beforeCursor.lastIndexOf(' ') + 1;
    const wordEnd = afterCursor.indexOf(' ');
    
    const newText = beforeCursor.slice(0, wordStart) + 
                   insertText + 
                   (wordEnd >= 0 ? afterCursor.slice(wordEnd) : '');
    
    const newCursorPosition = wordStart + insertText.length;
    
    setIsVisible(false);
    setSelectedIndex(-1);
    
    return { text: newText, cursorPosition: newCursorPosition };
  }, []);

  const hide = useCallback(() => {
    setIsVisible(false);
    setSelectedIndex(-1);
  }, []);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!isVisible || suggestions.length === 0) return false;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setSelectedIndex(prev => (prev + 1) % suggestions.length);
        return true;
      
      case 'ArrowUp':
        event.preventDefault();
        setSelectedIndex(prev => prev <= 0 ? suggestions.length - 1 : prev - 1);
        return true;
      
      case 'Enter':
      case 'Tab':
        if (selectedIndex >= 0) {
          event.preventDefault();
          return suggestions[selectedIndex];
        }
        return false;
      
      case 'Escape':
        hide();
        return true;
      
      default:
        return false;
    }
  }, [isVisible, suggestions, selectedIndex, hide]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return {
    suggestions,
    isVisible,
    selectedIndex,
    updateSuggestions,
    selectSuggestion,
    applySuggestion,
    handleKeyDown,
    hide
  };
}

function interpolateTemplate(template: string, context: Record<string, unknown>): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    const value = context[key];
    return value ? String(value) : match;
  });
}

function generateSmartSuggestions(input: string, context: Record<string, unknown>): AutoCompleteSuggestion[] {
  const suggestions: AutoCompleteSuggestion[] = [];
  const inputLower = input.toLowerCase();

  // Smart suggestions based on workflow stage
  if (context.workflowStage === 'eligibility' && inputLower.includes('generate')) {
    suggestions.push({
      id: 'smart-eligibility-json',
      text: 'Generate FHIR EligibilityRequest JSON',
      category: 'smart',
      confidence: 0.85,
      description: 'Create structured FHIR payload'
    });
  }

  if (context.workflowStage === 'claim' && inputLower.includes('create')) {
    suggestions.push({
      id: 'smart-claim-json',
      text: 'Create FHIR Claim JSON with validation',
      category: 'smart',
      confidence: 0.85,
      description: 'Generate compliant claim structure'
    });
  }

  // Suggest next logical steps
  if (context.patientId && context.coverageId && !context.claimId) {
    suggestions.push({
      id: 'smart-next-claim',
      text: 'Create a claim for this patient',
      category: 'smart',
      confidence: 0.7,
      description: 'Next step in workflow'
    });
  }

  return suggestions;
}