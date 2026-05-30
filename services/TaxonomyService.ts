
export interface TaxonomyConcept {
    id: string;
    preferred_label: string;
    type: string;
}

export class TaxonomyService {
    private static API_BASE = 'https://taxonomy.api.jobtechdev.se/v1/taxonomy';

    /**
     * Search for concepts using the autocomplete suggester
     */
    static async searchConcepts(query: string, type: 'occupation-name' | 'skill'): Promise<TaxonomyConcept[]> {
        if (!query || query.length < 2) return [];

        const params = new URLSearchParams();
        params.append('query-string', query);
        params.append('type', type);
        params.append('limit', '10');

        try {
            const response = await fetch(`${this.API_BASE}/suggesters/autocomplete?${params.toString()}`, {
                headers: {
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Taxonomy API error: ${response.statusText}`);
            }

            const data = await response.json();

            // The API returns an object with a "value" array
            if (!data.value || !Array.isArray(data.value)) return [];

            return data.value.map((item: any) => ({
                id: item['taxonomy/id'] || Math.random().toString(),
                preferred_label: item['taxonomy/preferred-label'],
                type: item['taxonomy/type']
            }));
        } catch (error) {
            console.error(`Failed to fetch ${type} concepts:`, error);
            return [];
        }
    }

    static async getOccupations(query: string): Promise<TaxonomyConcept[]> {
        return this.searchConcepts(query, 'occupation-name');
    }

    static async getSkills(query: string): Promise<TaxonomyConcept[]> {
        return this.searchConcepts(query, 'skill');
    }
}
