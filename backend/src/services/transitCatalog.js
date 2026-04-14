const transitHubs = {
  Delhi: {
    airport: { code: 'DEL', name: 'Indira Gandhi International Airport', latitude: 28.5562, longitude: 77.1 },
    rail: { code: 'NDLS', name: 'New Delhi Railway Station', latitude: 28.6435, longitude: 77.2198 },
  },
  Mumbai: {
    airport: { code: 'BOM', name: 'Chhatrapati Shivaji Maharaj International Airport', latitude: 19.0896, longitude: 72.8656 },
    rail: { code: 'CSMT', name: 'Chhatrapati Shivaji Maharaj Terminus', latitude: 18.9401, longitude: 72.8355 },
  },
  Kolkata: {
    airport: { code: 'CCU', name: 'Netaji Subhas Chandra Bose International Airport', latitude: 22.6547, longitude: 88.4467 },
    rail: { code: 'HWH', name: 'Howrah Junction', latitude: 22.585, longitude: 88.3468 },
  },
  Bengaluru: {
    airport: { code: 'BLR', name: 'Kempegowda International Airport', latitude: 13.1986, longitude: 77.7066 },
    rail: { code: 'SBC', name: 'KSR Bengaluru City Junction', latitude: 12.9784, longitude: 77.5724 },
  },
  Chennai: {
    airport: { code: 'MAA', name: 'Chennai International Airport', latitude: 12.9941, longitude: 80.1709 },
    rail: { code: 'MAS', name: 'MGR Chennai Central', latitude: 13.0828, longitude: 80.275 },
  },
  Hyderabad: {
    airport: { code: 'HYD', name: 'Rajiv Gandhi International Airport', latitude: 17.2403, longitude: 78.4294 },
    rail: { code: 'SC', name: 'Secunderabad Junction', latitude: 17.4333, longitude: 78.5016 },
  },
  Shillong: {
    airport: { code: 'SHL', name: 'Shillong Airport', latitude: 25.7036, longitude: 91.9787 },
    rail: { code: 'GHY', name: 'Guwahati Railway Station', latitude: 26.1826, longitude: 91.7509 },
  },
  Darjeeling: {
    airport: { code: 'IXB', name: 'Bagdogra Airport', latitude: 26.6812, longitude: 88.3286 },
    rail: { code: 'DJ', name: 'Darjeeling Railway Station', latitude: 27.041, longitude: 88.2652 },
  },
  Gangtok: {
    airport: { code: 'PYG', name: 'Pakyong Airport', latitude: 27.2347, longitude: 88.5917 },
    rail: { code: 'NJP', name: 'New Jalpaiguri Junction', latitude: 26.6802, longitude: 88.4525 },
  },
  Shimla: {
    airport: { code: 'SLV', name: 'Shimla Airport', latitude: 31.0822, longitude: 77.068 },
    rail: { code: 'SML', name: 'Shimla Railway Station', latitude: 31.1046, longitude: 77.1745 },
  },
  Aizawl: {
    airport: { code: 'AJL', name: 'Lengpui Airport', latitude: 23.8406, longitude: 92.6197 },
    rail: { code: 'BHRB', name: 'Bhairabi Railway Station', latitude: 24.0122, longitude: 92.8 },
  },
  Panaji: {
    airport: { code: 'GOI', name: 'Dabolim Airport', latitude: 15.3808, longitude: 73.8314 },
    rail: { code: 'KRMI', name: 'Karmali Railway Station', latitude: 15.4919, longitude: 73.9287 },
  },
  Rishikesh: {
    airport: { code: 'DED', name: 'Jolly Grant Airport', latitude: 30.1897, longitude: 78.1803 },
    rail: { code: 'YNRK', name: 'Yog Nagari Rishikesh', latitude: 29.9399, longitude: 78.171 },
  },
  Manali: {
    airport: { code: 'KUU', name: 'Kullu Manali Airport', latitude: 31.8767, longitude: 77.1544 },
    rail: { code: 'CDG', name: 'Chandigarh Junction', latitude: 30.7046, longitude: 76.7854 },
  },
  Jaipur: {
    airport: { code: 'JAI', name: 'Jaipur International Airport', latitude: 26.8242, longitude: 75.8122 },
    rail: { code: 'JP', name: 'Jaipur Junction', latitude: 26.9192, longitude: 75.7886 },
  },
  Varanasi: {
    airport: { code: 'VNS', name: 'Lal Bahadur Shastri International Airport', latitude: 25.4524, longitude: 82.8593 },
    rail: { code: 'BSB', name: 'Varanasi Junction', latitude: 25.321, longitude: 82.9875 },
  },
  Udaipur: {
    airport: { code: 'UDR', name: 'Maharana Pratap Airport', latitude: 24.6177, longitude: 73.8961 },
    rail: { code: 'UDZ', name: 'Udaipur City Railway Station', latitude: 24.5784, longitude: 73.6864 },
  },
  Kochi: {
    airport: { code: 'COK', name: 'Cochin International Airport', latitude: 10.152, longitude: 76.3911 },
    rail: { code: 'ERS', name: 'Ernakulam Junction', latitude: 9.9697, longitude: 76.292 },
  },
  Puducherry: {
    airport: { code: 'PNY', name: 'Puducherry Airport', latitude: 11.968, longitude: 79.8101 },
    rail: { code: 'PDY', name: 'Puducherry Railway Station', latitude: 11.934, longitude: 79.8306 },
  },
  Leh: {
    airport: { code: 'IXL', name: 'Kushok Bakula Rimpochee Airport', latitude: 34.1359, longitude: 77.5465 },
    rail: { code: 'JAT', name: 'Jammu Tawi Railway Station', latitude: 32.7086, longitude: 74.8682 },
  },
};

function normalizeCityName(value = '') {
  return String(value).trim().toLowerCase();
}

function getTransitHub(cityName = '', type = 'airport') {
  const normalized = normalizeCityName(cityName);

  const match = Object.entries(transitHubs).find(([city]) => normalizeCityName(city) === normalized);
  if (!match) return null;

  const [city, config] = match;
  if (!config[type]) return null;

  return {
    city,
    ...config[type],
  };
}

module.exports = {
  getTransitHub,
  transitHubs,
};
