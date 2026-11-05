const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse');
const mongoose = require('mongoose');
require('dotenv').config();

const Enquiry = require('./models/Enquiry');
const connectDB = require('./config/db');

const csvFilePath = path.resolve(__dirname, '..', 'sample-enquiries.csv');

const parseCSV = () => {
  return new Promise((resolve, reject) => {
    const records = [];
    fs.createReadStream(csvFilePath)
      .pipe(parse({ columns: true, trim: true }))
      .on('data', (row) => records.push(row))
      .on('end', () => resolve(records))
      .on('error', (err) => reject(err));
  });
};

function mapChannel(channel) {
  const lower = channel.toLowerCase();
  if (lower.includes('whatsapp')) return 'WhatsApp';
  if (lower.includes('facebook')) {
    if (lower.includes('messenger')) return 'Facebook Messenger';
    if (lower.includes('comment')) return 'Facebook comment';
    return 'Facebook Messenger';
  }
  if (lower.includes('website')) return 'Website form';
  if (lower.includes('phone')) return 'Phone call note';
  return 'Other';
}

function mapInterest(message) {
  const lower = message.toLowerCase();
  if (lower.includes('bootcamp')) return 'Bootcamp';
  if (lower.includes('fellowship')) return 'Fellowship';
  if (lower.includes('training') || lower.includes('corporate')) return 'Corporate Training';
  if (lower.includes('job') || lower.includes('intern')) return 'Support';
  return 'General Enquiry';
}

function detectLanguage(message) {
  const banglaRegex = /[\u0980-\u09FF]/;
  if (banglaRegex.test(message)) return 'Bangla';
  const englishRegex = /^[A-Za-z0-9 .,!?\n]+$/;
  if (englishRegex.test(message)) return 'English';
  return 'Banglish';
}

const seed = async () => {
  try {
    await connectDB();
    const rows = await parseCSV();
    const docs = rows.map((r) => {
      const language = detectLanguage(r.message);
      return {
        name: r['sender name'] || 'Unknown',
        phone: r.phone || '',
        channel: mapChannel(r.channel),
        interest: mapInterest(r.message),
        status: 'New',
        message: r.message,
        language,
        followUpDue: null,
      };
    });
    await Enquiry.deleteMany({});
    await Enquiry.insertMany(docs);
    console.log(`Seeded ${docs.length} enquiries`);
    process.exit(0);
  } catch (err) {
    console.error('Seed error', err);
    process.exit(1);
  }
};

seed();
