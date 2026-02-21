import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

export const useTokens = (clinicId: string, sessionId: string) => {
    const [currentToken, setCurrentToken] = useState(1);
    const [noShows, setNoShows] = useState<number[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!clinicId || !sessionId) {
            setLoading(false);
            setCurrentToken(1);
            setNoShows([]);
            return;
        }

        setLoading(true);
        // 1. Initial Fetch
        const fetchState = async () => {
            const { data } = await supabase
                .from('token_state')
                .select('*')
                .eq('clinic_id', clinicId)
                .eq('session_id', sessionId)
                .single();

            if (data) {
                setCurrentToken(data.current_token);
                setNoShows(data.no_shows || []);
            }
            setLoading(false);
        };

        fetchState();

        // 2. Real-time Subscription
        const channel = supabase
            .channel(`token_changes_${sessionId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'token_state',
                    filter: `session_id=eq.${sessionId}`,
                },
                (payload: any) => {
                    const newState = payload.new;
                    if (newState) {
                        setCurrentToken(newState.current_token);
                        setNoShows(newState.no_shows || []);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [clinicId, sessionId]);

    const updateToken = async (newToken: number, newNoShows?: number[]) => {
        const { error } = await supabase
            .from('token_state')
            .update({
                current_token: newToken,
                no_shows: newNoShows || noShows,
                last_updated: new Date().toISOString()
            })
            .eq('clinic_id', clinicId)
            .eq('session_id', sessionId);

        if (error) console.error('Error updating token:', error);
    };

    return { currentToken, noShows, loading, updateToken };
};
