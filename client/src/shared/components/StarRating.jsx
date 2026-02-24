// One StarRating to rule them all — used in ProductList, ProductDetail, FarmerProfile
const SIZE = { xs: 'text-xs', sm: 'text-sm', md: 'text-base', lg: 'text-xl', xl: 'text-2xl' };

const StarRating = ({ rating = 0, size = 'sm' }) => (
  <div className={`flex gap-0.5 ${SIZE[size] ?? SIZE.sm}`}>
    {[1, 2, 3, 4, 5].map(s => (
      <span key={s} className={s <= Math.round(rating) ? 'text-yellow-400' : 'text-gray-200'}>★</span>
    ))}
  </div>
);

export default StarRating;
