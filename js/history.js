const HistoryStore = (function () {
  const KEY = 'valuation_history_v1';
  const MAX = 50;

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return [];
      const list = JSON.parse(raw);
      return Array.isArray(list) ? list : [];
    } catch {
      return [];
    }
  }

  function save(list) {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
  }

  function add(entry) {
    const list = load();
    list.unshift(entry);
    save(list);
    return list.length;
  }

  function list() {
    return load();
  }

  function get(id) {
    return load().find((item) => item.id === id) || null;
  }

  function remove(id) {
    const list = load().filter((item) => item.id !== id);
    save(list);
    return list.length;
  }

  function clear() {
    localStorage.removeItem(KEY);
    return 0;
  }

  return { add, list, get, remove, clear };
})();
