require('dotenv').config();
const express = require('express');
const path = require('path');
const dynamics = require('./services/dynamics');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());
app.use(express.static(path.join(__dirname)));

// --- Dynamics 365 API Routes ---

// Test connection (WhoAmI)
app.get('/api/dynamics/whoami', async (req, res) => {
  try {
    const result = await dynamics.testConnection();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generic GET for any Dynamics entity
app.get('/api/dynamics/:entity', async (req, res) => {
  try {
    const query = req.query.$filter || req.query.$select || req.query.$top
      ? `${req.params.entity}?${new URLSearchParams(req.query).toString()}`
      : req.params.entity;
    const result = await dynamics.get(query);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create a record in any Dynamics entity
app.post('/api/dynamics/:entity', async (req, res) => {
  try {
    const result = await dynamics.post(req.params.entity, req.body);
    res.status(201).json(result || { success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update a record
app.patch('/api/dynamics/:entity/:id', async (req, res) => {
  try {
    const endpoint = `${req.params.entity}(${req.params.id})`;
    await dynamics.patch(endpoint, req.body);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a record
app.delete('/api/dynamics/:entity/:id', async (req, res) => {
  try {
    const endpoint = `${req.params.entity}(${req.params.id})`;
    await dynamics.delete(endpoint);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://127.0.0.1:${PORT}`);
  console.log('Dynamics 365 API available at /api/dynamics/*');
});
