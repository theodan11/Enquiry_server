const mongoose = require('mongoose');

const enquirySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, default: "", trim: true },
    channel: {
      type: String,
      enum: [
        "WhatsApp",
        "Facebook Messenger",
        "Facebook comment",
        "Website form",
        "Phone call note",
        "Other",
      ],
      default: "Other",
    },
    interest: {
      type: String,
      enum: [
        "Bootcamp",
        "Fellowship",
        "Corporate Training",
        "General Enquiry",
        "Support",
        "Not a Lead",
      ],
      default: "General Enquiry",
    },
    status: {
      type: String,
      enum: ["New", "Contacted", "Interested", "Paid", "Lost"],
      default: "New",
    },
    message: { type: String, default: "" },
    language: {
      type: String,
      enum: ["Bangla", "Banglish", "English", "Mixed"],
      default: "English",
    },
    aiSuggestedReply: { type: String, default: "" },
    followUpDue: { type: Date, default: null },
  },
  {
    timestamps: true,
  }
);

// Virtual to check if follow-up is overdue (>48 hours in "New" status)
enquirySchema.virtual("isOverdue").get(function () {
  if (this.status !== "New") return false;
  const hoursSinceCreated =
    (Date.now() - this.createdAt.getTime()) / (1000 * 60 * 60);
  return hoursSinceCreated > 48;
});

enquirySchema.set("toJSON", { virtuals: true });
enquirySchema.set("toObject", { virtuals: true });

module.exports = mongoose.model('Enquiry', enquirySchema);
