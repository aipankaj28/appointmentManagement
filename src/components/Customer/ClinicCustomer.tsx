import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Users, AlertCircle, Clock } from 'lucide-react';
import { useTokens } from '../../services/useTokens';
import { supabase } from '../../services/supabaseClient';

const ClinicCustomer = () => {
    const { clinicSlug } = useParams();
    const [clinicInfo, setClinicInfo] = useState<{ id: string, name: string } | null>(null);
    const [sessionInfo, setSessionInfo] = useState<{ id: string, name: string } | null>(null);

    // 1. Fetch Clinic Info once on slug change
    useEffect(() => {
        const fetchClinic = async () => {
            if (!clinicSlug) return;
            const { data } = await supabase
                .from('clinics')
                .select('id, name')
                .eq('slug', clinicSlug)
                .single();
            if (data) setClinicInfo(data);
        };
        fetchClinic();
    }, [clinicSlug]);

    // 2. Subscribe to active session changes for this clinic
    useEffect(() => {
        if (!clinicInfo?.id) return;

        const fetchActiveSession = async () => {
            const { data, error } = await supabase
                .from('clinic_sessions')
                .select('id, name')
                .eq('clinic_id', clinicInfo.id)
                .eq('is_active', true)
                .maybeSingle();

            if (error) {
                console.error('Customer: Error fetching session:', error);
                setSessionInfo(null);
            } else {
                setSessionInfo(data);
            }
        };

        // Initial fetch
        fetchActiveSession();

        // Subscribe to any changes in the clinic's sessions
        const sessionChannel = supabase
            .channel(`session_updates_${clinicInfo.id}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'clinic_sessions',
                    filter: `clinic_id=eq.${clinicInfo.id}`,
                },
                (payload) => {
                    console.log('Customer: Session change detected:', payload);
                    fetchActiveSession();
                }
            )
            .subscribe((status) => {
                console.log(`Customer: Session subscription status for ${clinicInfo.name}:`, status);
            });

        return () => {
            console.log('Customer: Cleaning up session subscription');
            supabase.removeChannel(sessionChannel);
        };
    }, [clinicInfo?.id]);

    const { currentToken, noShows, loading: tokensLoading } = useTokens(clinicInfo?.id || '', sessionInfo?.id || '');

    if (!clinicInfo) return <div className="glass-card animate-fade-in">Clinic not found or loading...</div>;

    if (!sessionInfo) return (
        <div className="animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto', width: '100%' }}>
            <div className="glass-card" style={{ textAlign: 'center', padding: '5rem 2rem' }}>
                <Users size={64} className="text-gradient" style={{ marginBottom: '1.5rem', opacity: 0.5 }} />
                <h1 className="text-gradient" style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>{clinicInfo.name}</h1>

                <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', marginTop: '1rem' }}>
                    There are no active sessions at the moment. Please check back later or contact the clinic for more information.
                </p>
                <div style={{ marginTop: '3rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                    Thank you for your patience.
                </div>
            </div>
        </div>
    );

    if (tokensLoading) return <div className="glass-card animate-fade-in">Loading live queue...</div>;

    return (
        <div className="animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto', width: '100%' }}>
            <div className="glass-card" style={{ textAlign: 'center', marginBottom: '1.5rem', padding: '1.5rem' }}>
                <h1 className="text-gradient" style={{ fontSize: 'clamp(1.75rem, 8vw, 2.5rem)', marginBottom: '0.5rem' }}>{clinicInfo.name}</h1>
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.75rem', color: 'var(--text-muted)', flexWrap: 'wrap', fontSize: '0.9rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Clock size={16} />
                        <span>{sessionInfo.name} Session</span>
                    </div>
                    <span style={{ color: 'var(--glass-border)', display: 'none' }}>|</span>
                    <div className="badge badge-active" style={{ fontSize: '0.75rem' }}>Live Updates Enabled</div>
                </div>
            </div>

            <div className="glass-card" style={{ textAlign: 'center', padding: 'clamp(3rem, 10vw, 5rem) 1rem', position: 'relative', overflow: 'hidden' }}>
                {/* Decorative background glow */}
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: 'clamp(150px, 50vw, 300px)',
                    height: 'clamp(150px, 50vw, 300px)',
                    background: 'var(--primary)',
                    filter: 'blur(80px)',
                    opacity: '0.15',
                    pointerEvents: 'none'
                }} />

                <div style={{ position: 'relative', zIndex: '1' }}>
                    <span style={{ fontSize: 'clamp(0.8rem, 3vw, 1rem)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.2em' }}>Now Serving</span>
                    <div style={{ fontSize: 'clamp(6rem, 35vw, 12rem)', fontWeight: '900', lineHeight: '0.9', margin: '0.5rem 0', color: 'white' }}>
                        {currentToken.toString().padStart(2, '0')}
                    </div>
                    <p style={{ color: 'var(--accent)', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontSize: 'clamp(0.9rem, 4vw, 1.1rem)' }}>
                        <Users size={20} /> Please approach the counter
                    </p>
                </div>
            </div>

            <div style={{ marginTop: '1.5rem', display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
                <div className="glass-card" style={{ padding: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
                        <AlertCircle size={24} className="text-gradient" />
                        <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Missed Tokens</h2>
                    </div>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '1.25rem', fontSize: '0.875rem' }}>
                        If your token is listed below, please contact the admin desk.
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'center' }}>
                        {noShows.length === 0 ? (
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No tokens missed yet.</p>
                        ) : (
                            noShows.map(token => (
                                <div key={token} style={{
                                    padding: '0.75rem 1.5rem',
                                    background: 'rgba(239, 68, 68, 0.1)',
                                    border: '1px solid rgba(239, 68, 68, 0.2)',
                                    borderRadius: '12px',
                                    color: 'var(--danger)',
                                    fontWeight: '700',
                                    fontSize: '1.1rem'
                                }}>
                                    {token}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            <footer style={{ marginTop: '3rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                Powered by AppointmentManagement System
            </footer>
        </div>
    );
};

export default ClinicCustomer;
