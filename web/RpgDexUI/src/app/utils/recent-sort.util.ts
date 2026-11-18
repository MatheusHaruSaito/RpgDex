export class RecentSortUtil {

  static getRecentTimestamp(item: any): number {
    const candidates = [item?.lastAccess, item?.lastAccessedAt, item?.updatedAt, item?.createdAt];
    let maxTime = 0;

    for (const raw of candidates) {
      if (!raw) continue;
      const date = new Date(raw);
      const time = date.getTime();
      if (!isNaN(time) && date.getFullYear() > 2000 && time > maxTime) {
        maxTime = time;
      }
    }

    return maxTime;
  }

  static sortByMostRecent<T>(items: T[]): T[] {
    return items
      .map((item, index) => ({
        item,
        index,
        time: this.getRecentTimestamp(item),
      }))
      .sort((a, b) => {
        if (b.time !== a.time) {
          return b.time - a.time;
        }
        return a.index - b.index;
      })
      .map((entry) => entry.item);
  }
}