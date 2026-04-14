const express = require('express');
const { defaultOrigin, reverseGeocode } = require('../services/geocoding');

const router = express.Router();

router.get('/reverse', async (req, res) => {
  const { lat, lng } = req.query;

  if (!lat || !lng) {
    return res.status(400).json({ error: 'lat and lng are required.' });
  }

  try {
    const result = await reverseGeocode(lat, lng);
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to reverse geocode location.', fallback: defaultOrigin });
  }
});

module.exports = router;
