import { useState, useCallback, useRef } from 'react';

interface ConversationMemory {
  id: string;
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
    metadata?: Record<string, unknown>;
  }>;
  context: {
    patientId?: string;
    coverageId?: string;
    claimId?: string;
    lastIntent?: string;
    workflowStage?: 'eligibility' | 'claim' | 'payment' | 'audit';
    entities: Record<string, unknown>;
  };
  createdAt: number;
  updatedAt: number;
}

interface UseConversationMemoryOptions {
  maxConversations?: number;
  maxMessagesPerConversation?: number;
  enablePersistence?: boolean;
}

export function useConversationMemory(options: UseConversationMemoryOptions = {}) {
  const {
    maxConversations = 5,
    maxMessagesPerConversation = 50,
    enablePersistence = true
  } = options;

  const [conversations, setConversations] = useState<ConversationMemory[]>(() => {
    if (enablePersistence && typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('nphies-conversations');
        return stored ? JSON.parse(stored) : [];
      } catch (error) {
        console.warn('Failed to load conversations from localStorage:', error);
        return [];
      }
    }
    return [];
  });

  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const persistTimeoutRef = useRef<NodeJS.Timeout>();

  const persistConversations = useCallback((convs: ConversationMemory[]) => {
    if (!enablePersistence || typeof window === 'undefined') return;

    // Debounce persistence to avoid excessive writes
    if (persistTimeoutRef.current) {
      clearTimeout(persistTimeoutRef.current);
    }

    persistTimeoutRef.current = setTimeout(() => {
      try {
        localStorage.setItem('nphies-conversations', JSON.stringify(convs));
      } catch (error) {
        console.warn('Failed to persist conversations:', error);
      }
    }, 500);
  }, [enablePersistence]);

  const createConversation = useCallback((): string => {
    const id = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newConversation: ConversationMemory = {
      id,
      messages: [],
      context: { entities: {} },
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    setConversations(prev => {
      const updated = [newConversation, ...prev].slice(0, maxConversations);
      persistConversations(updated);
      return updated;
    });

    setCurrentConversationId(id);
    return id;
  }, [maxConversations, persistConversations]);

  const addMessage = useCallback((
    content: string,
    role: 'user' | 'assistant',
    metadata?: Record<string, unknown>
  ) => {
    const conversationId = currentConversationId || createConversation();

    setConversations(prev => {
      const updated = prev.map(conv => {
        if (conv.id !== conversationId) return conv;

        const newMessage = {
          role,
          content,
          timestamp: Date.now(),
          metadata
        };

        // Extract entities and context from message
        const updatedContext = extractContextFromMessage(content, metadata, conv.context);

        return {
          ...conv,
          messages: [...conv.messages, newMessage].slice(-maxMessagesPerConversation),
          context: updatedContext,
          updatedAt: Date.now()
        };
      });

      persistConversations(updated);
      return updated;
    });
  }, [currentConversationId, createConversation, maxMessagesPerConversation, persistConversations]);

  const getCurrentConversation = useCallback((): ConversationMemory | null => {
    if (!currentConversationId) return null;
    return conversations.find(conv => conv.id === currentConversationId) || null;
  }, [currentConversationId, conversations]);

  const getConversationContext = useCallback(() => {
    const current = getCurrentConversation();
    return current?.context || { entities: {} };
  }, [getCurrentConversation]);

  const updateContext = useCallback((updates: Partial<ConversationMemory['context']>) => {
    if (!currentConversationId) return;

    setConversations(prev => {
      const updated = prev.map(conv => {
        if (conv.id !== currentConversationId) return conv;
        
        return {
          ...conv,
          context: { ...conv.context, ...updates },
          updatedAt: Date.now()
        };
      });

      persistConversations(updated);
      return updated;
    });
  }, [currentConversationId, persistConversations]);

  const switchConversation = useCallback((id: string | null) => {
    setCurrentConversationId(id);
  }, []);

  const deleteConversation = useCallback((id: string) => {
    setConversations(prev => {
      const updated = prev.filter(conv => conv.id !== id);
      persistConversations(updated);
      return updated;
    });

    if (currentConversationId === id) {
      setCurrentConversationId(null);
    }
  }, [currentConversationId, persistConversations]);

  const clearAllConversations = useCallback(() => {
    setConversations([]);
    setCurrentConversationId(null);
    if (enablePersistence && typeof window !== 'undefined') {
      localStorage.removeItem('nphies-conversations');
    }
  }, [enablePersistence]);

  return {
    conversations,
    currentConversationId,
    currentConversation: getCurrentConversation(),
    context: getConversationContext(),
    createConversation,
    addMessage,
    updateContext,
    switchConversation,
    deleteConversation,
    clearAllConversations
  };
}

function extractContextFromMessage(
  content: string, 
  metadata: Record<string, unknown> | undefined,
  currentContext: ConversationMemory['context']
): ConversationMemory['context'] {
  const updatedContext = { ...currentContext };

  // Extract entities using regex patterns
  const patterns = {
    patientId: /(?:patient|مريض)\s*(?:id|رقم|معرف)?\s*:?\s*([A-Z0-9]+)/i,
    coverageId: /(?:coverage|تغطية)\s*(?:id|رقم|معرف)?\s*:?\s*([A-Z0-9-]+)/i,
    claimId: /(?:claim|مطالبة)\s*(?:id|رقم|معرف)?\s*:?\s*([A-Z0-9-]+)/i
  };

  for (const [key, pattern] of Object.entries(patterns)) {
    const match = content.match(pattern);
    if (match && match[1]) {
      (updatedContext as any)[key] = match[1];
    }
  }

  // Extract intent from metadata or content
  if (metadata?.intent) {
    updatedContext.lastIntent = metadata.intent as string;
  }

  // Determine workflow stage based on content and intent
  if (content.toLowerCase().includes('eligibility') || content.includes('أهلية')) {
    updatedContext.workflowStage = 'eligibility';
  } else if (content.toLowerCase().includes('claim') || content.includes('مطالبة')) {
    updatedContext.workflowStage = 'claim';
  } else if (content.toLowerCase().includes('payment') || content.includes('دفع')) {
    updatedContext.workflowStage = 'payment';
  } else if (content.toLowerCase().includes('audit') || content.includes('تدقيق')) {
    updatedContext.workflowStage = 'audit';
  }

  // Store additional entities from structured data
  if (metadata?.structured) {
    const structured = metadata.structured as Record<string, unknown>;
    for (const [key, value] of Object.entries(structured)) {
      if (typeof value === 'string' || typeof value === 'number') {
        updatedContext.entities[key] = value;
      }
    }
  }

  return updatedContext;
}