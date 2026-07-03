import { useState, useRef } from 'react';
import { notesAPI } from '../api/index';
import { useNavigate } from 'react-router-dom';

export default function UploadForm() {
    const [topic, setTopic] = useState('');
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const fileInputRef = useRef();
    const navigate = useNavigate();

    const MAX_SIZE = 50 * 1024 * 1024;

    const handleFile = (e) => {
        const f = e.target.files[0];
        if (!f) return;

        if (f.size > MAX_SIZE) {
            setError('File must be 50 MB or smaller.');
            e.target.value = '';
            return;
        }

        setFile(f);
        setError('');
    };

    const handleDrop = (e) => {
        e.preventDefault();
        const f = e.dataTransfer.files[0];
        if (!f) return;

        if (f.size > MAX_SIZE) {
            setError('File must be 50 MB or smaller.');
            return;
        }

        setFile(f);
        setError('');
    };

    const handleRemoveFile = () => {
        setFile(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!topic.trim()) {
            setError('Please enter a topic.');
            return;
        }

        setError('');
        setLoading(true);

        try {
            let res;
            if (file) {
                const form = new FormData();
                form.append('topic', topic);
                form.append('file', file);
                res = await notesAPI.runWithFile(form);
            } else {
                res = await notesAPI.run({ topic });
            }
            navigate(`/dashboard/result/${res.data.jobId}`);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to start job.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="rounded-[1.75rem] border border-outline/50 bg-surface p-5 shadow-[0_16px_45px_rgba(0,0,0,0.05)]">
                <label className="block font-ui-label text-ui-label text-on-surface" htmlFor="topic">
                    Topic or research title
                </label>
                <input
                    id="topic"
                    type="text"
                    placeholder="Example: The mechanics of stellar nucleosynthesis"
                    value={topic}
                    onChange={e => {
                        setTopic(e.target.value);
                        setError('');
                    }}
                    className="mt-3 w-full rounded-2xl border border-outline/70 bg-surface-container-lowest px-4 py-3 font-body-md text-body-md text-on-surface outline-none transition focus:border-primary focus:bg-surface focus-ring"
                />

                <p className="mt-3 max-w-2xl font-body-md text-body-md leading-7 text-on-surface-variant">
                    Provide a clear topic. You can optionally attach a PDF, TXT, or Markdown file as source material.
                </p>

                <div className="mt-5 rounded-2xl border border-outline/50 bg-surface-container-low p-4">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <p className="font-ui-label text-ui-label text-on-surface">Reference file</p>
                            <p className="font-ui-small text-ui-small text-on-surface-variant">Optional, up to 50 MB</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="inline-flex items-center gap-2 rounded-xl border border-outline/60 bg-surface px-4 py-2 font-ui-button text-ui-button text-on-surface hover:bg-surface-container-high"
                        >
                            <span className="material-symbols-outlined text-[18px]">upload</span>
                            Choose file
                        </button>
                    </div>

                    <div
                        className="mt-4 flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-outline/70 bg-surface/80 px-4 py-6 text-center transition hover:border-primary hover:bg-surface"
                        onDrop={handleDrop}
                        onDragOver={e => e.preventDefault()}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <span className="material-symbols-outlined text-4xl text-primary">cloud_upload</span>
                        <p className="mt-3 font-ui-label text-ui-label text-on-surface">Drag and drop a file here</p>
                        <p className="mt-1 max-w-sm font-ui-small text-ui-small leading-6 text-on-surface-variant">
                            Drop a document or browse from your device. The file is only used for this generation job.
                        </p>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".pdf,.txt,.md"
                            className="hidden"
                            onChange={handleFile}
                        />
                    </div>

                    {file && (
                        <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-outline/60 bg-surface px-4 py-3">
                            <div className="min-w-0">
                                <p className="truncate font-ui-label text-ui-label text-on-surface">{file.name}</p>
                                <p className="font-ui-small text-ui-small text-on-surface-variant">
                                    {(file.size / (1024 * 1024)).toFixed(1)} MB
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={handleRemoveFile}
                                className="rounded-lg p-2 text-on-surface-variant hover:bg-surface-container-high hover:text-error"
                                aria-label="Remove selected file"
                            >
                                <span className="material-symbols-outlined text-[18px]">close</span>
                            </button>
                        </div>
                    )}
                </div>

                {error && (
                    <div role="alert" className="mt-4 rounded-2xl border border-error/20 bg-error-container px-4 py-3">
                        <p className="font-ui-small text-ui-small text-on-error-container">{error}</p>
                    </div>
                )}

                <button
                    type="submit"
                    disabled={loading || !topic.trim()}
                    className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 font-ui-button text-ui-button text-on-primary shadow-lg shadow-primary/15 transition hover:bg-[#b54e1a] disabled:cursor-not-allowed disabled:opacity-60"
                >
                    <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
                    {loading ? 'Starting...' : 'Generate notes'}
                </button>
            </div>
        </form>
    );
}