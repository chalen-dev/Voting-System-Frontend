import { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';

import { showConfirmation, showToast } from '../../helpers/swalHelpers';
import { type Poll, type TabType, formatForDateTimeInput } from '../../features/poll/poll';
import PollTabs from '../../features/poll/PollTabs';
import PollTable from '../../features/poll/PollTable';
import Pagination from '../../components/navigation/Pagination';

export default function PollList() {
    const [isPanelOpen, setIsPanelOpen] = useState(true);
    const [activeTab, setActiveTab] = useState<TabType>('form');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    // --- Data State ---
    const [polls, setPolls] = useState<Poll[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // --- Pagination State ---
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // --- Form States ---
    const [editingPollId, setEditingPollId] = useState<string | null>(null);
    const [pollTitle, setPollTitle] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [pollStatus, setPollStatus] = useState('open');
    const [errorMessage, setErrorMessage] = useState('');

    // --- Filter States ---
    const [searchText, setSearchText] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [sortFilter, setSortFilter] = useState('newest');

    // --- Axios Configuration ---
    // FIX 1: Wrap api in useMemo so it doesn't trigger infinite loops in useCallback
    const api = useMemo(() => {
        return axios.create({
            baseURL: 'http://localhost:8000/api',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
            }
        });
    }, []);

    // --- Handlers ---
    const fetchPolls = useCallback(async () => {
        try {
            setIsLoading(true);
            const { data } = await api.get('/polls');

            // FIX 2: Protect against paginated objects from the backend
            const pollsArray = Array.isArray(data) ? data : (data?.data || []);
            setPolls(pollsArray);
        } catch (error) {
            console.error("Failed to fetch polls:", error);
        } finally {
            setIsLoading(false);
        }
    }, [api]); // ESLint is now happy because api is stable and included

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void fetchPolls();
    }, [fetchPolls]);

    // Reset to page 1 whenever filters change so users don't get stuck on an empty page
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setCurrentPage(1);
    }, [searchText, statusFilter, sortFilter]);

    const handleClearForm = () => {
        setEditingPollId(null);
        setPollTitle('');
        setStartDate('');
        setEndDate('');
        setPollStatus('open');
        setErrorMessage('');
    };

    const handleCreatePoll = async () => {
        setErrorMessage('');
        if (!pollTitle.trim()) return setErrorMessage('Please provide a poll title before initializing.');

        try {
            await api.post('/polls', {
                title: pollTitle,
                start_time: startDate || null,
                end_time: endDate || null,
                status: pollStatus,
                // Sending default options to satisfy backend validation
                options: ['Option 1', 'Option 2']
            });
            handleClearForm();
            await fetchPolls();
            showToast('Poll initialized successfully!');
        } catch (error: unknown) {
            let errMessage = 'Failed to create poll. Please try again.';
            if (axios.isAxiosError(error)) errMessage = error.response?.data?.message || errMessage;
            setErrorMessage(errMessage);
        }
    };

    const handleUpdatePoll = async () => {
        setErrorMessage('');
        if (!pollTitle.trim()) return setErrorMessage('Please provide a poll title before updating.');

        try {
            await api.put(`/polls/${editingPollId}`, {
                title: pollTitle,
                start_time: startDate || null,
                end_time: endDate || null,
                status: pollStatus,
                // Sending default options to satisfy backend validation
                options: ['Option 1', 'Option 2']
            });
            handleClearForm();
            await fetchPolls();
            showToast('Poll updated successfully!');
        } catch (error: unknown) {
            let errMessage = 'Failed to update poll. Please try again.';
            if (axios.isAxiosError(error)) errMessage = error.response?.data?.message || errMessage;
            setErrorMessage(errMessage);
        }
    };

    const handleEditClick = (poll: Poll) => {
        setEditingPollId(poll.id);
        setPollTitle(poll.title);
        setStartDate(formatForDateTimeInput(poll.start_time));
        setEndDate(formatForDateTimeInput(poll.end_time));
        setPollStatus(poll.status);
        setActiveTab('form');
        setIsPanelOpen(true);
    };

    const handleDelete = async (id: string) => {
        const isConfirmed = await showConfirmation(
            'Delete Poll',
            'Are you sure you want to delete this poll? This action cannot be undone.',
            false,
            'warning',
            'Yes, delete it'
        );
        if (!isConfirmed) return;

        try {
            await api.delete(`/polls/${id}`);
            if (editingPollId === id) handleClearForm();
            await fetchPolls();

            // Adjust page if we delete the last item on the current page
            if (paginatedPolls.length === 1 && currentPage > 1) {
                setCurrentPage(prev => prev - 1);
            }

            showToast('Poll deleted successfully!');
        } catch {
            showToast('Failed to delete poll', 'error');
        }
    };

    const handleBulkStatusChange = async (status: 'open' | 'closed') => {
        try {
            await api.post('/polls/bulk-status', { ids: selectedIds, status });
            setSelectedIds([]);
            await fetchPolls();
            showToast(`${selectedIds.length} polls marked as ${status}!`);
        } catch {
            showToast(`Failed to update polls to ${status}`, 'error');
        }
    };

    const handleBulkDelete = async () => {
        const isConfirmed = await showConfirmation(
            'Delete Multiple Polls',
            `Are you sure you want to delete ${selectedIds.length} selected polls?`,
            false,
            'warning',
            'Yes, delete them'
        );
        if (!isConfirmed) return;

        try {
            await api.delete('/polls/bulk-destroy', { data: { ids: selectedIds } });
            const count = selectedIds.length;
            if (selectedIds.includes(editingPollId || '')) handleClearForm();
            setSelectedIds([]);
            await fetchPolls();

            // Move back to page 1 to be safe after bulk deletions
            setCurrentPage(1);

            showToast(`${count} polls deleted successfully!`);
        } catch {
            showToast('Failed to delete selected polls', 'error');
        }
    };

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    // --- Filtering and Sorting Logic ---
    const filteredPolls = useMemo(() => {
        return polls
            .filter((poll) => {
                const matchesSearch = poll.title.toLowerCase().includes(searchText.toLowerCase()) ||
                    poll.id.toLowerCase().includes(searchText.toLowerCase());
                const matchesStatus = statusFilter === 'all' || poll.status === statusFilter;
                return matchesSearch && matchesStatus;
            })
            .sort((a, b) => {
                const dateA = a.start_time ? new Date(a.start_time).getTime() : 0;
                const dateB = b.start_time ? new Date(b.start_time).getTime() : 0;
                return sortFilter === 'newest' ? dateB - dateA : dateA - dateB;
            });
    }, [polls, searchText, statusFilter, sortFilter]);

    // Calculate pagination slices
    const totalPages = Math.ceil(filteredPolls.length / itemsPerPage);
    const paginatedPolls = filteredPolls.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 animate-page">
            <PollTabs
                isPanelOpen={isPanelOpen}
                setIsPanelOpen={setIsPanelOpen}
                activeTab={activeTab}
                setActiveTab={setActiveTab}

                // Form props
                editingPollId={editingPollId}
                pollTitle={pollTitle}
                setPollTitle={setPollTitle}
                startDate={startDate}
                setStartDate={setStartDate}
                endDate={endDate}
                setEndDate={setEndDate}
                pollStatus={pollStatus}
                setPollStatus={setPollStatus}
                errorMessage={errorMessage}
                setErrorMessage={setErrorMessage}
                handleClearForm={handleClearForm}
                handleCreatePoll={handleCreatePoll}
                handleUpdatePoll={handleUpdatePoll}

                // Filter props
                searchText={searchText}
                setSearchText={setSearchText}
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                sortFilter={sortFilter}
                setSortFilter={setSortFilter}

                // Action props
                selectedIds={selectedIds}
                handleBulkStatusChange={handleBulkStatusChange}
                handleBulkDelete={handleBulkDelete}
            />

            <div>
                <PollTable
                    isLoading={isLoading}
                    filteredPolls={paginatedPolls}
                    selectedIds={selectedIds}
                    setSelectedIds={setSelectedIds}
                    toggleSelect={toggleSelect}
                    handleEditClick={handleEditClick}
                    handleDelete={handleDelete}
                />

                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                />
            </div>
        </div>
    );
}