import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Settings, Plus, Play, UserX, RotateCcw, ChevronRight } from 'lucide-react';
import { useTokens } from '../../services/useTokens';
import { supabase } from '../../services/supabaseClient';

const ClinicAdmin = () => {
    const { clinicSlug } = useParams();
    const [clinicInfo, setClinicInfo] = useState<{ id: string, name: string } | null>(null);
    const [allSessions, setAllSessions] = useState<{ id: string, name: string, is_active: boolean }[]>([]);
    const [sessionInfo, setSessionInfo] = useState<{ id: string, name: string } | null>(null);

    const fetchClinicAndSessions = async () => {
        if (!clinicSlug) return;

        // 1. Fetch clinic by slug
        const { data: clinicData } = await supabase
            .from('clinics')
            .select('id, name')
            .eq('slug', clinicSlug)
            .single();

        if (clinicData) {
            setClinicInfo(clinicData);

            // 2. Fetch all sessions for this clinic
            const { data: sessionsData } = await supabase
                .from('clinic_sessions')
                .select('id, name, is_active')
                .eq('clinic_id', clinicData.id)
                .order('name');

            if (sessionsData) {
                setAllSessions(sessionsData);
                const active = sessionsData.find(s => s.is_active);
                if (active) {
                    setSessionInfo(active);
                } else {
                    setSessionInfo(null);
                }
            }
        }
    };

    useEffect(() => {
        fetchClinicAndSessions();
    }, [clinicSlug]);

    const handleStartSession = async (sessionId: string) => {
        if (!clinicInfo) return;

        // 1. Deactivate all sessions for this clinic
        await supabase
            .from('clinic_sessions')
            .update({ is_active: false })
            .eq('clinic_id', clinicInfo.id);

        // 2. Activate the selected session
        await supabase
            .from('clinic_sessions')
            .update({ is_active: true })
            .eq('id', sessionId);

        // 3. Reset to 1 (Delete existing and insert fresh to avoid multi-row issues)
        await supabase
            .from('token_state')
            .delete()
            .eq('session_id', sessionId);

        const { error: insertError } = await supabase
            .from('token_state')
            .insert({
                clinic_id: clinicInfo.id,
                session_id: sessionId,
                current_token: 1,
                no_shows: [],
                last_updated: new Date().toISOString()
            });

        if (insertError) {
            console.error('Error initializing token state:', insertError);
        }

        // 4. Refresh data
        await fetchClinicAndSessions();
    };

    const handleEndSession = async () => {
        if (!clinicInfo || !sessionInfo) return;

        const confirm = window.confirm(`Are you sure you want to end the ${sessionInfo.name} session? This will notify all customers that the clinic is closed.`);
        if (!confirm) return;

        const { error } = await supabase
            .from('clinic_sessions')
            .update({ is_active: false })
            .eq('id', sessionInfo.id);

        if (error) {
            alert('Error ending session: ' + error.message);
        } else {
            await fetchClinicAndSessions();
        }
    };

    const handleAddSession = async () => {
        if (!clinicInfo) return;
        const name = prompt('Enter session name (e.g. Night Shift, Weekend):');
        if (!name) return;

        const { error } = await supabase
            .from('clinic_sessions')
            .insert({
                clinic_id: clinicInfo.id,
                name: name,
                is_active: false
            });

        if (error) {
            alert('Error adding session: ' + error.message);
        } else {
            await fetchClinicAndSessions();
        }
    };

    const { currentToken, noShows, updateToken, loading } = useTokens(clinicInfo?.id || '', sessionInfo?.id || '');

    const handleNext = () => updateToken(currentToken + 1);
    const handleNoShow = () => {
        updateToken(currentToken + 1, [...noShows, currentToken]);
    };
    const handleManualSet = (val: string) => {
        const num = parseInt(val);
        if (!isNaN(num)) updateToken(num);
    };

    const recoverNoShow = (token: number) => {
        updateToken(currentToken, noShows.filter(t => t !== token));
    };

    if (!clinicInfo) return <div className="glass-card animate-fade-in">Clinic not found or loading...</div>;
    if (loading && sessionInfo) return <div className="glass-card animate-fade-in">Loading admin controls...</div>;

    return (
        <div className="animate-fade-in responsive-grid">
            <div className="glass-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                        <h1 className="text-gradient">{clinicInfo.name} Admin</h1>
                        <p style={{ color: 'var(--text-muted)' }}>Manage your active appointment queue</p>
                    </div>
                    <div className={`badge ${sessionInfo ? 'badge-active' : ''}`}>
                        {sessionInfo ? `Active: ${sessionInfo.name}` : 'No Active Session'}
                    </div>
                </div>

                {!sessionInfo ? (
                    <div style={{ textAlign: 'center', padding: '5rem 2rem', background: 'rgba(255,255,255,0.02)', borderRadius: '24px' }}>
                        <Settings size={64} className="text-gradient" style={{ marginBottom: '1.5rem', opacity: 0.5 }} />
                        <h2>No Active Session</h2>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
                            Select a session from the sidebar to start receiving patients.
                        </p>
                    </div>
                ) : (
                    <>
                        <div style={{ textAlign: 'center', padding: '3rem 1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '24px', marginBottom: '2rem' }}>
                            <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Current Token Number</span>
                            <div style={{ fontSize: 'clamp(4rem, 20vw, 8rem)', fontWeight: '800', lineHeight: '1', margin: '1rem 0' }}>{currentToken}</div>

                            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '2rem', flexWrap: 'wrap' }}>
                                <button onClick={handleNext} className="btn-primary" style={{ padding: '1rem 2rem', fontSize: '1.1rem', flex: '1', minWidth: '200px', justifyContent: 'center' }}>
                                    Next Patient <ChevronRight size={24} />
                                </button>
                                <button onClick={handleNoShow} className="btn-danger" style={{ flex: '1', minWidth: '150px', justifyContent: 'center' }}>
                                    <UserX size={20} /> Mark No-Show
                                </button>
                                <button onClick={handleEndSession} className="btn-danger" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger)', color: 'var(--danger)', flex: '1', minWidth: '150px', justifyContent: 'center' }}>
                                    End Session
                                </button>
                            </div>
                        </div>

                        <div className="glass-card" style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.01)' }}>
                            <h3 style={{ marginBottom: '1rem' }}>Surgical/Manual Overrides</h3>
                            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                <input
                                    type="number"
                                    placeholder="Set specific token..."
                                    style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)', color: 'white', padding: '0.75rem', borderRadius: '12px', flex: '1', minWidth: '150px' }}
                                    onBlur={(e) => handleManualSet(e.target.value)}
                                />
                                <button className="btn-primary" style={{ background: 'var(--glass)', flex: '0 1 auto' }}>Set Token</button>
                            </div>
                        </div>
                    </>
                )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                <div className="glass-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                        <RotateCcw size={20} className="text-gradient" />
                        <h3 style={{ margin: 0 }}>No-Shows</h3>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {!sessionInfo || noShows.length === 0 ? (
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', textAlign: 'center' }}>
                                {!sessionInfo ? 'Start a session to manage no-shows' : 'No tokens marked yet'}
                            </p>
                        ) : (
                            noShows.map(token => (
                                <div key={token} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px' }}>
                                    <span style={{ fontWeight: '600' }}>Token #{token}</span>
                                    <button onClick={() => recoverNoShow(token)} className="btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent)' }}>
                                        Re-queue
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div className="glass-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                        <Settings size={20} className="text-gradient" />
                        <h3 style={{ margin: 0 }}>Sessions</h3>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {allSessions.length === 0 ? (
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No sessions defined</p>
                        ) : (
                            allSessions.map(session => (
                                <button
                                    key={session.id}
                                    onClick={() => !session.is_active && handleStartSession(session.id)}
                                    style={{
                                        justifyContent: 'space-between',
                                        background: session.is_active ? 'var(--primary)' : 'var(--glass)',
                                        color: session.is_active ? 'white' : 'var(--text-muted)',
                                        opacity: session.is_active ? 1 : 0.7,
                                        cursor: session.is_active ? 'default' : 'pointer'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        {session.is_active && <Play size={16} fill="white" />}
                                        {session.name}
                                    </div>
                                    {!session.is_active && <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>Start</span>}
                                </button>
                            ))
                        )}
                        <button
                            onClick={handleAddSession}
                            style={{ marginTop: '0.5rem', background: 'transparent', border: '1px dashed var(--glass-border)', color: 'var(--text-muted)' }}
                        >
                            <Plus size={16} /> Add Session
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ClinicAdmin;
