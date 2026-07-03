import { useParams, useNavigate } from 'react-router-dom';
import usePollJob from '../hooks/usePollJob';
import NoteViewer from '../components/NoteViewer';

export default function Result() {
    const { id } = useParams();
    const { job, loading } = usePollJob(id);
    const navigate = useNavigate();

    if (!job || (loading && !job)) {
        return (
            <div className="flex h-full items-center justify-center px-4">
                <div className="rounded-2xl border border-outline/50 bg-surface px-6 py-5 text-center shadow-[0_16px_45px_rgba(0,0,0,0.05)]">
                    <span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span>
                    <p className="mt-3 font-body-md text-body-md text-on-surface-variant">Setting up your notes...</p>
                </div>
            </div>
        );
    }

    if (job.status === 'running' || job.status === 'pending') {
        return (
            <div className="flex h-full items-center justify-center px-4">
                <div className="w-full max-w-xl rounded-[1.75rem] border border-outline/50 bg-surface p-6 shadow-[0_16px_45px_rgba(0,0,0,0.05)]">
                    <div className="flex items-start gap-4">
                        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-container text-on-primary-container">
                            <span className="material-symbols-outlined animate-spin text-[24px]">progress_activity</span>
                        </span>
                        <div>
                            <p className="font-headline-md text-2xl text-on-surface">Generating your notes</p>
                            <p className="mt-2 max-w-xl font-body-md text-body-md leading-7 text-on-surface-variant">
                                The agent is researching and structuring the content. This can take a short moment.
                            </p>
                        </div>
                    </div>

                    <div className="mt-6 rounded-2xl border border-outline/50 bg-surface-container-low px-4 py-4">
                        <p className="font-ui-small text-ui-small uppercase tracking-[0.18em] text-on-surface-variant">Current topic</p>
                        <p className="mt-2 font-ui-label text-ui-label text-on-surface">{job.topic}</p>
                        <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface-container-high">
                            <div className="h-full w-2/3 rounded-full bg-primary/80 animate-pulse" />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (job.status === 'failed') {
        return (
            <div className="flex h-full items-center justify-center px-4">
                <div className="w-full max-w-xl rounded-[1.75rem] border border-outline/50 bg-surface p-6 shadow-[0_16px_45px_rgba(0,0,0,0.05)]">
                    <div className="flex items-start gap-4">
                        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-error-container text-on-error-container">
                            <span className="material-symbols-outlined text-[24px]">error</span>
                        </span>
                        <div>
                            <p className="font-headline-md text-2xl text-on-surface">Generation failed</p>
                            <p className="mt-2 font-body-md text-body-md text-on-surface-variant">
                                {job.error || 'Something went wrong.'}
                            </p>
                        </div>
                    </div>
                <button
                    onClick={() => navigate('/dashboard/new')}
                        className="mt-6 inline-flex items-center justify-center rounded-2xl bg-primary px-4 py-3 font-ui-button text-ui-button text-on-primary shadow-lg shadow-primary/15 transition hover:bg-[#b54e1a]"
                >
                    Try Again
                </button>
                </div>
            </div>
        );
    }

    return <NoteViewer job={job} />;
}