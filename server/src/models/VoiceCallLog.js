import mongoose from 'mongoose';

const voiceCallLogSchema = new mongoose.Schema({
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  callSid: { type: String, required: true }, // Twilio Call SID
  callerNumber: String, // Customer phone number
  dialedNumber: String, // Restaurant phone number
  startedAt: { type: Date, default: Date.now },
  endedAt: Date,
  durationSeconds: Number,
  status: {
    type: String,
    enum: ['in-progress', 'completed', 'failed', 'transferred'],
    default: 'in-progress',
  },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  orderReference: String,
  paymentLinkSent: { type: Boolean, default: false },
  paymentLinkPaid: { type: Boolean, default: false },
  userTranscript: String,
  agentTranscript: String,
  transcriptTimeline: [mongoose.Schema.Types.Mixed], // Timeline of conversation turns
  humanTransferred: { type: Boolean, default: false },
  inputTokens: Number, // LLM billing tokens tracking
  outputTokens: Number,
  latencyData: mongoose.Schema.Types.Mixed, // Latency breakdown metrics
}, { timestamps: true });

voiceCallLogSchema.index({ tenant: 1, callSid: 1 }, { unique: true });
voiceCallLogSchema.index({ tenant: 1, callerNumber: 1 });

export default mongoose.model('VoiceCallLog', voiceCallLogSchema);
