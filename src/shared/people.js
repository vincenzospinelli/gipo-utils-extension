import {DEFAULT_PEOPLE, DEFAULT_PEOPLE_WHEEL} from "./constants";

export const sanitizePeopleList = (list = DEFAULT_PEOPLE) => {
  if (!Array.isArray(list)) return DEFAULT_PEOPLE;
  return list
    .filter((item) => item && item.name)
    .map((item) => ({
      name: item.name.trim(),
      jiraId: (item.jiraId || "").trim(),
    }));
};

export const sanitizePeopleWheelList = (list = DEFAULT_PEOPLE_WHEEL) => {
  if (!Array.isArray(list)) return DEFAULT_PEOPLE_WHEEL;
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
