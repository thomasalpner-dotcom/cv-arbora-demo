
export interface JobAd {
    id: string;
    headline: string;
    company_name: string;
    occupation: string;
    workplace_address: {
        municipality: string;
        region: string;
        city?: string;
    };
    description: {
        text: string;
        text_formatted?: string;
    };
    webpage_url: string;
    publication_date: string;
    last_application_date: string;
    source?: string;
    isExternal?: boolean;
}

export interface SearchResponse {
    total: {
        value: number;
    };
    hits: JobAd[];
}

export class JobSearchService {
    private static API_BASE = 'https://jobsearch.api.jobtechdev.se';

    static async searchJobs(query: string, location?: string): Promise<SearchResponse> {
        const params = new URLSearchParams();

        // Combine query and location for simple but effective search
        // JobSearch API handles multiple terms well in 'q'
        let fullQuery = query;
        if (location) {
            fullQuery += ` ${location}`;
        }

        params.append('q', fullQuery);
        params.append('limit', '20');

        try {
            const response = await fetch(`${this.API_BASE}/search?${params.toString()}`, {
                headers: {
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`JobSearch API error: ${response.statusText}`);
            }

            const data = await response.json();
            return {
                total: data.total,
                hits: data.hits.map((hit: any) => ({
                    id: hit.id,
                    headline: hit.headline,
                    company_name: hit.employer.name,
                    occupation: hit.occupation.label,
                    workplace_address: {
                        municipality: hit.workplace_address.municipality,
                        region: hit.workplace_address.region,
                        city: hit.workplace_address.city
                    },
                    description: {
                        text: hit.description.text,
                        text_formatted: hit.description.text_formatted
                    },
                    webpage_url: hit.webpage_url,
                    publication_date: hit.publication_date,
                    last_application_date: hit.last_application_date,
                    source: 'Platsbank',
                    isExternal: false
                }))
            };
        } catch (error) {
            console.error("Failed to fetch jobs:", error);
            throw error;
        }
    }

    static async searchJobAdLinks(query: string, location?: string): Promise<SearchResponse> {
        const params = new URLSearchParams();
        params.append('q', query);
        if (location) params.append('location', location);
        params.append('limit', '50');

        try {
            const response = await fetch(`https://jobad-links.api.jobtechdev.se/links?${params.toString()}`, {
                headers: { 'Accept': 'application/json' }
            });

            if (!response.ok) {
                console.warn('JobAd Links API error:', response.statusText);
                return { total: { value: 0 }, hits: [] };
            }

            const data: any = await response.json();

            return {
                total: { value: data.total || 0 },
                hits: (data.hits || []).map((hit: any) => ({
                    id: hit.id || `ext_${Math.random().toString(36).substr(2, 9)}`,
                    headline: hit.headline || 'Okänd titel',
                    company_name: hit.employer?.name || 'Okänt företag',
                    occupation: hit.headline || '',
                    workplace_address: {
                        municipality: hit.workplace_address?.municipality || '',
                        region: hit.workplace_address?.region || '',
                        city: hit.workplace_address?.municipality || ''
                    },
                    description: {
                        text: 'Se fullständig beskrivning på originalkällan',
                        text_formatted: '<p>Se fullständig beskrivning på originalkällan</p>'
                    },
                    webpage_url: hit.webpage_url || '',
                    publication_date: hit.publication_date || new Date().toISOString(),
                    last_application_date: '',
                    source: this.getSourceName(hit.source_site || hit.webpage_url),
                    isExternal: true
                }))
            };
        } catch (error) {
            console.warn('JobAd Links API failed:', error);
            return { total: { value: 0 }, hits: [] };
        }
    }

    private static getSourceName(sourceOrUrl: string): string {
        if (!sourceOrUrl) return 'Extern källa';
        const url = sourceOrUrl.toLowerCase();
        if (url.includes('linkedin')) return 'LinkedIn';
        if (url.includes('indeed')) return 'Indeed';
        if (url.includes('stepstone')) return 'StepStone';
        if (url.includes('academicwork')) return 'Academic Work';
        if (url.includes('monster')) return 'Monster';
        return 'Extern källa';
    }

    static async searchAllSources(query: string, location?: string): Promise<SearchResponse> {
        try {
            const [platsbank, external] = await Promise.all([
                this.searchJobs(query, location),
                this.searchJobAdLinks(query, location)
            ]);

            return {
                total: { value: platsbank.total.value + external.total.value },
                hits: [...platsbank.hits, ...external.hits]
            };
        } catch (error) {
            console.error("Failed to search all sources:", error);
            throw error;
        }
    }
}
