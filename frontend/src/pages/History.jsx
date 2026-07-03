import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { notesAPI } from '../api/index';

export default function History() {
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        notesAPI.listJobs()
            .then(res => setJobs(res.data.jobs))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    const handleDelete = async (id) => {
        const confirmed = window.confirm('Delete this note job? This cannot be undone.');
        if (!confirmed) return;

        await notesAPI.deleteJob(id);
        setJobs(prev => prev.filter(j => j._id !== id));
    };

    const statusCount = jobs.reduce((acc, job) => {
        acc[job.status] = (acc[job.status] || 0) + 1;
        return acc;
    }, {});

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center px-4">
                <div className="rounded-2xl border border-outline/50 bg-surface px-5 py-4 shadow-[0_16px_45px_rgba(0,0,0,0.05)]">
                    <span className="material-symbols-outlined animate-spin text-3xl text-primary">progress_activity</span>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-6xl space-y-6">
                <section className="rounded-[1.75rem] border border-outline/50 bg-surface p-5 shadow-[0_16px_45px_rgba(0,0,0,0.05)] sm:p-6">
                    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                        <div>
                            <p className="font-ui-small text-ui-small uppercase tracking-[0.18em] text-on-surface-variant">History</p>
                            <h1 className="mt-2 font-headline-lg text-4xl leading-tight text-on-surface">Recent notes</h1>
                            <p className="mt-3 max-w-2xl font-body-md text-body-md leading-7 text-on-surface-variant">
                                View generation status, open completed notes, or remove jobs you no longer need.
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={() => navigate('/dashboard/new')}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 font-ui-button text-ui-button text-on-primary shadow-lg shadow-primary/15 transition hover:bg-[#b54e1a]"
                        >
                            <span className="material-symbols-outlined text-[18px]">add</span>
                            New note
                        </button>
                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-3">
                        {[
                            { label: 'Total', value: jobs.length },
                            { label: 'Done', value: statusCount.done || 0 },
                            { label: 'In progress', value: (statusCount.pending || 0) + (statusCount.running || 0) },
                        ].map(item => (
                            <div key={item.label} className="rounded-2xl border border-outline/50 bg-surface-container-low px-4 py-3">
                                <p className="font-ui-small text-ui-small text-on-surface-variant">{item.label}</p>
                                <p className="mt-2 font-headline-md text-2xl text-on-surface">{item.value}</p>
                            </div>
                        ))}
                    </div>
                </section>

                {jobs.length === 0 ? (
                    <section className="rounded-[1.75rem] border border-dashed border-outline/60 bg-surface p-10 text-center shadow-[0_16px_45px_rgba(0,0,0,0.03)]">
                        <span className="material-symbols-outlined text-5xl text-primary">note_stack</span>
                        <h2 className="mt-4 font-headline-md text-2xl text-on-surface">No notes yet</h2>
                        <p className="mx-auto mt-2 max-w-md font-body-md text-body-md leading-7 text-on-surface-variant">
                            Create your first note job to start generating research summaries.
                        </p>
                    </section>
                ) : (
                    <div className="overflow-hidden rounded-[1.75rem] border border-outline/50 bg-surface shadow-[0_16px_45px_rgba(0,0,0,0.05)]">
                        <div className="grid grid-cols-[1.8fr_0.9fr_0.7fr_0.5fr] gap-4 border-b border-outline/50 px-5 py-3 font-ui-small text-ui-small uppercase tracking-[0.16em] text-on-surface-variant max-md:hidden">
                            <span>Topic</span>
                            <span>Created</span>
                            <span>Status</span>
                            <span className="text-right">Action</span>
                        </div>

                        <div className="divide-y divide-outline/40">
                            {jobs.map(job => (
                                <article key={job._id} className="grid gap-4 px-5 py-4 md:grid-cols-[1.8fr_0.9fr_0.7fr_0.5fr] md:items-center">
                                    <div className="min-w-0">
                                        <div className="flex items-start gap-3">
                                            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary-container text-on-primary-container">
                                                <span className="material-symbols-outlined text-[20px]">
                                                    {job.status === 'done' ? 'description' : job.status === 'failed' ? 'warning' : 'hourglass_empty'}
                                                </span>
                                            </div>
                                            <div className="min-w-0">
                                                <p className="truncate font-ui-label text-ui-label text-on-surface">{job.topic}</p>
                                                <p className="mt-1 truncate font-ui-small text-ui-small text-on-surface-variant">
                                                    {job.sourceFilename ? job.sourceFilename : 'No source file attached'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="font-ui-small text-ui-small text-on-surface-variant md:text-sm">
                                        {new Date(job.createdAt).toLocaleDateString('en-US', {
                                            month: 'short',
                                            day: 'numeric',
                                            year: 'numeric',
                                        })}
                                    </div>

                                    <div>
                                        <span
                                            className={`inline-flex items-center rounded-full px-3 py-1 font-ui-small text-ui-small capitalize ${job.status === 'done'
                                                ? 'bg-emerald-100 text-emerald-800'
                                                : job.status === 'failed'
                                                    ? 'bg-red-100 text-red-800'
                                                    : 'bg-amber-100 text-amber-900'
                                                }`}
                                        >
                                            {job.status}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-start gap-2 md:justify-end">
                                        <button
                                            type="button"
                                            onClick={() => navigate(`/dashboard/result/${job._id}`)}
                                            disabled={job.status !== 'done'}
                                            className="inline-flex items-center gap-2 rounded-xl border border-outline/60 px-3 py-2 font-ui-button text-ui-button text-on-surface transition hover:bg-surface-container-high disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                                            Open
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleDelete(job._id)}
                                            className="inline-flex items-center gap-2 rounded-xl border border-outline/60 px-3 py-2 font-ui-button text-ui-button text-on-surface-variant transition hover:bg-error-container hover:text-on-error-container"
                                        >
                                            <span className="material-symbols-outlined text-[18px]">delete</span>
                                            Delete
                                        </button>
                                    </div>
                                </article>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}