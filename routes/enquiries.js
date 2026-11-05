const express = require("express");
const router = express.Router();
const Enquiry = require("../models/Enquiry");

// GET all enquiries
router.get("/", async (req, res) => {
  try {
    const enquiries = await Enquiry.find().sort({ createdAt: -1 });
    res.json(enquiries);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET reminders — enquiries in "New" status for > 48 hours
router.get("/reminders", async (req, res) => {
  try {
    // const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const cutoff = new Date(Date.now() - 10 * 1000);
    const overdue = await Enquiry.find({
      status: "New",
      createdAt: { $lt: cutoff },
    }).sort({ createdAt: 1 });
    res.json(overdue);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET weekly summary data
router.get("/summary", async (req, res) => {
  try {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const enquiries = await Enquiry.find({
      createdAt: { $gte: oneWeekAgo },
    });

    const summary = {
      total: enquiries.length,
      byStatus: {},
      byChannel: {},
      byInterest: {},
    };

    enquiries.forEach((e) => {
      summary.byStatus[e.status] = (summary.byStatus[e.status] || 0) + 1;
      summary.byChannel[e.channel] = (summary.byChannel[e.channel] || 0) + 1;
      summary.byInterest[e.interest] =
        (summary.byInterest[e.interest] || 0) + 1;
    });

    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single enquiry
router.get("/:id", async (req, res) => {
  try {
    const enquiry = await Enquiry.findById(req.params.id);
    if (!enquiry) return res.status(404).json({ error: "Not found" });
    res.json(enquiry);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create new enquiry
router.post("/", async (req, res) => {
  try {
    const enquiry = await Enquiry.create(req.body);
    res.status(201).json(enquiry);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PATCH update enquiry
router.patch("/:id", async (req, res) => {
  try {
    const enquiry = await Enquiry.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!enquiry) return res.status(404).json({ error: "Not found" });
    res.json(enquiry);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE enquiry
router.delete("/:id", async (req, res) => {
  try {
    const enquiry = await Enquiry.findByIdAndDelete(req.params.id);
    if (!enquiry) return res.status(404).json({ error: "Not found" });
    res.json({ message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
