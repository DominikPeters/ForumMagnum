import { onStartup } from '../lib/executionEnvironment';

function addClickHandlerToCheckboxLabels() {
  /*
    HTML provides two ways to associate a label with its associated checkbox: 1) specify the checkbox's
    id in the label's `for` attribute, or 2) nest the checkbox inside the <label> element.
    Unfortunately, VulcanJS uses neither of these methods, so we lose some advantages from the browser
    understanding the association. When a label is associated with its checkbox:
    1. Clicking the label toggles the checkbox
    2. Screen readers describe the association better.
    Altering VulcanJS form code to make it associate the labels correctly seemed difficult, so we
    replicate the first advantage, labels as checkbox click targets, with JavaScript. This applies only
    to checkboxes in forms generated by VulcanJS from collection schemas. Other checkboxes, for which
    we write the code ourselves, should use one of the two HTML ways to associate with labels correctly.
  */
  document.body.addEventListener('click', (event) => {
    const target = <Element>event.target;
    if (target.tagName !== 'LABEL') return;
    if (!target.classList.contains('FormComponentCheckbox-inline')) return

    const checkbox = <HTMLInputElement>target.parentElement?.querySelector('input[type="checkbox"]');
    checkbox.click();
  })
}

onStartup(() => {
  addClickHandlerToCheckboxLabels();
});
