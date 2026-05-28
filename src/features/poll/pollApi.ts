// File: src/features/poll/pollApi.ts
import api from '../../api/axios'; // Adjust path as needed
import { type Poll } from './poll';

export interface PollPayload {
    title: string;
    start_time: string | null;
    end_time: string | null;
    status: string;
    options?: string[];
}

export const pollApi = {
    // Fetch all polls
    getAll: async (): Promise<Poll[]> => {
        const { data } = await api.get('/polls');
        // Handle both direct arrays and Laravel-style paginated objects
        return Array.isArray(data) ? data : (data?.data || []);
    },

    // Create a new poll
    create: async (payload: PollPayload): Promise<Poll> => {
        const { data } = await api.post('/polls', {
            ...payload,
            // Keeping your default options for backend validation
            options: payload.options || ['Option 1', 'Option 2']
        });
        return data;
    },

    // Update an existing poll
    update: async (id: string, payload: PollPayload): Promise<Poll> => {
        const { data } = await api.put(`/polls/${id}`, {
            ...payload,
            options: payload.options || ['Option 1', 'Option 2']
        });
        return data;
    },

    // Delete a single poll
    delete: async (id: string): Promise<void> => {
        await api.delete(`/polls/${id}`);
    },

    // Bulk status update
    bulkStatus: async (ids: string[], status: 'open' | 'closed'): Promise<void> => {
        await api.post('/polls/bulk-status', { ids, status });
    },

    // Bulk delete
    bulkDelete: async (ids: string[]): Promise<void> => {
        await api.delete('/polls/bulk-destroy', { data: { ids } });
    }
};