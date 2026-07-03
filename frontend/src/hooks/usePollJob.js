import { useState, useEffect, useRef } from 'react';
import { notesAPI } from '../api/index';

export default function usePollJob(jobId) {
    const [job, setJob]         = useState(null);
    const [loading, setLoading] = useState(false);
    const intervalRef           = useRef(null);

    useEffect(() => {
        if (!jobId) return;
        setLoading(true);

        const poll = async () => {
            try {
                const res = await notesAPI.getJob(jobId);
                const data = res.data.job;
                setJob(data);
                if (['done', 'failed'].includes(data.status)) {
                    clearInterval(intervalRef.current);
                    setLoading(false);
                }
            } catch {
                clearInterval(intervalRef.current);
                setLoading(false);
            }
        };

        poll();
        intervalRef.current = setInterval(poll, 3000);
        return () => clearInterval(intervalRef.current);
    }, [jobId]);

    return { job, loading };
}