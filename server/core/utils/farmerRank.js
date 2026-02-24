const BADGE_SCORE_RANGES = {
  platinum: { $gte: 90 },
  gold:     { $gte: 75, $lt: 90 },
  silver:   { $gte: 60, $lt: 75 },
  bronze:   { $lt: 60 },
};

const getTrustBadge = (score = 0) => {
  if (score >= 90) return 'platinum';
  if (score >= 75) return 'gold';
  if (score >= 60) return 'silver';
  return 'bronze';
};

module.exports = { BADGE_SCORE_RANGES, getTrustBadge };
