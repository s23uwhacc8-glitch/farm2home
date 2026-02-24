import { useState, useEffect } from 'react';

// Returns a value that only updates after `delay` ms of no changes.
// Used to debounce the search input in ProductList so typing doesn't
// fire an API request on every keystroke.
const useDebounce = (value, delay = 400) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
};

export default useDebounce;
