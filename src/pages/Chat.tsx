import { useState, useRef, useEffect } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import type { UIMessage } from 'ai';
import { Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { Helmet } from 'react-helmet-async';
import { Sparkles, ArrowLeft, Send, User } from 'lucide-react';
import { getCategoryIcon, type IconComp } from '../lib/categoryIcons';

const SUGGESTED_QUESTIONS: { category: string; iconKey: string; questions: string[] }[] = [
  {
    category: 'Economía',
    iconKey: 'economia',
    questions: [
      '¿Cuánto recaudó la provincia en 2025?',
      '¿Qué porcentaje representa Ingresos Brutos?',
      '¿Cómo evolucionó el PBG en los últimos años?',
    ],
  },
  {
    category: 'Municipios',
    iconKey: 'municipios',
    questions: [
      '¿Qué municipio recibe más transferencias?',
      '¿Cuáles municipios crecieron más en 2024-2025?',
      'Compara La Matanza con La Plata',
    ],
  },
  {
    category: 'Seguridad',
    iconKey: 'seguridad',
    questions: [
      '¿Cuáles son los municipios con más hechos delictivos?',
      '¿Qué tipos de delitos son más frecuentes?',
    ],
  },
  {
    category: 'Agricultura',
    iconKey: 'agricultura',
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
      <Helmet>
        <title>Asistente IA · Dashboard PBA</title>
        <meta name="description" content="Consultá los 16 informes y 13 datasets de la Provincia de Buenos Aires en lenguaje natural." />
        <link rel="canonical" href="https://pba.openarg.org/chat" />
      </Helmet>
      {/* Header */}
      <div className="chat-header">
        <Link to="/" className="chat-back-link" aria-label="Volver al dashboard">
          <ArrowLeft size={18} />
          <span>Volver</span>
        </Link>
        <div className="chat-header-title">
          <span className="chat-header-icon" aria-hidden="true">
            <Sparkles size={22} />
          </span>
          <div>
            <h1>Asistente de Inteligencia Estratégica</h1>
            <p>Consultá los datos e informes del Dashboard PBA</p>
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
      <div className="chat-messages" aria-live="polite" aria-atomic="false">
        {messages.length === 0 ? (
          <div className="chat-welcome">
            <div className="chat-welcome-icon" aria-hidden="true">
              <Sparkles size={56} />
            </div>
            <h2>Bienvenido al Asistente de Inteligencia Estratégica</h2>
            <p>
              Puedo ayudarte a explorar los datos de la Provincia de Buenos Aires.
              Tengo acceso a 16 informes ejecutivos y 13 bases de datos con más de 80.000 registros.
            </p>

            <div className="chat-suggestions">
              {SUGGESTED_QUESTIONS.map((group) => {
                const Icon: IconComp = getCategoryIcon(group.iconKey);
                return (
                  <div key={group.category} className="chat-suggestion-group">
                    <h3>
                      <span className="chat-suggestion-icon" aria-hidden="true">
                        <Icon size={16} />
                      </span>
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
                );
              })}
            </div>
          </div>
        ) : (
          <div className="chat-message-list">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`chat-message ${message.role === 'user' ? 'chat-message-user' : 'chat-message-assistant'}`}
              >
                <div className="chat-message-avatar" aria-hidden="true">
                  {message.role === 'user' ? <User size={18} /> : <Sparkles size={18} />}
                </div>
                <div className="chat-message-content">
                  <div className="chat-message-role">
                    {message.role === 'user' ? 'Tú' : 'Asistente'}
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
                <div className="chat-message-avatar" aria-hidden="true">
                  <Sparkles size={18} />
                </div>
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
        <div className="chat-error" role="alert">
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
            placeholder="Escribí tu pregunta sobre los datos de la provincia..."
            rows={1}
            disabled={isLoading}
            className="chat-input"
            aria-label="Escribir pregunta"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="chat-submit-btn"
            aria-label="Enviar pregunta"
          >
            {isLoading ? (
              <svg className="chat-spinner" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.3" />
                <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              </svg>
            ) : (
              <Send size={18} />
            )}
          </button>
        </div>
        <p className="chat-input-hint">
          Presioná Enter para enviar, Shift+Enter para nueva línea
        </p>
      </form>
    </div>
  );
}
