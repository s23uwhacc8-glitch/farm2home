// Rank badge config — single source of truth for all pages
export const RANK_CONFIG = {
  platinum: { icon: '💎', label: 'Platinum', iconColor: 'text-purple-700', badgeColor: 'bg-purple-50 border-purple-200 text-purple-700' },
  gold:     { icon: '🥇', label: 'Gold',     iconColor: 'text-yellow-600', badgeColor: 'bg-yellow-50 border-yellow-200 text-yellow-700' },
  silver:   { icon: '🥈', label: 'Silver',   iconColor: 'text-gray-500',   badgeColor: 'bg-gray-50 border-gray-200 text-gray-600'       },
  bronze:   { icon: '🥉', label: 'Bronze',   iconColor: 'text-orange-600', badgeColor: 'bg-orange-50 border-orange-200 text-orange-700' },
};

export const getTrustBadge = (score = 0) => {
  if (score >= 90) return 'platinum';
  if (score >= 75) return 'gold';
  if (score >= 60) return 'silver';
  return 'bronze';
};
