import {waitForSelector} from "../../shared/dom";

export function changeJiraView(person) {
  if (!person?.jiraId) return;
  const {jiraId} = person;
  const labelSelector = `label[for="assignee-${jiraId}"]`;
  const popoverBtnSelector = `button[id="${jiraId}"][role="menuitemcheckbox"]`;

  document
    .querySelectorAll('[aria-checked="true"]')
    .forEach((el) => el.click());

  const showMoreBtn = document.querySelector(
    '[data-testid="filters.ui.filters.assignee.stateless.show-more-button.assignee-filter-show-more"]'
  );
  if (showMoreBtn) showMoreBtn.click();

  const candidate =
    document.querySelector(labelSelector) ||
    document.querySelector(popoverBtnSelector);

  if (candidate && candidate.offsetParent !== null) {
    candidate.dispatchEvent(new MouseEvent("click", {bubbles: true}));
    return;
  }

  waitForSelector(popoverBtnSelector, {timeout: 2000})
    .then((el) => el.dispatchEvent(new MouseEvent("click", {bubbles: true})))
    .catch(() => console.warn("Assignee non trovato nemmeno dopo retry:", jiraId));
}
