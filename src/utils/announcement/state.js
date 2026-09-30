export const announcementKey = (announcement) =>
  `${announcement.id}:${announcement.revision}`;

export const isAnnouncementRead = (readRevisions, announcement) =>
  Number(readRevisions?.[announcement.id]) >= announcement.revision;

export const withAnnouncementRead = (readRevisions, announcement) => ({
  ...(readRevisions || {}),
  [announcement.id]: Math.max(
    Number(readRevisions?.[announcement.id]) || 0,
    announcement.revision,
  ),
});

export const getActiveAnnouncements = (items) =>
  items.filter((announcement) => announcement.active);

export const getPrioritizedActiveAnnouncements = (items, readRevisions) => {
  const activeAnnouncements = getActiveAnnouncements(items);
  const pinnedUnreadAnnouncements = [];
  const pinnedReadAnnouncements = [];
  const unreadAnnouncements = [];
  const readAnnouncements = [];

  for (const announcement of activeAnnouncements) {
    const read = isAnnouncementRead(readRevisions, announcement);
    const target = announcement.pinned
      ? read
        ? pinnedReadAnnouncements
        : pinnedUnreadAnnouncements
      : read
        ? readAnnouncements
        : unreadAnnouncements;
    target.push(announcement);
  }

  return [
    ...pinnedUnreadAnnouncements,
    ...pinnedReadAnnouncements,
    ...unreadAnnouncements,
    ...readAnnouncements,
  ];
};

export const getUnreadAnnouncements = (items, readRevisions) =>
  getActiveAnnouncements(items).filter(
    (announcement) => !isAnnouncementRead(readRevisions, announcement),
  );

export const getUnpromptedAnnouncements = (items, promptedKeys) =>
  items.filter((announcement) => !promptedKeys.has(announcementKey(announcement)));
