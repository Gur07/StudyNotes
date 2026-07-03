import UploadForm from '../components/UploadForm';

export default function NewNote() {
    return (
        <div className="h-full overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto flex max-w-4xl flex-col gap-6">
                <section className="rounded-[1.75rem] border border-outline/50 bg-surface p-5 shadow-[0_16px_45px_rgba(0,0,0,0.05)] sm:p-6">
                    <p className="font-ui-small text-ui-small uppercase tracking-[0.18em] text-on-surface-variant">New note</p>
                    <h1 className="mt-2 font-headline-lg text-4xl leading-tight text-on-surface">Generate a research note</h1>
                    <p className="mt-3 max-w-2xl font-body-md text-body-md leading-7 text-on-surface-variant">
                        Start with a topic, optionally attach a source file, and the backend will create a structured note job for you.
                    </p>
                </section>

                <UploadForm />
            </div>
        </div>
    );
}