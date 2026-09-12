-- ==========================================================
-- Nirmaan AI / MPLADS Vector Database Schema for Supabase
-- Extension: pgvector
-- Embeddings: Gemini text-embedding-004 (768 dimensions)
-- ==========================================================

-- 1. Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Create the MPLADS embeddings & analytical metadata table
CREATE TABLE IF NOT EXISTS public.mplads_embeddings (
    id TEXT PRIMARY KEY,
    work_id TEXT NOT NULL,
    state TEXT NOT NULL,
    mp_name TEXT NOT NULL,
    house TEXT,
    constituency TEXT,
    city TEXT,
    ward TEXT,
    block TEXT,
    village TEXT,
    category TEXT,
    title TEXT NOT NULL,
    agency TEXT,
    allocation NUMERIC NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'Not reported',
    approval TEXT NOT NULL DEFAULT 'Action Pending',
    recommended_date TEXT,
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    embedding VECTOR(768),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create indices for high-performance retrieval
CREATE INDEX IF NOT EXISTS idx_mplads_embeddings_state ON public.mplads_embeddings(state);
CREATE INDEX IF NOT EXISTS idx_mplads_embeddings_mp_name ON public.mplads_embeddings(mp_name);
CREATE INDEX IF NOT EXISTS idx_mplads_embeddings_village ON public.mplads_embeddings(village);
CREATE INDEX IF NOT EXISTS idx_mplads_embeddings_block ON public.mplads_embeddings(block);
CREATE INDEX IF NOT EXISTS idx_mplads_embeddings_work_id ON public.mplads_embeddings(work_id);

-- HNSW Vector Index for sub-millisecond cosine similarity search
CREATE INDEX IF NOT EXISTS idx_mplads_embeddings_vector 
ON public.mplads_embeddings 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- 4. Vector Similarity Search Function (RPC)
CREATE OR REPLACE FUNCTION match_mplads_works(
    query_embedding VECTOR(768),
    match_threshold FLOAT DEFAULT 0.3,
    match_count INT DEFAULT 15,
    filter_state TEXT DEFAULT NULL,
    filter_mp TEXT DEFAULT NULL,
    filter_village TEXT DEFAULT NULL
)
RETURNS TABLE (
    id TEXT,
    work_id TEXT,
    state TEXT,
    mp_name TEXT,
    house TEXT,
    constituency TEXT,
    city TEXT,
    ward TEXT,
    block TEXT,
    village TEXT,
    category TEXT,
    title TEXT,
    agency TEXT,
    allocation NUMERIC,
    status TEXT,
    approval TEXT,
    recommended_date TEXT,
    content TEXT,
    similarity FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        e.id,
        e.work_id,
        e.state,
        e.mp_name,
        e.house,
        e.constituency,
        e.city,
        e.ward,
        e.block,
        e.village,
        e.category,
        e.title,
        e.agency,
        e.allocation,
        e.status,
        e.approval,
        e.recommended_date,
        e.content,
        1 - (e.embedding <=> query_embedding) AS similarity
    FROM public.mplads_embeddings e
    WHERE
        (filter_state IS NULL OR e.state ILIKE filter_state OR filter_state = 'All states')
        AND (filter_mp IS NULL OR e.mp_name ILIKE ('%' || filter_mp || '%') OR filter_mp = 'All MPs')
        AND (filter_village IS NULL OR e.village ILIKE ('%' || filter_village || '%') OR e.block ILIKE ('%' || filter_village || '%') OR filter_village = 'All villages')
        AND (1 - (e.embedding <=> query_embedding)) >= match_threshold
    ORDER BY similarity DESC
    LIMIT match_count;
END;
$$;
