-- ==========================================================
-- Nirmaan AI / MPLADS Hon'ble MP Allocated Limits Table
-- Source Dataset: "Allocated Limit for Honble MPs.csv"
-- ==========================================================

CREATE TABLE IF NOT EXISTS public.mp_allocated_limits (
    sr_no INT PRIMARY KEY,
    state TEXT NOT NULL,
    mp_name TEXT NOT NULL,
    constituency TEXT NOT NULL,
    allocated_amount NUMERIC NOT NULL,
    allocated_crores NUMERIC NOT NULL,
    allocated_amount_inr TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Search indexes for rapid query and filtering
CREATE INDEX IF NOT EXISTS idx_mp_limits_state ON public.mp_allocated_limits(state);
CREATE INDEX IF NOT EXISTS idx_mp_limits_mp_name ON public.mp_allocated_limits(mp_name);
CREATE INDEX IF NOT EXISTS idx_mp_limits_constituency ON public.mp_allocated_limits(constituency);

-- Enable public read access
ALTER TABLE public.mp_allocated_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to mp_allocated_limits"
    ON public.mp_allocated_limits
    FOR SELECT
    USING (true);

-- Allow service role full access
CREATE POLICY "Allow service role full access to mp_allocated_limits"
    ON public.mp_allocated_limits
    FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role')
    WITH CHECK (auth.jwt() ->> 'role' = 'service_role');
