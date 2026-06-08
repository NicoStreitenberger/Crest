/**
 * CREST Studio — analytics.js
 * Privacy-first, lightweight cookie-less telemetry and CRO event tracking.
 */
(function() {
    const SUPABASE_URL = 'https://vojwdyubksoozhyvnbfu.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvandkeXVia3Nvb3poeXZuYmZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0MzU1OTcsImV4cCI6MjA5NDAxMTU5N30.8uUc1skFlGTViyaIx_JVrEwYDO6uKg6DNvaD5BfYuW0';

    async function logEvent(eventName, metadata = {}) {
        const payload = {
            event_name: eventName,
            metadata: metadata
        };
        
        try {
            await fetch(`${SUPABASE_URL}/rest/v1/analytics_events`, {
                method: 'POST',
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=minimal'
                },
                body: JSON.stringify(payload),
                keepalive: true
            });
        } catch (err) {
            console.warn('[Analytics] Failed to send telemetry:', err);
        }
    }

    // Expose globally
    window.crestAnalytics = {
        logEvent,
        markSubmitted: () => {
            window.crestAnalytics.formSubmitted = true;
        },
        formSubmitted: false
    };

    // Track Page View
    logEvent('page_view', { 
        path: window.location.pathname,
        referrer: document.referrer || null
    });

    document.addEventListener('DOMContentLoaded', () => {
        // 1. Hero CTA Tracking
        const heroCta = document.getElementById('hero-cta');
        if (heroCta) {
            heroCta.addEventListener('click', () => {
                logEvent('Hero_CTA_Click', { target: heroCta.getAttribute('href') });
            });
        }

        // 2. Enlist Form Telemetry (Initiation + Abandonment + Field Abandonment)
        const enlistForm = document.getElementById('enlist-briefing-form');
        if (enlistForm) {
            let formInitiated = false;
            let lastActiveField = null;

            // Track form initiation on first input focus or change
            const inputs = enlistForm.querySelectorAll('input, select, textarea');
            inputs.forEach(input => {
                const updateActive = () => {
                    const identifier = input.getAttribute('id') || input.getAttribute('name') || 'unknown';
                    lastActiveField = identifier;
                    if (!formInitiated) {
                        formInitiated = true;
                        logEvent('Enlist_Form_Initiated');
                    }
                };

                input.addEventListener('focus', updateActive);
                input.addEventListener('change', updateActive);
            });

            // Detect abandonment
            const handleAbandonment = () => {
                if (formInitiated && !window.crestAnalytics.formSubmitted) {
                    const payload = {
                        event_name: 'Enlist_Form_Abandoned',
                        metadata: { last_field: lastActiveField }
                    };
                    fetch(`${SUPABASE_URL}/rest/v1/analytics_events`, {
                        method: 'POST',
                        headers: {
                            'apikey': SUPABASE_ANON_KEY,
                            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                            'Content-Type': 'application/json',
                            'Prefer': 'return=minimal'
                        },
                        body: JSON.stringify(payload),
                        keepalive: true
                    });
                    // Prevent multiple logs
                    formInitiated = false; 
                }
            };

            // Listen to page visibility changes & unloads
            window.addEventListener('pagehide', handleAbandonment);
            window.addEventListener('beforeunload', handleAbandonment);
            document.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'hidden') {
                    handleAbandonment();
                }
            });
        }
    });
})();
