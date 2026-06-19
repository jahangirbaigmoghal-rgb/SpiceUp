/** Shared socket event name constants — single source of truth. */
export const SOCKET_EVENTS = {
  // Room joins
  JOIN_RESTAURANT: 'join:restaurant',
  JOIN_KDS: 'join:kds',
  JOIN_ORDER: 'join:order',
  JOIN_DRIVER: 'join:driver',

  // Order lifecycle
  ORDER_NEW: 'order:new',
  ORDER_STATUS_UPDATED: 'order:status_updated',
  ORDER_UPDATED: 'order:updated',

  // KDS
  KDS_BUMP: 'kds:bump',
  KDS_NEW_ORDER: 'kds:new_order',

  // Menu
  MENU_UPDATED: 'menu:updated',
};
