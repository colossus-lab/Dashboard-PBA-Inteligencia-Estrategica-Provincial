import { useState, useRef, useEffect } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import type { UIMessage } from 'ai';
import { Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';

const SUGGESTED_QUESTIONS = [
  {
    category: 'Economia',
    icon: '📊',
    questions: [
      '¿Cuánto recaudó la provincia en 2025?',
      '¿Qué porcentaje representa Ingresos Brutos?',
      '¿Cómo evolucionó el PBG en los últimos años?',
    ],
  },
  {
    category: 'Municipios',
    icon: '🏛️',
    questions: [
      '¿Qué municipio recibe más transferencias?',
      '¿Cuáles municipios crecieron más en 2024-2025?',
      'Compara La Matanza con La Plata',
    ],
  },
  {
    category: 'Seguridad',
    icon: '🛡️',
    questions: [
      '¿Cuáles son los municipios con más hechos delictivos?',
      '¿Qué tipos de delitos son más frecuentes?',
    ],
  },
  {
    category: 'Agricultura',
    icon: '🌾',
    questions: [
      '¿Cuáles son los principales cultivos de la provincia?',
      '¿Cuántas cabezas de ganado hay?',
    ],
  },
];

function getMessageText(message: UIMessage): string {
  if (!message.parts || !Array.isArray(message.parts)) return '';
  return message.parts
    .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
    .map((p) => p.text)
    .join('');
}

export function Chat() {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({ api: '/api/chat' }),
  });

  const isLoading = status === 'streaming' || status === 'submitted';

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage({ text: input });
    setInput('');
  };

  const handleSuggestionClick = (question: string) => {
    if (isLoading) return;
    sendMessage({ text: question });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="chat-container">
      {/* Header */}
      <div className="chat-header">
        <Link to="/" className="chat-back-link">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z" />
          </svg>
          <span>Volver</span>
        </Link>
        <div className="chat-header-title">
          <span className="chat-header-icon">🤖</span>
          <div>
            <h1>Asistente de Inteligencia Estrategica</h1>
            <p>Consulta los datos e informes del Dashboard PBA</p>
          </div>
        </div>
        <div className="chat-header-status">
          {isLoading && (
            <span className="chat-status-indicator">
              <span className="chat-status-dot"></span>
              Procesando...
            </span>
          )}
        </div>
      </div>

      {/* Messages Area */}
      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="chat-welcome">
            <div className="chat-welcome-icon">🤖</div>
            <h2>Bienvenido al Asistente de Inteligencia Estrategica</h2>
            <p>
              Puedo ayudarte a explorar los datos de la Provincia de Buenos Aires.
              Tengo acceso a 14 informes ejecutivos y 13 bases de datos con mas de 82,000 registros.
            </p>

            <div className="chat-suggestions">
              {SUGGESTED_QUESTIONS.map((group) => (
                <div key={group.category} className="chat-suggestion-group">
                  <h3>
                    <span>{group.icon}</span>
                    {group.category}
                  </h3>
                  <div className="chat-suggestion-list">
                    {group.questions.map((q) => (
                      <button
                        key={q}
                        onClick={() => handleSuggestionClick(q)}
                        className="chat-suggestion-btn"
                        disabled={isLoading}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="chat-message-list">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`chat-message ${message.role === 'user' ? 'chat-message-user' : 'chat-message-assistant'}`}
              >
                <div className="chat-message-avatar">
                  {message.role === 'user' ? '👤' : '🤖'}
                </div>
                <div className="chat-message-content">
                  <div className="chat-message-role">
                    {message.role === 'user' ? 'Tu' : 'Asistente'}
                  </div>
                  <div className="chat-message-text">
                    {message.role === 'assistant' ? (
                      <ReactMarkdown
                        components={{
                          table: ({ children }) => (
                            <div className="chat-table-wrapper">
                              <table>{children}</table>
                            </div>
                          ),
                        }}
                      >
                        {getMessageText(message)}
                      </ReactMarkdown>
                    ) : (
                      <p>{getMessageText(message)}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {isLoading && messages[messages.length - 1]?.role === 'user' && (
              <div className="chat-message chat-message-assistant">
                <div className="chat-message-avatar">🤖</div>
                <div className="chat-message-content">
                  <div className="chat-message-role">Asistente</div>
                  <div className="chat-typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Error display */}
      {error && (
        <div className="chat-error">
          <span>Error: {error.message || 'No se pudo procesar tu mensaje'}</span>
        </div>
      )}

      {/* Input Area */}
      <form onSubmit={handleSubmit} className="chat-input-form">
        <div className="chat-input-wrapper">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribe tu pregunta sobre los datos de la provincia..."
            rows={1}
            disabled={isLoading}
            className="chat-input"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="chat-submit-btn"
          >
            {isLoading ? (
              <svg className="chat-spinner" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.3" />
                <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            )}
          </button>
        </div>
        <p className="chat-input-hint">
          Presiona Enter para enviar, Shift+Enter para nueva linea
        </p>
      </form>
    </div>
  );
}
