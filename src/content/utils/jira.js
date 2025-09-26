import {waitForSelector} from "../../shared/dom";

const CLICKABLE_SELECTOR =
  "button, label, [role='menuitemcheckbox'], [role='checkbox'], [role='option']";

const ASSIGNEE_SCOPE_SELECTORS = [
  "[data-testid='filters.ui.filters.assignee']",
  "[data-testid='jira-issue-filters--assignee-dialog']",
  "[data-testid='filters.ui.interactive-list']",
  "[data-testid='issue-navigator.ui.filters.assignee']",
];

const SHOW_MORE_SELECTOR =
  '[data-testid="filters.ui.filters.assignee.stateless.show-more-button.assignee-filter-show-more"]';

const SELECTION_ATTRS = ["aria-checked", "aria-pressed", "aria-selected"];

const ASSIGNEE_ID_EXTRACTORS = [
  (node) => node?.id,
  (node) => node?.htmlFor,
  (node) => node?.getAttribute?.("for"),
  (node) => node?.dataset?.assigneeId,
];

function getClickableNode(node) {
  if (!node) return null;
  if (node.matches?.(CLICKABLE_SELECTOR)) return node;
  return node.closest?.(CLICKABLE_SELECTOR) ?? null;
}

function fireClick(element) {
  if (!element) return;
  if (typeof element.click === "function") {
    element.click();
    return;
  }
  element.dispatchEvent(new MouseEvent("click", {bubbles: true}));
}

function getSelectionState(element) {
  for (const attr of SELECTION_ATTRS) {
    const value = element.getAttribute?.(attr);
    if (value === "true") return true;
    if (value === "false") return false;
  }
  return null;
}

function normalizeAssigneeId(raw = "") {
  if (raw.startsWith("assignee-")) return raw.slice("assignee-".length);
  return raw;
}

function extractAssigneeId(node) {
  for (const getter of ASSIGNEE_ID_EXTRACTORS) {
    const value = getter(node);
    if (value) return normalizeAssigneeId(value);
  }
  return "";
}

function getAssigneeSelectors(jiraId) {
  return [
    `button[id="${jiraId}"][role="menuitemcheckbox"]`,
    `label[for="assignee-${jiraId}"]`,
    `[data-assignee-id="${jiraId}"]`,
  ];
}

function findShowMoreButton() {
  return document.querySelector(SHOW_MORE_SELECTOR);
}

function findAssigneeElement(jiraId) {
  const selectors = getAssigneeSelectors(jiraId);
  for (const selector of selectors) {
    const candidate = document.querySelector(selector);
    const clickable = getClickableNode(candidate);
    if (clickable) {
      return {clickable, selector};
    }
  }
  return {clickable: null, selector: selectors[0]};
}

function clearOtherAssignees(targetJiraId, targetElement) {
  const scopes = ASSIGNEE_SCOPE_SELECTORS.map((selector) =>
    document.querySelector(selector)
  ).filter(Boolean);

  if (scopes.length === 0) scopes.push(document);

  const visited = new Set();

  scopes.forEach((scope) => {
    scope
      .querySelectorAll(
        "[aria-checked='true'], [aria-pressed='true'], [aria-selected='true']"
      )
      .forEach((node) => visited.add(node));
  });

  visited.forEach((node) => {
    const clickable = getClickableNode(node);
    if (!clickable) return;

    if (targetElement && clickable.isSameNode?.(targetElement)) return;

    const clickableId = extractAssigneeId(clickable);
    if (clickableId && clickableId === targetJiraId) return;

    fireClick(clickable);
  });
}

function toggleAssignee(jiraId, shouldSelect) {
  if (!jiraId) return Promise.resolve(null);

  const applyToggle = (element) => {
    if (!element) return null;
    const state = getSelectionState(element);
    if (state !== null && state === shouldSelect) return element;
    fireClick(element);
    return element;
  };

  const {clickable, selector} = findAssigneeElement(jiraId);
  if (clickable) {
    return Promise.resolve(applyToggle(clickable));
  }

  const showMoreBtn = findShowMoreButton();
  if (showMoreBtn) fireClick(showMoreBtn);

  return waitForSelector(selector, {timeout: 2000})
    .then((node) => {
      const element = getClickableNode(node);
      return applyToggle(element);
    })
    .catch(() =>
      console.warn("Assignee non trovato nemmeno dopo retry:", jiraId)
    )
    .then((result) => result ?? null);
}

export async function changeJiraView(person, {previousPerson} = {}) {
  const targetId = person?.jiraId || null;
  const previousId = previousPerson?.jiraId || null;

  if (!targetId && !previousId) return;

  if (previousId && previousId !== targetId) {
    await toggleAssignee(previousId, false);
  }

  clearOtherAssignees(targetId);

  if (!targetId) return;

  const targetElement = await toggleAssignee(targetId, true);

  requestAnimationFrame(() => clearOtherAssignees(targetId, targetElement));
}
