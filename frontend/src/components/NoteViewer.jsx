import { useState, useEffect, useRef } from 'react';
import { notesAPI } from '../api/index';

function extractHeadings(md) {
    if (!md) return [];

    return md
        .split('\n')
        .filter(line => /^#{1,3}\s+/.test(line))
        .map((line, i) => ({
            id: `heading-${i}`,
            text: line.replace(/^#{1,3}\s+/, ''),
        }));
}

function renderInline(text) {
    const nodes = [];
    let remaining = text;
    let key = 0;

    while (remaining.length > 0) {
        const match = remaining.match(/(\*\*.+?\*\*|\*[^*]+?\*|`[^`]+`|\[[^\]]+\]\((https?:\/\/[^)]+)\))/);

        if (!match) {
            nodes.push(remaining);
            break;
        }

        const index = match.index || 0;
        if (index > 0) {
            nodes.push(remaining.slice(0, index));
        }

        const token = match[0];

        if (token.startsWith('**')) {
            nodes.push(<strong key={`strong-${key++}`}>{token.slice(2, -2)}</strong>);
        } else if (token.startsWith('*')) {
            nodes.push(<em key={`em-${key++}`}>{token.slice(1, -1)}</em>);
        } else if (token.startsWith('`')) {
            nodes.push(
                <code key={`code-${key++}`} className="rounded bg-surface-container-high px-1.5 py-0.5 font-mono text-[0.92em] text-on-surface">
                    {token.slice(1, -1)}
                </code>
            );
        } else {
            const linkMatch = token.match(/^\[([^\]]+)\]\((https?:\/\/[^)]+)\)$/);
            if (linkMatch) {
                nodes.push(
                    <a
                        key={`link-${key++}`}
                        href={linkMatch[2]}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="text-primary underline decoration-primary/40 underline-offset-4"
                    >
                        {linkMatch[1]}
                    </a>
                );
            } else {
                nodes.push(token);
            }
        }

        remaining = remaining.slice(index + token.length);
    }

    return nodes;
}

function renderMarkdown(md) {
    if (!md) return null;

    const lines = md.split('\n');
    const blocks = [];
    let paragraph = [];
    let listItems = [];
    let codeBlock = [];
    let inCodeBlock = false;
    let headingIndex = 0;
    let blockKey = 0;

    const flushParagraph = () => {
        if (!paragraph.length) return;

        blocks.push(
            <p key={`p-${blockKey++}`} className="mb-5 font-body-md text-[15px] leading-8 text-on-surface-variant">
                {paragraph.map((line, index) => (
                    <span key={`${line}-${index}`}>
                        {index > 0 && ' '}
                        {renderInline(line)}
                    </span>
                ))}
            </p>
        );
        paragraph = [];
    };

    const flushList = () => {
        if (!listItems.length) return;

        blocks.push(
            <ul key={`ul-${blockKey++}`} className="mb-5 space-y-2 pl-5">
                {listItems.map((item, index) => (
                    <li key={`${item}-${index}`} className="list-disc font-body-md text-[15px] leading-7 text-on-surface-variant">
                        {renderInline(item)}
                    </li>
                ))}
            </ul>
        );
        listItems = [];
    };

    const flushCode = () => {
        if (!codeBlock.length) return;

        blocks.push(
            <pre key={`codeblock-${blockKey++}`} className="mb-5 overflow-x-auto rounded-2xl border border-outline/50 bg-surface-container-low p-4 text-sm text-on-surface-variant">
                <code className="font-mono leading-7">{codeBlock.join('\n')}</code>
            </pre>
        );
        codeBlock = [];
    };

    for (const rawLine of lines) {
        const line = rawLine.trimEnd();

        if (line.startsWith('```')) {
            if (inCodeBlock) {
                flushCode();
            } else {
                flushParagraph();
                flushList();
            }
            inCodeBlock = !inCodeBlock;
            continue;
        }

        if (inCodeBlock) {
            codeBlock.push(rawLine);
            continue;
        }

        if (!line.trim()) {
            flushParagraph();
            flushList();
            continue;
        }

        const headingMatch = line.match(/^(#{1,3})\s+(.+)$/);
        if (headingMatch) {
            flushParagraph();
            flushList();

            const level = headingMatch[1].length;
            const HeadingTag = `h${Math.min(level + 1, 4)}`;
            const headingClasses = {
                2: 'mb-3 mt-8 font-headline-md text-2xl text-on-surface',
                3: 'mb-2 mt-6 font-headline-md text-xl text-on-surface',
                4: 'mb-2 mt-5 font-ui-label text-lg font-semibold text-on-surface',
            };

            blocks.push(
                <HeadingTag key={`h-${blockKey++}`} id={`heading-${headingIndex++}`} className={headingClasses[level] || headingClasses[3]}>
                    {renderInline(headingMatch[2])}
                </HeadingTag>
            );
            continue;
        }

        const quoteMatch = line.match(/^>\s+(.+)$/);
        if (quoteMatch) {
            flushParagraph();
            flushList();

            blocks.push(
                <blockquote key={`quote-${blockKey++}`} className="mb-5 rounded-r-2xl border-l-4 border-primary bg-surface-container-low px-4 py-3 font-body-md text-[15px] leading-8 text-on-surface-variant italic">
                    {renderInline(quoteMatch[1])}
                </blockquote>
            );
            continue;
        }

        const listMatch = line.match(/^-\s+(.+)$/);
        if (listMatch) {
            flushParagraph();
            listItems.push(listMatch[1]);
            continue;
        }

        if (listItems.length) {
            flushList();
        }

        paragraph.push(line);
    }

    flushParagraph();
    flushList();
    flushCode();

    return blocks;
}

export default function NoteViewer({ job }) {
    const [content, setContent] = useState(job?.finalMd || '');
    const [editMode, setEditMode] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const headings = extractHeadings(content);
    const textareaRef = useRef();

    useEffect(() => {
        if (job?.finalMd) setContent(job.finalMd);
    }, [job?.finalMd]);

    useEffect(() => {
        if (editMode) {
            textareaRef.current?.focus();
        }
    }, [editMode]);

    const handleSave = async () => {
        setSaving(true);
        try {
            await notesAPI.update(job._id, { finalMd: content });
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
            setEditMode(false);
        } catch {}
        setSaving(false);
    };

    const handleDownload = async () => {
        try {
            const res = await notesAPI.download(job._id);
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${job.topic}.md`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch {}
    };

    return (
        <div className="h-full overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto grid max-w-7xl gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
                <aside className="rounded-[1.75rem] border border-outline/50 bg-surface p-5 shadow-[0_16px_45px_rgba(0,0,0,0.05)] xl:sticky xl:top-6 xl:h-fit">
                    <p className="font-ui-small text-ui-small uppercase tracking-[0.18em] text-on-surface-variant">Document outline</p>
                    <nav className="mt-4 flex flex-col gap-1">
                        {headings.length > 0 ? headings.map((heading, index) => (
                            <button
                                key={heading.id}
                                type="button"
                                onClick={() => document.getElementById(heading.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                                className={`rounded-xl px-3 py-2 text-left font-ui-small text-ui-small transition ${index === 0
                                    ? 'bg-primary/10 text-primary'
                                    : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                                    }`}
                            >
                                {heading.text}
                            </button>
                        )) : (
                            <p className="mt-4 font-body-md text-body-md text-on-surface-variant">No headings were detected in this document.</p>
                        )}
                    </nav>

                    <div className="mt-6 space-y-3 border-t border-outline/50 pt-5">
                        <div className="flex items-center gap-2 text-on-surface-variant">
                            <span className="material-symbols-outlined text-[18px]">calendar_today</span>
                            <span className="font-ui-small text-ui-small">
                                {new Date(job?.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                        </div>
                        <div className="flex items-center gap-2 text-on-surface-variant">
                            <span className="material-symbols-outlined text-[18px]">format_size</span>
                            <span className="font-ui-small text-ui-small">{content.split(/\s+/).filter(Boolean).length.toLocaleString()} words</span>
                        </div>
                        <div className="flex items-center gap-2 text-on-surface-variant">
                            <span className="material-symbols-outlined text-[18px]">description</span>
                            <span className="font-ui-small text-ui-small capitalize">{job?.status}</span>
                        </div>
                    </div>
                </aside>

                <section className="rounded-[1.75rem] border border-outline/50 bg-surface p-5 shadow-[0_16px_45px_rgba(0,0,0,0.05)] sm:p-6 lg:p-8">
                    <div className="flex flex-col gap-4 border-b border-outline/50 pb-5 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                            <div className="flex flex-wrap gap-2">
                                <span className="rounded-full bg-surface-container-low px-3 py-1 font-ui-small text-ui-small text-on-surface-variant">
                                    {job?.mode || 'closed_book'}
                                </span>
                                {job?.needsResearch && (
                                    <span className="rounded-full bg-amber-100 px-3 py-1 font-ui-small text-ui-small text-amber-900">
                                        web research
                                    </span>
                                )}
                                {job?.needsRag && (
                                    <span className="rounded-full bg-primary/10 px-3 py-1 font-ui-small text-ui-small text-primary">
                                        rag
                                    </span>
                                )}
                                {job?.contextProvided && (
                                    <span className="rounded-full bg-secondary/10 px-3 py-1 font-ui-small text-ui-small text-secondary">
                                        source attached
                                    </span>
                                )}
                            </div>

                            <h1 className="mt-4 font-headline-lg text-[clamp(2.5rem,4vw,4rem)] leading-[0.98] text-on-surface">
                                {job?.topic}
                            </h1>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            {editMode ? (
                                <>
                                    <button
                                        onClick={() => setEditMode(false)}
                                        className="inline-flex items-center justify-center rounded-2xl border border-outline/60 px-4 py-3 font-ui-button text-ui-button text-on-surface transition hover:bg-surface-container-high"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSave}
                                        disabled={saving}
                                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 font-ui-button text-ui-button text-on-primary shadow-lg shadow-primary/15 transition hover:bg-[#b54e1a] disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">save</span>
                                        {saving ? 'Saving...' : saved ? 'Saved' : 'Save'}
                                    </button>
                                </>
                            ) : (
                                <button
                                    onClick={() => setEditMode(true)}
                                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-outline/60 px-4 py-3 font-ui-button text-ui-button text-on-surface transition hover:bg-surface-container-high"
                                >
                                    <span className="material-symbols-outlined text-[18px]">edit</span>
                                    Edit
                                </button>
                            )}

                            <button
                                onClick={handleDownload}
                                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-outline/60 px-4 py-3 font-ui-button text-ui-button text-on-surface transition hover:bg-surface-container-high"
                            >
                                <span className="material-symbols-outlined text-[18px]">download</span>
                                Export MD
                            </button>
                        </div>
                    </div>

                    <div className="pt-6">
                        {editMode ? (
                            <textarea
                                ref={textareaRef}
                                value={content}
                                onChange={e => setContent(e.target.value)}
                                className="min-h-[70vh] w-full resize-y rounded-2xl border border-outline/60 bg-surface-container-lowest p-5 font-body-md text-[15px] leading-8 text-on-surface outline-none focus:border-primary focus-ring"
                            />
                        ) : (
                            <div className="space-y-1">
                                {renderMarkdown(content)}
                            </div>
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
}