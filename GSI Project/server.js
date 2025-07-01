const express = require('express');
const pgp = require('pg-promise')();
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Database configuration
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'gsi_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || ''
};

console.log('Database configuration:', { ...dbConfig, password: '***' });

const db = pgp(dbConfig);

// Initialize PostGIS extension
async function initializePostGIS() {
    try {
        await db.none('CREATE EXTENSION IF NOT EXISTS postgis;');
        console.log('PostGIS extension initialized successfully');
    } catch (error) {
        console.error('Error initializing PostGIS:', error);
        throw error; // Re-throw to handle it in the server startup
    }
}

// Example endpoint to create a spatial table
app.post('/api/locations', async (req, res) => {
    try {
        const { name, latitude, longitude } = req.body;
        console.log('Received location data:', { name, latitude, longitude });
        
        const result = await db.one(
            'INSERT INTO locations(name, geom) VALUES($1, ST_SetSRID(ST_MakePoint($2, $3), 4326)) RETURNING id',
            [name, longitude, latitude]
        );
        console.log('Location added successfully:', result);
        res.json(result);
    } catch (error) {
        console.error('Error creating location:', error);
        res.status(500).json({ 
            error: 'Internal server error',
            details: error.message 
        });
    }
});

// Example endpoint to get locations within a radius
app.get('/api/locations/nearby', async (req, res) => {
    try {
        const { latitude, longitude, radius, category, subcategory, type } = req.query;
        let query = `
            SELECT id, name, ST_X(geom::geometry) as longitude, ST_Y(geom::geometry) as latitude, category, subcategory, created_at
            FROM locations
            WHERE ST_DWithin(
                geom::geography,
                ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
                $3
            )`;
        let params = [longitude, latitude, radius];
        if (category && subcategory) {
            query += ' AND LOWER(category) = LOWER($4) AND LOWER(subcategory) = LOWER($5)';
            params.push(category, subcategory);
        } else {
            // If not both are provided, return empty array
            return res.json([]);
        }
        const locations = await db.any(query, params);
        res.json(locations);
    } catch (error) {
        console.error('Error fetching nearby locations:', error);
        res.status(500).json({ 
            error: 'Internal server error',
            details: error.message 
        });
    }
});

const PORT = process.env.PORT || 3000;

// Initialize PostGIS and start server
initializePostGIS()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    })
    .catch(error => {
        console.error('Failed to start server:', error);
        process.exit(1);
    }); 

    // Get all locations of a specific type
app.get('/api/locations', async (req, res) => {
    try {
        const { type } = req.query;
        let query = 'SELECT id, name, ST_X(geom) as longitude, ST_Y(geom) as latitude, category, subcategory, created_at FROM locations';
        let params = [];
        if (type) {
            query += ' WHERE LOWER(category) = LOWER($1)';
            params.push(type);
        }
        const locations = await db.any(query, params);
        res.json(locations);
    } catch (error) {
        console.error('Error fetching locations:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});