import { useEffect, useState } from 'react';

type ConnectionStatus = 'checking' | 'connected' | 'offline';

function BackendStatus() {
  const [status, setStatus] =
    useState<ConnectionStatus>('checking');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    const timeout = window.setTimeout(() => {
      controller.abort();
    }, 5000);

    async function checkConnection() {
      try {
        const response = await fetch('/api/health', {
          signal: controller.signal,
          cache: 'no-store',
        });

        if (!response.ok) {
          throw new Error('Backend request failed.');
        }

        const data: unknown = await response.json();

        const healthy =
          typeof data === 'object' &&
          data !== null &&
          'status' in data &&
          data.status === 'ok';

        if (!healthy) {
          throw new Error('Unexpected backend response.');
        }

        if (active) setStatus('connected');
      } catch {
        if (active) setStatus('offline');
      } finally {
        window.clearTimeout(timeout);
      }
    }

    void checkConnection();

    return () => {
      active = false;
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [attempt]);

  function checkAgain() {
    setStatus('checking');
    setAttempt((previous) => previous + 1);
  }

  const label =
    status === 'connected'
      ? 'Backend connected'
      : status === 'offline'
        ? 'Backend offline'
        : 'Checking backend…';

  return (
    <div className="backend-status-container">
      <span
        className={`backend-status backend-${status}`}
        role="status"
      >
        <span className="connection-dot" aria-hidden="true" />
        {label}
      </span>

      <button
        type="button"
        className="text-button"
        disabled={status === 'checking'}
        onClick={checkAgain}
      >
        Check again
      </button>
    </div>
  );
}

export default BackendStatus;