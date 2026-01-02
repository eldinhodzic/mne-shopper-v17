-- ============================================
-- MNE CJENOVNIK - DATABASE SCHEMA
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. STORES TABLE
-- Winkels in Montenegro (Voli, Idea, Franca, etc.)
CREATE TABLE IF NOT EXISTS stores (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tin VARCHAR(20) UNIQUE NOT NULL,           -- Tax ID number (PIB)
    name VARCHAR(255) NOT NULL,
    address VARCHAR(500),
    city VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookup by TIN
CREATE INDEX IF NOT EXISTS idx_stores_tin ON stores(tin);

-- 2. PRODUCTS TABLE
-- Alle producten met barcode
CREATE TABLE IF NOT EXISTS products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,          -- Barcode (EAN)
    name VARCHAR(500) NOT NULL,
    unit VARCHAR(20) DEFAULT 'KOM',            -- Unit (KOM, KG, L, etc.)
    category VARCHAR(100),                      -- Future: auto-categorization
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookup by barcode
CREATE INDEX IF NOT EXISTS idx_products_code ON products(code);
CREATE INDEX IF NOT EXISTS idx_products_name ON products USING gin(to_tsvector('simple', name));

-- 3. PRICES TABLE
-- Prijshistorie per product per winkel
CREATE TABLE IF NOT EXISTS prices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
    price DECIMAL(10,2) NOT NULL,              -- Price with VAT
    price_without_vat DECIMAL(10,2),           -- Price without VAT
    vat_rate DECIMAL(5,2),                     -- VAT percentage
    scanned_at TIMESTAMPTZ NOT NULL,           -- When the receipt was issued
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Prevent duplicate entries for same product/store/time
    UNIQUE(product_id, store_id, scanned_at)
);

-- Indexes for price queries
CREATE INDEX IF NOT EXISTS idx_prices_product ON prices(product_id);
CREATE INDEX IF NOT EXISTS idx_prices_store ON prices(store_id);
CREATE INDEX IF NOT EXISTS idx_prices_scanned ON prices(scanned_at DESC);
CREATE INDEX IF NOT EXISTS idx_prices_product_store ON prices(product_id, store_id);

-- 4. PRICE REPORTS VIEW
-- Makkelijke view voor laatste prijzen per product per winkel
CREATE OR REPLACE VIEW latest_prices AS
SELECT DISTINCT ON (p.product_id, p.store_id)
    p.id,
    p.product_id,
    p.store_id,
    p.price,
    p.scanned_at,
    pr.code AS product_code,
    pr.name AS product_name,
    pr.unit AS product_unit,
    s.name AS store_name,
    s.city AS store_city
FROM prices p
JOIN products pr ON p.product_id = pr.id
JOIN stores s ON p.store_id = s.id
ORDER BY p.product_id, p.store_id, p.scanned_at DESC;

-- 5. STATISTICS VIEW
-- Algemene statistieken
CREATE OR REPLACE VIEW stats AS
SELECT
    (SELECT COUNT(*) FROM products) AS total_products,
    (SELECT COUNT(*) FROM stores) AS total_stores,
    (SELECT COUNT(*) FROM prices) AS total_price_records,
    (SELECT COUNT(DISTINCT DATE(scanned_at)) FROM prices) AS days_of_data;

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE prices ENABLE ROW LEVEL SECURITY;

-- Public read access (anyone can see prices)
CREATE POLICY "Public read access for stores" ON stores
    FOR SELECT USING (true);

CREATE POLICY "Public read access for products" ON products
    FOR SELECT USING (true);

CREATE POLICY "Public read access for prices" ON prices
    FOR SELECT USING (true);

-- Public insert access (anyone can submit prices)
CREATE POLICY "Public insert access for stores" ON stores
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Public insert access for products" ON products
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Public insert access for prices" ON prices
    FOR INSERT WITH CHECK (true);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to upsert store (create if not exists, return id)
CREATE OR REPLACE FUNCTION upsert_store(
    p_tin VARCHAR,
    p_name VARCHAR,
    p_address VARCHAR DEFAULT NULL,
    p_city VARCHAR DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_store_id UUID;
BEGIN
    -- Try to find existing store
    SELECT id INTO v_store_id FROM stores WHERE tin = p_tin;
    
    -- If not found, create new
    IF v_store_id IS NULL THEN
        INSERT INTO stores (tin, name, address, city)
        VALUES (p_tin, p_name, p_address, p_city)
        RETURNING id INTO v_store_id;
    ELSE
        -- Update name/address if changed
        UPDATE stores 
        SET name = p_name, 
            address = COALESCE(p_address, address),
            city = COALESCE(p_city, city),
            updated_at = NOW()
        WHERE id = v_store_id;
    END IF;
    
    RETURN v_store_id;
END;
$$ LANGUAGE plpgsql;

-- Function to upsert product (create if not exists, return id)
CREATE OR REPLACE FUNCTION upsert_product(
    p_code VARCHAR,
    p_name VARCHAR,
    p_unit VARCHAR DEFAULT 'KOM'
) RETURNS UUID AS $$
DECLARE
    v_product_id UUID;
BEGIN
    -- Try to find existing product
    SELECT id INTO v_product_id FROM products WHERE code = p_code;
    
    -- If not found, create new
    IF v_product_id IS NULL THEN
        INSERT INTO products (code, name, unit)
        VALUES (p_code, p_name, p_unit)
        RETURNING id INTO v_product_id;
    END IF;
    
    RETURN v_product_id;
END;
$$ LANGUAGE plpgsql;

-- Function to submit a price record
CREATE OR REPLACE FUNCTION submit_price(
    p_product_code VARCHAR,
    p_product_name VARCHAR,
    p_product_unit VARCHAR,
    p_store_tin VARCHAR,
    p_store_name VARCHAR,
    p_store_address VARCHAR,
    p_store_city VARCHAR,
    p_price DECIMAL,
    p_price_without_vat DECIMAL,
    p_vat_rate DECIMAL,
    p_scanned_at TIMESTAMPTZ
) RETURNS UUID AS $$
DECLARE
    v_product_id UUID;
    v_store_id UUID;
    v_price_id UUID;
BEGIN
    -- Get or create product
    v_product_id := upsert_product(p_product_code, p_product_name, p_product_unit);
    
    -- Get or create store
    v_store_id := upsert_store(p_store_tin, p_store_name, p_store_address, p_store_city);
    
    -- Insert price (ignore if duplicate)
    INSERT INTO prices (product_id, store_id, price, price_without_vat, vat_rate, scanned_at)
    VALUES (v_product_id, v_store_id, p_price, p_price_without_vat, p_vat_rate, p_scanned_at)
    ON CONFLICT (product_id, store_id, scanned_at) DO NOTHING
    RETURNING id INTO v_price_id;
    
    RETURN v_price_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- DONE! 
-- ============================================
-- Your database is ready for community price sharing!
