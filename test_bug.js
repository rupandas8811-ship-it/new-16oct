function sanitizeSlug(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function generateDeterministicAssignmentId(orderId, eventId, roleName, slotNumber) {
  const cleanOrder = (orderId || 'ORD').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 15);
  const cleanEvent = (eventId || 'ev').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 10);
  const roleSlug = sanitizeSlug(roleName).slice(0, 12);
  const rawId = `ASST-${cleanOrder}-${cleanEvent}-${roleSlug}-${slotNumber}`;
  return rawId.length > 50 ? rawId.slice(0, 50) : rawId;
}

console.log(generateDeterministicAssignmentId('ORD-123', 'ev-1', 'Photographer', 1));
console.log(generateDeterministicAssignmentId('ORD-123', 'ev-1', 'Photographer', 2));

const ord = 'ORD-2023-11-23-4567890';
const ev = 'ev_1234567890_987';
const role = 'Traditional Photographer';
console.log(generateDeterministicAssignmentId(ord, ev, role, 1));
console.log(generateDeterministicAssignmentId(ord, ev, role, 2));

