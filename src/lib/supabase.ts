const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export interface ProjectData {
  id?: string;
  name: string;
  full_text: string;
  characters: any[];
  events: any[];
  locations: any[];
  terms: any[];
  total_chunks: number;
  created_at?: string;
  updated_at?: string;
}

class SupabaseClient {
  private url: string;
  private key: string;

  constructor(url: string, key: string) {
    this.url = url;
    this.key = key;
  }

  private async request(path: string, options: RequestInit = {}) {
    const headers = {
      'apikey': this.key,
      'Authorization': `Bearer ${this.key}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
      ...options.headers,
    };

    const response = await fetch(`${this.url}/rest/v1${path}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Supabase error: ${error}`);
    }

    const text = await response.text();
    return text ? JSON.parse(text) : null;
  }

  from(table: string) {
    return {
      select: (columns = '*') => ({
        eq: (column: string, value: any) => ({
          maybeSingle: async () => {
            try {
              const data = await this.request(`/${table}?${columns !== '*' ? `select=${columns}&` : ''}${column}=eq.${value}`, {
                method: 'GET',
              });
              return { data: data?.[0] || null, error: null };
            } catch (error) {
              return { data: null, error };
            }
          },
        }),
        order: (column: string, options: { ascending: boolean }) => ({
          then: async (resolve: any) => {
            try {
              const data = await this.request(`/${table}?select=${columns}&order=${column}.${options.ascending ? 'asc' : 'desc'}`, {
                method: 'GET',
              });
              resolve({ data: data || [], error: null });
            } catch (error) {
              resolve({ data: null, error });
            }
          },
        }),
      }),
      insert: (data: any) => ({
        select: () => ({
          single: async () => {
            try {
              const result = await this.request(`/${table}`, {
                method: 'POST',
                body: JSON.stringify(data),
              });
              return { data: result?.[0] || null, error: null };
            } catch (error) {
              return { data: null, error };
            }
          },
        }),
      }),
      update: (data: any) => ({
        eq: (column: string, value: any) => ({
          then: async (resolve: any) => {
            try {
              await this.request(`/${table}?${column}=eq.${value}`, {
                method: 'PATCH',
                body: JSON.stringify(data),
              });
              resolve({ error: null });
            } catch (error) {
              resolve({ error });
            }
          },
        }),
      }),
      delete: () => ({
        eq: (column: string, value: any) => ({
          then: async (resolve: any) => {
            try {
              await this.request(`/${table}?${column}=eq.${value}`, {
                method: 'DELETE',
              });
              resolve({ error: null });
            } catch (error) {
              resolve({ error });
            }
          },
        }),
      }),
    };
  }
}

export const supabase = new SupabaseClient(supabaseUrl, supabaseAnonKey);
