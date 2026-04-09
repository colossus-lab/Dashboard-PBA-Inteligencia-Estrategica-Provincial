import { useState, useEffect } from 'react';
import type { ReportData } from '../types/report';

interface UseReportDataReturn {
  markdown: string | null;
  data: ReportData | null;
  loading: boolean;
  error: string | null;
}

export function useReportData(mdPath: string, dataPath: string): UseReportDataReturn {
  const [markdown, setMarkdown] = useState<string | null>(null);
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([
      fetch(mdPath).then(r => r.ok ? r.text() : Promise.reject(`MD not found: ${mdPath}`)),
      fetch(dataPath).then(r => r.ok ? r.json() : Promise.reject(`Data not found: ${dataPath}`)),
    ])
      .then(([md, json]) => {
        if (!cancelled) {
          setMarkdown(md);
          setData(json);
          setLoading(false);
        }
      })
      .catch(err => {
        if (!cancelled) {
          setError(String(err));
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [mdPath, dataPath]);

  return { markdown, data, loading, error };
}
