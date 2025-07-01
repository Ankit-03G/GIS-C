-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Create locations table
CREATE TABLE IF NOT EXISTS locations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    geom GEOMETRY(Point, 4326),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create spatial index
CREATE INDEX IF NOT EXISTS locations_geom_idx ON locations USING GIST (geom);

-- Example of inserting a point
-- INSERT INTO locations (name, geom) VALUES ('Example Location', ST_SetSRID(ST_MakePoint(-73.935242, 40.730610), 4326)); 