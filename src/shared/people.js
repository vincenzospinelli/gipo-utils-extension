import {DEFAULT_PEOPLE} from "./constants";

export const sanitizePeopleList = (list = DEFAULT_PEOPLE) => {
  if (!Array.isArray(list)) return DEFAULT_PEOPLE;
  return list
    .filter((item) => item && item.name)
    .map((item) => ({
      name: item.name.trim(),
      jiraId: (item.jiraId || "").trim(),
    }));
};

export const ensureIndexInBounds = (index, list) => {
  if (!Array.isArray(list) || list.length === 0) return 0;
  return Math.min(index, list.length - 1);
};
